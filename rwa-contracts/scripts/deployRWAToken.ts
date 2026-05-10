import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("----------------------------------------------------");
  console.log(`🚀 DEPLOYING RWA UNIFIED TOKEN`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Account: ${deployer.address}`);
  console.log("----------------------------------------------------");

  // 1. Get Contract Factory
  const RWAToken = await ethers.getContractFactory("RWAToken");

  // 2. Deploy Contract
  const rwa = await RWAToken.deploy();
  
  console.log("⏳ Waiting for deployment confirmation...");
  await rwa.waitForDeployment();

  const contractAddress = await rwa.getAddress();

  console.log("----------------------------------------------------");
  console.log(`✅ RWAToken DEPLOYED SUCCESSFULLY!`);
  console.log(`Contract Address: ${contractAddress}`);
  console.log(`Initial Supply: 10,000,000,000 RWA (Full supply to deployer)`);
  console.log("----------------------------------------------------");
  
  console.log(`💡 Note: To interact with this token in your frontend, save this address.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
