import express from "express";
import jwt from "jsonwebtoken";
import { upload } from "../middleware/upload.js";
import kycService from "../services/kycService.js";
import prisma from "../prisma.js";
import { fetchFromIPFS } from "../utils/ipfs.js";
import { decryptBuffer } from "../utils/encryption.js";

const router = express.Router();

// ✅ FETCH & DECRYPT KYC DOCUMENT
router.get("/document/:type", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { type } = req.params; // front, back, selfie

    const kyc = await prisma.kYC.findUnique({
      where: { userId: decoded.id }
    });

    if (!kyc) return res.status(404).json({ message: "KYC records not found" });

    let cid, iv;
    if (type === "front") { cid = kyc.documentCid; iv = kyc.documentIv; }
    else if (type === "back") { cid = kyc.documentBackCid; iv = kyc.documentBackIv; }
    else if (type === "selfie") { cid = kyc.selfieCid; iv = kyc.selfieIv; }
    else return res.status(400).json({ message: "Invalid document type" });

    if (!cid) return res.status(404).json({ message: "Document not found" });

    // 1. Fetch encrypted blob from IPFS
    const encryptedBuffer = await fetchFromIPFS(cid);

    // 2. Decrypt it
    const decryptedBuffer = decryptBuffer(encryptedBuffer, iv);

    // 3. Serve with correct MIME type
    const magic = decryptedBuffer.slice(0, 8).toString("hex");
    let mimeType = type === "selfie" ? kyc.selfieMimeType : kyc.documentMimeType;

    if (magic.startsWith("25504446")) mimeType = "application/pdf";
    else if (magic.startsWith("89504e470d0a1a0a")) mimeType = "image/png";
    else if (magic.startsWith("ffd8ff")) mimeType = "image/jpeg";
    else if (!mimeType) mimeType = "image/jpeg";

    res.setHeader("Content-Type", mimeType);
    res.send(decryptedBuffer);

  } catch (err) {
    console.error("Document Decryption Error:", err);
    res.status(500).json({ message: "Failed to retrieve document securely" });
  }
});

router.post(
  "/",

  upload.fields([
    { name: "documentFront", maxCount: 1 },
    { name: "documentBack", maxCount: 1 },
    { name: "selfieFile", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // 🔐 Auth
      const token = req.headers.authorization?.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if the user has already submitted KYC
      const existingKyc = await prisma.kYC.findFirst({
        where: { userId: decoded.id },
      });

      // 🛡️ CHECK STATUS: BLOCK ONLY IF ALREADY FULLY VERIFIED
      if (existingKyc && (existingKyc.status === "VERIFIED" || existingKyc.status === "APPROVED")) {
        return res.status(400).json({
          message: "Account already verified. Identity verification cannot be re-submitted.",
          status: existingKyc.status
        });
      }

      // 🔄 FRESH START: Clear previous attempt to allow forensic restart
      let currentAttempts = existingKyc ? existingKyc.attempts + 1 : 1;
      if (existingKyc) {
        await prisma.kYC.delete({ where: { id: existingKyc.id } });
      }

      // Prepare files
      const files = {
        documentFront: req.files?.documentFront?.[0],
        documentBack: req.files?.documentBack?.[0],
        selfieFile: req.files?.selfieFile?.[0],
      };

      // 🧤 Submit with the updated attempt count
      const kycData = { ...req.body, attempts: currentAttempts };
      const kyc = await kycService.submitKYC(decoded.id, kycData, files);


      res.json({
        message: "KYC submitted securely ✅",
        id: kyc.id,
        status: kyc.status
      });
    } catch (err) {
      console.error(err);
      res.status(err.message.includes("Missing") ? 400 : 500).json({
        message: err.message || "Server error"
      });
    }
  }
);

// ✅ New: Check status endpoint
router.get("/status", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const kycInfo = await kycService.getKYCStatus(decoded.id);
    res.json(kycInfo);
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});

export default router;
