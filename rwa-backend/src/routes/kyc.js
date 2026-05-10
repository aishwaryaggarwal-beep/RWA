import express from "express";
import jwt from "jsonwebtoken";
import { upload } from "../middleware/upload.js";
import kycService from "../services/kycService.js";
import prisma from "../prisma.js";

const router = express.Router();

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
