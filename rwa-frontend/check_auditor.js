const { ethers } = require('ethers');

// RPC for Polygon Amoy
const RPC_URL = "https://rpc-amoy.polygon.technology";
const provider = new ethers.JsonRpcProvider(RPC_URL);

const IdentityRegistryABI = [
  "function auditors(address) view returns (bool)",
  "function owner() view returns (address)"
];
const ADDRESS = "0xcdA9302787D5aa6Afa5e764eF1B5F8bBB9Ae26F7";

async function checkAuditor() {
  const adminWallet = "0x9e96472400e33FB547b49dC5f7118a9ae1BA4B76";
  const contract = new ethers.Contract(ADDRESS, IdentityRegistryABI, provider);

  console.log(`🔍 Checking IdentityRegistry at: ${ADDRESS}`);
  
  try {
    const isAuditor = await contract.auditors(adminWallet);
    const owner = await contract.owner();
    
    console.log(`👤 Your Wallet: ${adminWallet}`);
    console.log(`✅ Is Auditor? ${isAuditor ? "YES" : "NO ❌"}`);
    console.log(`👑 Contract Owner: ${owner}`);
    
    if (!isAuditor) {
      console.log("\n⚠️ ERROR: You are NOT registered as an Auditor on the blockchain.");
    }
  } catch (e) {
    console.error("❌ Error checking contract:", e.message);
  }
}

checkAuditor();
