import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("----------------------------------------------------");
  console.log("🚀 STARTING FULL RWA ECOSYSTEM DEPLOYMENT");
  console.log(`Deployer: ${deployer.address}`);
  console.log("----------------------------------------------------");

  // 1. Deploy LandToken (ERC1155)
  console.log("⏳ Deploying LandToken...");
  const LandToken = await ethers.getContractFactory("LandToken");
  const landToken = await LandToken.deploy();
  await landToken.waitForDeployment();
  const landTokenAddress = await landToken.getAddress();
  console.log(`✅ LandToken deployed at: ${landTokenAddress}`);

  // 2. Deploy RWAToken (ERC20)
  console.log("⏳ Deploying RWAToken...");
  const RWAToken = await ethers.getContractFactory("RWAToken");
  const rwaToken = await RWAToken.deploy();
  await rwaToken.waitForDeployment();
  const rwaTokenAddress = await rwaToken.getAddress();
  console.log(`✅ RWAToken deployed at: ${rwaTokenAddress}`);

  // 3. Deploy LandVerifier (Oracle/Validator)
  console.log("⏳ Deploying LandVerifier...");
  const LandVerifier = await ethers.getContractFactory("LandVerifier");
  const landVerifier = await LandVerifier.deploy();
  await landVerifier.waitForDeployment();
  const verifierAddress = await landVerifier.getAddress();
  console.log(`✅ LandVerifier deployed at: ${verifierAddress}`);

  // 4. Deploy RWAMarketplace (Main Marketplace)
  console.log("⏳ Deploying RWAMarketplace...");
  const RWAMarketplace = await ethers.deployContract("RWAMarketplace", [landTokenAddress, rwaTokenAddress, verifierAddress]);
  await RWAMarketplace.waitForDeployment();
  const marketplaceAddress = await RWAMarketplace.getAddress();
  console.log("✅ RWAMarketplace deployed at:", marketplaceAddress);

  console.log("│ Deploying RWASwap...");
  const RWASwap = await ethers.deployContract("RWASwap", [rwaTokenAddress]);
  await RWASwap.waitForDeployment();
  const swapAddress = await RWASwap.getAddress();
  console.log("✅ RWASwap deployed at:", swapAddress);

  // 💰 FUNDING SWAP CONTRACT FOR LIQUIDITY
  console.log("💰 Funding RWASwap with Liquidity...");
  const rwaTokenContract = await ethers.getContractAt("RWAToken", rwaTokenAddress);
  // Fund with 1 Million RWA tokens
  const liquidityRWA = ethers.parseUnits("1000000", 18);
  await rwaTokenContract.transfer(swapAddress, liquidityRWA);
  
  // Fund with 1 POL (using signer balance)
  const [signer] = await ethers.getSigners();
  await signer.sendTransaction({
      to: swapAddress,
      value: ethers.parseEther("1.0")
  });
  console.log("✅ RWASwap funded with 1M RWA and 1.0 POL");

  console.log("----------------------------------------------------");
  console.log("🎯 DEPLOYMENT SUMMARY");
  console.log("LandToken:     ", landTokenAddress);
  console.log("RWAToken:      ", rwaTokenAddress);
  console.log("LandVerifier:  ", verifierAddress);
  console.log("RWAMarketplace:", marketplaceAddress);
  console.log("RWASwap:       ", swapAddress);
  console.log("----------------------------------------------------");
  console.log("Next Step: Update src/lib/contracts/abi.ts in the frontend with these addresses.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
