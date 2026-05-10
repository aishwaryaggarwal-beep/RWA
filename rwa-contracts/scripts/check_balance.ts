import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deployer Address:', deployer.address);
  const bal = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(bal), 'POL');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
