import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // ⚠️ IMPORTANT: Replace these with your deployed contract addresses
  const LAND_TOKEN_ADDRESS = "YOUR_LAND_TOKEN_ADDRESS"; // Deploy LandToken.sol first
  const RWA_TOKEN_ADDRESS = "YOUR_RWA_TOKEN_ADDRESS";   // Deploy RWAToken.sol first
  const VERIFIER_ADDRESS = "YOUR_VERIFIER_ADDRESS";     // Deploy LandVerifier.sol first

  if (LAND_TOKEN_ADDRESS.includes("YOUR") || RWA_TOKEN_ADDRESS.includes("YOUR") || VERIFIER_ADDRESS.includes("YOUR")) {
    console.warn("⚠️ ERROR: You MUST replace the addresses in this script with your real deployed contract addresses!");
    process.exit(1);
  }

  console.log("----------------------------------------------------");
  console.log(`🚀 DEPLOYING RWA MARKETPLACE`);
  console.log(`Deployer: ${deployer.address}`);
  console.log("----------------------------------------------------");

  // 1. Get Contract Factory
  const RWAMarketplace = await ethers.getContractFactory("RWAMarketplace");

  // 2. Deploy Contract
  const marketplace = await RWAMarketplace.deploy(LAND_TOKEN_ADDRESS, RWA_TOKEN_ADDRESS, VERIFIER_ADDRESS);
  
  console.log("⏳ Waiting for deployment...");
  await marketplace.waitForDeployment();

  const marketplaceAddress = await marketplace.getAddress();

  console.log("----------------------------------------------------");
  console.log(`✅ RWAMarketplace DEPLOYED SUCCESSFULLY!`);
  console.log(`Marketplace Address: ${marketplaceAddress}`);
  console.log("----------------------------------------------------");
  console.log("💡 The cycle is complete! Sellers can list verified land, and Buyers can purchase using RWA tokens.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
