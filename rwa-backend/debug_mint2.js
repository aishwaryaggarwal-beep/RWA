import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "src/utils/abi.json"), "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);

const fullAbi = [
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
];

const landToken = new ethers.Contract(process.env.LAND_TOKEN_ADDRESS, fullAbi, wallet);

async function main() {
    const results = [];
    results.push("Validator wallet: " + wallet.address);
    results.push("LandToken addr: " + process.env.LAND_TOKEN_ADDRESS);
    
    const contractOwner = await landToken.owner();
    results.push("Contract owner: " + contractOwner);
    results.push("IS_OWNER: " + (contractOwner.toLowerCase() === wallet.address.toLowerCase()));
    
    const currentId = await landToken.currentTokenId();
    results.push("currentTokenId: " + currentId.toString());
    
    // Check balance for seller wallet for token IDs 1-5
    const sellerWallet = "0xca37f13E839F2a7b4653Ca9D3736ed099b001C20";
    for (let i = 0; i <= Number(currentId) + 1; i++) {
        try {
            const bal = await landToken.balanceOf(sellerWallet, i);
            results.push(`balanceOf(seller, ${i}) = ${bal.toString()}`);
        } catch(e) {
            results.push(`balanceOf(seller, ${i}) ERROR: ${e.message.substring(0, 80)}`);
        }
    }

    // Write results to file
    fs.writeFileSync(path.join(__dirname, "debug_results.txt"), results.join("\n"), "utf8");
    console.log("DONE - check debug_results.txt");
}

main().catch(e => {
    fs.writeFileSync(path.join(__dirname, "debug_results.txt"), "FATAL: " + e.message, "utf8");
    console.log("FAILED - check debug_results.txt");
});
