import prisma from './src/prisma.js';
import axios from 'axios';
import { decryptBuffer } from './src/utils/encryption.js';

async function main() {
  const kyc = await prisma.kYC.findUnique({
    where: { userId: 5 }
  });
  
  if (!kyc) return;

  try {
    const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${kyc.documentCid}`, { responseType: 'arraybuffer' });
    const decrypted = decryptBuffer(Buffer.from(res.data), kyc.documentIv);
    console.log("Mahesh Decrypted start (utf8):", decrypted.slice(0, 5).toString('utf8'));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
