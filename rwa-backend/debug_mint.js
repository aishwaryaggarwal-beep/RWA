import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "src/utils/abi.json"), "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

console.log("=== MINT DEBUG ===");
console.log("Validator wallet address:", wallet.address);
console.log("LandToken contract:", process.env.LAND_TOKEN_ADDRESS);

// Check contract owner
const landToken = new ethers.Contract(process.env.LAND_TOKEN_ADDRESS, [
    ...abi.LandToken,
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "currentTokenId",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
], wallet);

try {
    const contractOwner = await landToken.owner();
    console.log("LandToken contract owner:", contractOwner);
    console.log("Wallet IS owner:", contractOwner.toLowerCase() === wallet.address.toLowerCase());
    
    const currentId = await landToken.currentTokenId();
    console.log("Current Token ID on chain:", currentId.toString());

    // Try a test balanceOf for tokenId 1
    try {
        const bal = await landToken.balanceOf("0xca37f13E839F2a7b4653Ca9D3736ed099b001C20", 1);
        console.log("Balance of seller for tokenId 1:", bal.toString());
    } catch (e) {
        console.log("balanceOf check failed:", e.message);
    }
} catch (e) {
    console.error("Debug failed:", e.message);
}
