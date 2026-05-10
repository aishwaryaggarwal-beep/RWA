import { ethers } from "hardhat";

async function main() {
    const verifierAddress = "0xBA7A2F0167B6acE39a716a365632D690D1534659";
    const validatorAddress = "0x5b16f7638109a364a2a586E15a9b6F30aBbB15E4";

    const verifier = await ethers.getContractAt("LandVerifier", verifierAddress);
    
    console.log("Adding validator...");
    const tx = await verifier.addValidator(validatorAddress);
    await tx.wait();
    console.log(`Validator ${validatorAddress} added successfully! Tx: ${tx.hash}`);
}

main().catch(console.error);
