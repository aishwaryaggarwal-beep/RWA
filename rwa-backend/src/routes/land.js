import express from "express";
import prisma from "../prisma.js";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { upload } from "../middleware/upload.js";
import { uploadToIPFS } from "../utils/ipfs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "../utils/abi.json"), "utf8"));

const router = express.Router();
// Trigger nodemon restart


// ✅ SECURE IPFS UPLOADER for Documents (Deeds, Tax)
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No document provided for upload." });

    console.log(`[IPFS] Received document for vaulting: ${req.file.originalname}`);

    // Land documents are PUBLIC (but proxied) so we don't encrypt them here 
    // to keep them verifiable by any majority node. 
    // Note: For KYC, we DO encrypt.
    const cid = await uploadToIPFS(req.file.buffer, req.file.originalname);

    console.log(`[IPFS] Vaulting sequence complete. CID generated: ${cid}`);
    res.json({ cid });
  } catch (err) {
    console.error("IPFS Upload Error:", err);
    res.status(500).json({ message: "Decentralized storage anchor failed.", details: err.message });
  }
});


// ⛓️ Blockchain Helper
const getVerifierContract = () => {
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
  const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
  return new ethers.Contract(process.env.LAND_VERIFIER_ADDRESS, abi.LandVerifier, wallet);
};


router.get("/my", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = parseInt(decoded.id);

    if (isNaN(userId)) return res.status(401).json({ message: "Invalid user session" });

    const lands = await prisma.land.findMany({
      where: { ownerId: userId },
      include: {
        owner: {
          select: {
            name: true,
            walletAddress: true
          }
        }
      }
    });

    res.json(lands);
  } catch (err) {
    console.error("Error in /land/my:", err);
    res.status(401).json({ message: "Invalid session" });
  }
});

router.post("/create", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No authorization token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const {
      title,
      description,
      area,
      price,
      location,
      propertyType,
      annualRevenue,
      maintenanceCosts,
      deedCid,
      taxReportCid,
      tokenName,
      totalTokens,
      minPurchase,
      signature,
      walletAddress,
      messagePayload
    } = req.body;

    // 🧼 Robust Number Parsing (Removes commas, symbols, handled NaN)
    const cleanNum = (val, def = 0) => {
      if (val === undefined || val === null) return def;
      const cleaned = String(val).replace(/[^0-9.-]+/g, "");
      const num = parseFloat(cleaned);
      return isNaN(num) ? def : num;
    };

    if (!title || !location) {
      return res.status(400).json({ message: "Title and Location are required for property onboarding." });
    }

    if (!signature || !walletAddress || !messagePayload) {
      return res.status(400).json({ message: "A Web3 cryptographic signature is required to process listings." });
    }

    const userId = parseInt(decoded.id);
    if (isNaN(userId)) return res.status(401).json({ message: "Invalid user identity in token." });

    // Ensure the wallet they signed with matches their registered user wallet
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ message: "Wallet mismatch. Please sign using your registered RWA account wallet." });
    }

    // Recover the cryptographic signature
    try {
      const recoveredAddress = ethers.verifyMessage(messagePayload, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({ message: "Signature validation failed. Signer address does not match payload wallet." });
      }
    } catch (sigErr) {
      return res.status(400).json({ message: "Signature decoding failed.", details: sigErr.message });
    }

    const tokensToMint = parseInt(cleanNum(totalTokens, 1000));

    const landData = {
      title,
      description: description || "No description provided.",
      location,
      area: cleanNum(area),
      price: cleanNum(price),
      propertyType: propertyType || "Agricultural",
      annualRevenue: cleanNum(annualRevenue),
      maintenanceCosts: cleanNum(maintenanceCosts),
      deedCid: deedCid || null,
      taxReportCid: taxReportCid || null,
      tokenSymbol: tokenName || "RWA-ASSET",
      totalTokens: tokensToMint,
      availableTokens: tokensToMint,
      minPurchase: parseInt(cleanNum(minPurchase, 10)),
      owner: {
        connect: { id: userId }
      }
    };

    console.log(`[RWA] Onboarding Attempt: ${title} by User#${userId}`);

    const land = await prisma.land.create({
      data: landData,
    });

    console.log(`[RWA] New Property Onboarded: ${title} by User#${decoded.id}`);

    // 🔗 ⛓️ Blockchain On-Chain Registration
    let txHash = null;
    try {
      const contract = getVerifierContract();
      console.log(`[Blockchain] Registering Land #${land.id} on Ledger...`);

      // CID for metadata (using title as placeholder if cid missing)
      const metadataCid = deedCid || "QmDefaultPlaceholder";

      const tx = await contract.registerLand(
        land.id,
        land.title,
        walletAddress,
        metadataCid
      );
      await tx.wait();
      txHash = tx.hash;
      console.log(`[Blockchain] Land #${land.id} successfully anchored on-chain: ${txHash}`);
    } catch (bcError) {
      console.error("Blockchain Registration FAILED:", bcError.message);
      // We log it but proceed so user doesn't see a "system failure" for a slow RPC
    }

    res.json({
      message: "Property submitted for verification ✅",
      land,
      onChainTx: txHash
    });
  } catch (err) {
    console.error("Critical Error in /land/create:", err);

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Session expired. Please re-login." });
    }

    res.status(500).json({
      message: "Onboarding system failed. Internal Server Error.",
      details: err.message
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const lands = await prisma.land.findMany({
      where: { status: "LISTED" },
      include: {
        owner: {
          select: {
            name: true,
            kyc: true
          }
        }
      }
    });

    res.json(lands);
    console.log(lands);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching lands", details: err.message });
  }
});

// ✅ GET SINGLE PROPERTY DETAILS
router.get("/:id", async (req, res) => {
  try {
    const landId = parseInt(req.params.id);
    if (isNaN(landId)) return res.status(400).json({ message: "Invalid property ID" });

    const land = await prisma.land.findUnique({
      where: { id: landId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            walletAddress: true,
            kyc: true
          }
        }
      }
    });

    if (!land) return res.status(404).json({ message: "Property not found" });

    res.json(land);
  } catch (err) {
    console.error("Error fetching property details:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ MARK AS LISTED ON MARKETPLACE
router.post("/:id/list", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const landId = parseInt(req.params.id);

    const land = await prisma.land.findUnique({
      where: { id: landId },
    });

    if (!land) return res.status(404).json({ message: "Land not found" });
    if (land.ownerId !== decoded.id) return res.status(403).json({ message: "Not your property" });

    const updatedLand = await prisma.land.update({
      where: { id: landId },
      data: { status: "LISTED" },
    });

    res.json({ message: "Land marked as listed", land: updatedLand });
  } catch (err) {
    console.error("Error marking listed:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ SYNC ON-CHAIN HOLDINGS WITH DB
router.post("/:id/sync", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = parseInt(decoded.id);
    const landId = parseInt(req.params.id);

    const land = await prisma.land.findUnique({ where: { id: landId } });
    if (!land || land.onChainId === null) {
      return res.status(404).json({ message: "Land not found or not minted" });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.walletAddress) {
      return res.status(400).json({ message: "User wallet not found" });
    }

    // Fetch balance from blockchain
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const landContract = new ethers.Contract(process.env.LAND_TOKEN_ADDRESS, abi.LandToken, provider);
    
    const balance = await landContract.balanceOf(user.walletAddress, land.onChainId);
    const tokenCount = Number(balance);

    // Update or Create Investment record
    const investment = await prisma.investment.upsert({
      where: {
        id: (await prisma.investment.findFirst({ where: { userId, landId } }))?.id || -1
      },
      update: { tokens: tokenCount },
      create: {
        userId,
        landId,
        tokens: tokenCount
      }
    });

    // Recalculate available tokens (Total - sum of all investments)
    const allInvestments = await prisma.investment.findMany({ where: { landId } });
    const totalInvested = allInvestments.reduce((sum, inv) => sum + inv.tokens, 0);
    
    await prisma.land.update({
      where: { id: landId },
      data: { availableTokens: land.totalTokens - totalInvested }
    });

    res.json({ message: "Holdings synchronized", investment, available: land.totalTokens - totalInvested });
  } catch (err) {
    console.error("Sync Error:", err);
    res.status(500).json({ message: "Sync failed", details: err.message });
  }
});

// ✅ GET HOLDERS AND PERCENTAGES
router.get("/:id/holders", async (req, res) => {
  try {
    const landId = parseInt(req.params.id);
    const land = await prisma.land.findUnique({
      where: { id: landId },
      include: {
        investments: {
          include: {
            user: {
              select: {
                name: true,
                walletAddress: true,
                role: true
              }
            }
          }
        },
        owner: {
           select: {
             name: true,
             walletAddress: true
           }
        }
      }
    });

    if (!land) return res.status(404).json({ message: "Land not found" });

    // Build ownership list
    // Note: The original owner might still hold some tokens not in 'Investment' table 
    // but in this model, all purchases go to Investment.
    // If availableTokens > 0, the remaining is held by the original owner (or the contract)
    
    const holders = land.investments.map(inv => ({
      name: inv.user.name,
      address: inv.user.walletAddress,
      tokens: inv.tokens,
      percentage: ((inv.tokens / land.totalTokens) * 100).toFixed(2),
      role: inv.user.role
    }));

    // Add original owner's remaining stake if any
    const totalInvested = land.investments.reduce((sum, inv) => sum + inv.tokens, 0);
    const remaining = land.totalTokens - totalInvested;
    
    if (remaining > 0) {
      holders.push({
        name: land.owner.name + " (Issuer)",
        address: land.owner.walletAddress,
        tokens: remaining,
        percentage: ((remaining / land.totalTokens) * 100).toFixed(2),
        role: "SELLER"
      });
    }

    res.json({
      landId: land.id,
      totalTokens: land.totalTokens,
      holders: holders.sort((a, b) => b.tokens - a.tokens)
    });
  } catch (err) {
    console.error("Holders Fetch Error:", err);
    res.status(500).json({ message: "Error fetching holders" });
  }
});

export default router;