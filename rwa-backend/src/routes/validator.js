import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "../utils/abi.json"), "utf8"));

const router = express.Router();

// ⛓️ Blockchain Helpers
const getVerifierContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.LAND_VERIFIER_ADDRESS, abi.LandVerifier, wallet);
};

const getLandTokenContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.LAND_TOKEN_ADDRESS, abi.LandToken, wallet);
};


// ✅ FETCH LANDS FOR VALIDATORS
router.get("/lands", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ensure the user is a dedicated VALIDATOR or ADMIN
    if (decoded.role !== "VALIDATOR" && decoded.role !== "ADMIN") return res.status(403).json({ message: "Access denied. Validators/Admins only." });

    const lands = await prisma.land.findMany({
      include: {
        owner: { select: { email: true, name: true, walletAddress: true } },
        votes: { select: { userId: true, vote: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(lands);
  } catch (err) {
    console.error("Land Fetch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ CAST VALIDATOR VOTE & CONSENSUS LOGIC
router.post("/land/:id/vote", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "VALIDATOR" && decoded.role !== "ADMIN") return res.status(403).json({ message: "Access denied. Validators/Admins only." });

    const landId = parseInt(req.params.id);
    const userId = parseInt(decoded.id);
    const { vote } = req.body; // "approve" or "reject"

    if (vote !== "approve" && vote !== "reject") {
      return res.status(400).json({ message: "Vote must be 'approve' or 'reject'." });
    }

    // 1. Record the vote
    await prisma.landVote.upsert({
      where: {
        landId_userId: { landId, userId }
      },
      update: { vote },
      create: { landId, userId, vote }
    });

    // 2. Consensus Engine: Majority Logic among VALIDATORS
    const totalValidators = await prisma.user.count({ 
      where: { 
        OR: [{ role: "VALIDATOR" }, { role: "ADMIN" }] 
      } 
    });
    const approveVotes = await prisma.landVote.count({ where: { landId, vote: "approve" } });
    const rejectVotes = await prisma.landVote.count({ where: { landId, vote: "reject" } });

    let newStatus = "PENDING";
    let isVerified = false;

    // Strict majority required > 50%
    if (approveVotes > totalValidators / 2) {
      newStatus = "VERIFIED";
      isVerified = true;
    } else if (rejectVotes > totalValidators / 2) {
      newStatus = "REJECTED";
      isVerified = false;
    }

    // 3. Apply state
    const land = await prisma.land.update({
      where: { id: landId },
      data: { status: newStatus, isVerified },
      include: { owner: true } // Need wallet address
    });

    // 🔗 4. Blockchain Execution
    let txHash = null;
    let mintTxHash = null;
    let onChainId = null;

    // Step A: Cast vote on-chain (separate try-catch so mint can proceed independently)
    try {
      const verifier = getVerifierContract();
      const isApprove = vote === "approve";

      console.log(`[Blockchain] Casting vote for Land #${landId} (Approve: ${isApprove})`);
      const tx = await verifier.voteOnLand(landId, isApprove);
      await tx.wait();
      txHash = tx.hash;
      console.log(`[Blockchain] Vote confirmed: ${txHash}`);
    } catch (voteErr) {
      console.error("[Blockchain] Vote on-chain failed (non-fatal):", voteErr.message);
      // Continue to mint even if vote fails — DB consensus is the source of truth
    }

    // Step B: Mint tokens if majority reached (independent of vote tx success)
    if (newStatus === "VERIFIED" && !land.onChainId) {
      try {
        console.log(`[Blockchain] Majority Approval Reached! Minting Land #${landId} tokens...`);
        const landToken = getLandTokenContract();

        const ownerWallet = land.owner.walletAddress;
        if (!ownerWallet) {
          throw new Error("Owner has no wallet address registered.");
        }
        const totalSupply = land.totalTokens || 1000;
        const metadataURI = land.deedCid || "ipfs://metadata-placeholder";

        console.log(`[Blockchain] Minting ${totalSupply} tokens to ${ownerWallet}...`);
        const mTx = await landToken.mintLand(ownerWallet, totalSupply, metadataURI);
        const receipt = await mTx.wait();
        mintTxHash = mTx.hash;
        console.log(`[Blockchain] Mint TX confirmed: ${mintTxHash}`);

        // Fetch the currentTokenId which was just used
        onChainId = Number(await landToken.currentTokenId());

        await prisma.land.update({
          where: { id: landId },
          data: { onChainId: onChainId }
        });
        console.log(`[Blockchain] Land #${landId} minted as Token ID #${onChainId}`);
      } catch (mintErr) {
        console.error("[Blockchain] MINT FAILED:", mintErr.message);
        // Mint failed — user can retry via /land/:id/mint endpoint
      }
    }

    res.json({
      message: `Vote recorded. ${newStatus === 'VERIFIED' ? 'Asset is now TOKENIZED on-chain!' : ''}`,
      currentStatus: newStatus,
      onChainId: onChainId || land.onChainId,
      txHash,
      mintTxHash,
      progress: {
        approvals: approveVotes,
        rejections: rejectVotes,
        required: Math.floor(totalValidators / 2) + 1
      }
    });
  } catch (err) {
    console.error("Vote Casting Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔄 MANUAL MINT RETRY — For verified lands that failed to mint
router.post("/land/:id/mint", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "VALIDATOR" && decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied." });
    }

    const landId = parseInt(req.params.id);
    const land = await prisma.land.findUnique({
      where: { id: landId },
      include: { owner: true }
    });

    if (!land) return res.status(404).json({ message: "Land not found." });
    if (!land.isVerified) return res.status(400).json({ message: "Land is not verified yet." });
    if (land.onChainId) return res.status(400).json({ message: `Already minted as Token #${land.onChainId}.` });

    const ownerWallet = land.owner.walletAddress;
    if (!ownerWallet) return res.status(400).json({ message: "Owner has no wallet address." });

    const landToken = getLandTokenContract();
    const totalSupply = land.totalTokens || 1000;
    const metadataURI = land.deedCid || "ipfs://metadata-placeholder";

    console.log(`[Mint Retry] Minting ${totalSupply} tokens for Land #${landId} to ${ownerWallet}...`);
    const mTx = await landToken.mintLand(ownerWallet, totalSupply, metadataURI);
    const receipt = await mTx.wait();

    const onChainId = Number(await landToken.currentTokenId());
    await prisma.land.update({
      where: { id: landId },
      data: { onChainId }
    });

    console.log(`[Mint Retry] SUCCESS: Land #${landId} => Token #${onChainId}, TX: ${mTx.hash}`);
    res.json({
      message: `Minted successfully! Token ID: ${onChainId}`,
      onChainId,
      txHash: mTx.hash
    });
  } catch (err) {
    console.error("[Mint Retry] FAILED:", err.message);
    res.status(500).json({ message: "Mint failed: " + err.message });
  }
});

// ✅ SECURE DOCUMENT PROXY (Auditors Only)
router.get("/land/:id/view/:type", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.query.token;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "VALIDATOR" && decoded.role !== "ADMIN") return res.status(403).json({ message: "Access denied." });

    const land = await prisma.land.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!land) return res.status(404).json({ message: "Asset not found" });

    const cid = req.params.type === "deed" ? land.deedCid : land.taxReportCid;
    if (!cid) return res.status(404).json({ message: "Evidence not found for this asset" });

    // 🕵️ Forensic Document Proxy: Fetch from IPFS and stream to browser
    // This bypasses CORS and keeps the validator session secure
    console.log(`[Proxy] Fetching Evidence CID: ${cid} for Auditor#${decoded.id}`);
    const fetchUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) throw new Error("Upstream IPFS gateway error");

      const contentType = response.headers.get("content-type") || "application/pdf";
      res.setHeader("Content-Type", contentType);
      // res.setHeader("Content-Disposition", `inline; filename="${req.params.type}_evidence.pdf"`);

      const buffer = Buffer.from(await response.arrayBuffer());
      res.send(buffer);
    } catch (fetchErr) {
      console.error("IPFS Proxy Failed:", fetchErr.message);
      res.status(502).json({ message: "IPFS Gateway is currently unreachable. Please try again later." });
    }
  } catch (err) {
    res.status(401).json({ message: "Unauthorized audit session" });
  }
});

export default router;
