import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy IdentityRegistry
  console.log("Deploying IdentityRegistry...");
  const IdentityRegistry = await ethers.getContractFactory("IdentityRegistry");
  const identityRegistry = await IdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log("IdentityRegistry deployed to:", identityAddress);

  // 2. Deploy RWAGovernance
  // We use the existing LandToken address from your previous deployment
  const LAND_TOKEN_ADDRESS = "0x0c673Bb31354933a102a3212C554C1EFb9C83779";
  
  console.log("Deploying RWAGovernance with LandToken:", LAND_TOKEN_ADDRESS);
  const RWAGovernance = await ethers.getContractFactory("RWAGovernance");
  const rwaGovernance = await RWAGovernance.deploy(LAND_TOKEN_ADDRESS);
  await rwaGovernance.waitForDeployment();
  const governanceAddress = await rwaGovernance.getAddress();
  console.log("RWAGovernance deployed to:", governanceAddress);

  console.log("\n--- DEPLOYMENT SUMMARY ---");
  console.log("IdentityRegistry:", identityAddress);
  console.log("RWAGovernance:", governanceAddress);
  console.log("---------------------------\n");
  
  console.log("To verify on PolygonScan (optional):");
  console.log(`npx hardhat verify --network amoy ${identityAddress}`);
  console.log(`npx hardhat verify --network amoy ${governanceAddress} ${LAND_TOKEN_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
