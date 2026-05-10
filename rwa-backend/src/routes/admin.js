import express from "express";
import jwt from "jsonwebtoken";
import prisma from "../prisma.js";
import axios from "axios";
import { decryptBuffer } from "../utils/encryption.js";

const router = express.Router();

router.get("/kyc/:userId", async (req, res) => {
  try {
    // 🔐 Verify admin
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { userId } = req.params;

    // 🧾 Fetch KYC and User Wallet
    const kyc = await prisma.kYC.findUnique({
      where: { userId: Number(userId) },
      include: { user: { select: { walletAddress: true } } }
    });

    if (!kyc) {
      return res.status(404).json({ message: "KYC not found" });
    }

    // 🌐 Fetch encrypted files from IPFS
    const docRes = await axios.get(
      `https://gateway.pinata.cloud/ipfs/${kyc.documentCid}`,
      { responseType: "arraybuffer" }
    );

    const selfieRes = await axios.get(
      `https://gateway.pinata.cloud/ipfs/${kyc.selfieCid}`,
      { responseType: "arraybuffer" }
    );

    // 🔐 Decrypt
    const decryptedDoc = decryptBuffer(
      Buffer.from(docRes.data),
      kyc.documentIv
    );

    const decryptedSelfie = decryptBuffer(
      Buffer.from(selfieRes.data),
      kyc.selfieIv
    );

    // 🔥 Convert to base64 (send to frontend)
    const docBase64 = decryptedDoc.toString("base64");
    const selfieBase64 = decryptedSelfie.toString("base64");

    res.json({
      firstName: kyc.firstName,
      lastName: kyc.lastName,
      address: kyc.address,
      walletAddress: kyc.user?.walletAddress,
      city: kyc.city,
      pincode: kyc.pincode,
      dob: kyc.dob,
      status: kyc.status,
      rejectionReason: kyc.rejectionReason,
      riskScore: kyc.riskScore,
      verificationResult: kyc.verificationResult,
      attempts: kyc.attempts,

      document: `data:${kyc.documentType};base64,${docBase64}`,
      selfie: `data:${kyc.selfieType};base64,${selfieBase64}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ APPROVE KYC
router.post("/kyc/:userId/approve", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { userId } = req.params;

    await prisma.kYC.update({
      where: { userId: Number(userId) },
      data: {
        status: "VERIFIED",
        reviewedAt: new Date(),
      },
    });

    res.json({ message: "KYC Approved ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ REJECT KYC
router.post("/kyc/:userId/reject", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    await prisma.kYC.update({
      where: { userId: Number(userId) },
      data: {
        status: "REJECTED",
        rejectionReason: reason || "Documents are not clear",
        reviewedAt: new Date(),
      },
    });

    res.json({ message: "KYC Rejected ❌" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/kyc", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "ADMIN") {
      return res.status(403).json({ message: "Access denied" });
    }

    const kycList = await prisma.kYC.findMany({
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        status: true,
        riskScore: true,
        createdAt: true,
        user: { select: { email: true } }
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(kycList);
  } catch (err) {
    console.error("KYC List Fetch Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;