import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const tokenAddress = "PUT_YOUR_DEPLOYED_RWA_TOKEN_ADDRESS_HERE"; // The address you see in MetaMask

  if (tokenAddress === "PUT_YOUR_DEPLOYED_RWA_TOKEN_ADDRESS_HERE") {
    console.warn("⚠️ ERROR: You MUST replace 'tokenAddress' in this script with your real RWAToken address!");
    process.exit(1);
  }

  console.log("----------------------------------------------------");
  console.log(`🚀 DEPLOYING RWA SWAP CONTRACT`);
  console.log(`Token Address: ${tokenAddress}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("----------------------------------------------------");

  // 1. Get Contract Factory
  const RWASwap = await ethers.getContractFactory("RWASwap");

  // 2. Deploy Contract
  const swap = await RWASwap.deploy(tokenAddress);
  
  console.log("⏳ Waiting for deployment...");
  await swap.waitForDeployment();

  const swapAddress = await swap.getAddress();

  console.log("----------------------------------------------------");
  console.log(`✅ RWASwap DEPLOYED SUCCESSFULLY!`);
  console.log(`Swap Address: ${swapAddress}`);
  console.log("----------------------------------------------------");
  
  console.log(`💡 IMPORTANT NEXT STEPS:`);
  console.log(`1. Transfer some RWA tokens from your wallet to this SWAP address.`);
  console.log(`2. Now users can send POL to this address (or use the contract) to get RWA!`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
