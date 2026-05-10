import express from "express";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Note: Assuming abi.json has RWAToken ABI. If not, we'll need to add it.
let abi;
try {
  abi = JSON.parse(fs.readFileSync(path.join(__dirname, "../utils/abi.json"), "utf8"));
} catch (e) {
  abi = { RWAToken: [] }; // Placeholder
}

const router = express.Router();

router.post("/faucet", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userWallet = req.body.walletAddress;

        if (!userWallet || !ethers.isAddress(userWallet)) {
            return res.status(400).json({ message: "Valid wallet address required" });
        }

        const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
        const deployerWallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider); // Using same key as validator for simplicity if it's the deployer
        
        // We use the address from our deployment
        const RWA_TOKEN_ADDRESS = "0x3911ab968C7A17001263337B61eB5F6E354AEFed";
        
        const rwaToken = new ethers.Contract(RWA_TOKEN_ADDRESS, abi.RWAToken, deployerWallet);

        console.log(`[Faucet] Sending 10,000 RWA to ${userWallet}`);
        const amount = ethers.parseUnits("10000", 18);
        
        const tx = await rwaToken.transfer(userWallet, amount);
        await tx.wait();

        res.json({ message: "10,000 RWA tokens sent to your wallet!", txHash: tx.hash });
    } catch (err) {
        console.error("Faucet Error:", err);
        res.status(500).json({ message: "Faucet failed: " + err.message });
    }
});

export default router;
