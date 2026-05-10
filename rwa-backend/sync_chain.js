import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./src/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "src/utils/abi.json"), "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
const verifier = new ethers.Contract(process.env.LAND_VERIFIER_ADDRESS, abi.LandVerifier, wallet);

async function fixLandOnChain(land) {
    console.log(`\n--- Fixing Land #${land.id} ---`);
    console.log(`Title: ${land.title}`);
    console.log(`Owner: ${land.owner.walletAddress}`);
    try {
        const landData = await verifier.lands(land.id);
        if (!landData.title || landData.title === "") {
            console.log(`Land #${land.id} not registered on-chain. Registering now...`);
            const metadataCid = land.deedCid || "QmDefaultPlaceholder"; 
            const tx = await verifier.registerLand(
                land.id, 
                land.title, 
                land.owner.walletAddress,
                metadataCid
            );
            await tx.wait();
            console.log(`Successfully registered Land #${land.id} on-chain.`);
        } else {
            console.log(`Land #${land.id} is already registered on-chain. Title: ${landData.title}`);
        }
    } catch (e) {
        console.log(`Failed to register Land #${land.id}: ${e.message}`);
    }

    try {
        const landData = await verifier.lands(land.id);
        if (!landData.isVerified) {
            console.log(`Land #${land.id} is not verified on-chain. Voting 'approve'...`);
            const tx = await verifier.voteOnLand(land.id, true);
            await tx.wait();
            console.log(`Successfully voted 'approve' for Land #${land.id}.`);
        } else {
            console.log(`Land #${land.id} is already verified on-chain.`);
        }
    } catch (e) {
         console.log(`Failed to vote on Land #${land.id}: ${e.message}`);
    }
}

async function main() {
    const verifiedLands = await prisma.land.findMany({
        where: { isVerified: true },
        include: { owner: true }
    });

    console.log(`Found ${verifiedLands.length} verified lands in database.`);
    for (let land of verifiedLands) {
        await fixLandOnChain(land);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
