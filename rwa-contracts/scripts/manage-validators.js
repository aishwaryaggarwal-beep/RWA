const hre = require("hardhat");

async function main() {
  const CONTRACT_ADDRESS = "0xBA7A2F0167B6acE39a716a365632D690D1534659";
  const NEW_VALIDATORS = [
    "0x29fab4bccB290ef936b4C49C0C97c8c7662D3A4F", // Validator 1
    "0xca37f13E839F2a7b4653Ca9D3736ed099b001C20"  // Validator 2
  ];

  console.log("Connecting to LandVerifier at:", CONTRACT_ADDRESS);
  const verifier = await hre.ethers.getContractAt("LandVerifier", CONTRACT_ADDRESS);

  for (const address of NEW_VALIDATORS) {
    console.log(`\n⏳ Authorizing: ${address}`);
    try {
      const tx = await verifier.addValidator(address);
      console.log("Transaction Hash:", tx.hash);
      await tx.wait();
      console.log(`✅ Success! ${address} is now a validator.`);
    } catch (e) {
      console.log(`⚠️ Skip: ${address} (Likely already added)`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
