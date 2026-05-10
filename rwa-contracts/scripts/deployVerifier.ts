import hre from "hardhat";

async function main() {
  const LandVerifier = await hre.ethers.getContractFactory("LandVerifier");

  const contract = await LandVerifier.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();

  console.log("DEPLOYMENT_SUCCESS_ADDRESS_START");
  console.log(address);
  console.log("DEPLOYMENT_SUCCESS_ADDRESS_END");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
