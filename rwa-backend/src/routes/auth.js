import express from "express";
import bcrypt from "bcrypt";
import prisma from "../prisma.js";
import jwt from "jsonwebtoken";
import { ethers } from "ethers";

const router = express.Router();

/* LOGIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { kyc: true }, // Include kyc info
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kyc?.status || "NOT_SUBMITTED",
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* GET ME */
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { kyc: true },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    console.log(`[Auth/Me] Fetching user ID ${user.id}, Wallet: ${user.walletAddress || 'N/A'}`);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kyc?.status || "NOT_SUBMITTED",
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
});
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,

        // ✅ Ensure correct enum format
        role: role.toUpperCase(),

      },
    });

    res.json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
       
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ message: "Email already exists" });
    }

    res.status(400).json({ error: err.message });
  }
});


router.post("/connect-wallet", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { walletAddress, signature, message } = req.body;

    // 🔐 Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({ message: "Invalid signature" });
    }

    // ✅ Save wallet
    console.log(`[Auth] Linking wallet ${walletAddress} to user ID ${decoded.id}`);
    const updatedUser = await prisma.user.update({
      where: { id: decoded.id },
      data: {
        walletAddress,
      },
    });

    res.json({ 
      message: "Wallet verified & connected ✅",
      user: updatedUser 
    });


  } catch (err) {
    console.error(err);
    res.status(401).json({ message: "Unauthorized" });
  }
});

router.post("/privy-sync", async (req, res) => {

  try {
    const { email, name, walletAddress } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (walletAddress) {
      const walletConflict = await prisma.user.findUnique({
        where: { walletAddress },
      });
      if (walletConflict && walletConflict.email !== email) {
        return res.status(409).json({ 
          message: "This wallet is already linked to a different email account." 
        });
      }
    }

    let user = await prisma.user.findUnique({
      where: { email },
      include: { kyc: true },
    });

    if (user) {
      // 🛡️ Logic for existing user:
      // If the user's current wallet is DIFFERENT from the Privy wallet
      if (user.walletAddress !== walletAddress && walletAddress) {
        // Check if this NEW wallet is already taken by someone else
        const walletInUse = await prisma.user.findUnique({
          where: { walletAddress },
        });

        if (walletInUse && walletInUse.id !== user.id) {
          return res.status(409).json({ 
            message: "This wallet is already linked to a different email account." 
          });
        }

        // It's safe to update the wallet for this email
        console.log(`[PrivySync] Updating wallet for ${email} to ${walletAddress}`);
        user = await prisma.user.update({
          where: { id: user.id },
          data: { walletAddress },
          include: { kyc: true },
        });
      }
    } else {
      // Create new user for social login
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          password: await bcrypt.hash(Math.random().toString(36), 10), // Dummy password
          role: "BUYER",
          walletAddress,
        },
        include: { kyc: true },
      });
    }


    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        kycStatus: user.kyc?.status || "NOT_SUBMITTED",
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error("[PrivySync] FATAL ERROR:", err);
    if (err.code === "P2002") {
      return res.status(409).json({ 
        message: "Wallet or Email already registered to another account",
        details: err.meta?.target 
      });
    }
    res.status(500).json({ 
      message: "Internal server error during sync",
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});



export default router;