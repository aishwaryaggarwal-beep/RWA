import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "src/utils/abi.json"), "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

const verifier = new ethers.Contract(process.env.LAND_VERIFIER_ADDRESS, abi.LandVerifier, wallet);

async function main() {
    const results = [];
    
    // Check if our wallet is a registered validator on-chain
    const isVal = await verifier.isValidator(wallet.address);
    results.push("Wallet is validator on-chain: " + isVal);
    
    const totalVal = await verifier.totalValidators();
    results.push("Total on-chain validators: " + totalVal.toString());
    
    const owner = await verifier.owner();
    results.push("LandVerifier owner: " + owner);
    results.push("Wallet is LandVerifier owner: " + (owner.toLowerCase() === wallet.address.toLowerCase()));
    
    // Check if land #1 exists on-chain
    try {
        const landData = await verifier.lands(1);
        results.push("Land #1 on-chain title: " + landData.title);
        results.push("Land #1 isVerified: " + landData.isVerified);
        results.push("Land #1 approveCount: " + landData.approveCount.toString());
    } catch(e) {
        results.push("Land #1 fetch error: " + e.message.substring(0, 100));
    }
    
    // Check if vote was already cast
    try {
        const voted = await verifier.hasVoted(1, wallet.address);
        results.push("HasVoted(1, wallet): " + voted);
    } catch(e) {
        results.push("hasVoted check error: " + e.message.substring(0, 100));
    }

    fs.writeFileSync(path.join(__dirname, "debug_results2.txt"), results.join("\n"), "utf8");
    console.log("DONE");
}

main().catch(e => {
    fs.writeFileSync(path.join(__dirname, "debug_results2.txt"), "FATAL: " + e.message, "utf8");
    console.log("FAILED");
});
