import prisma from './src/prisma.js';
import axios from 'axios';
import { decryptBuffer } from './src/utils/encryption.js';

async function main() {
  const kyc = await prisma.kYC.findFirst({
    where: { firstName: { contains: 'aish', mode: 'insensitive' } }
  });
  
  if (!kyc) {
    console.log("No KYC found");
    return;
  }

  console.log("CID:", kyc.documentCid);
  console.log("IV:", kyc.documentIv);

  try {
    const res = await axios.get(`https://gateway.pinata.cloud/ipfs/${kyc.documentCid}`, { responseType: 'arraybuffer' });
    console.log("Encrypted size:", res.data.byteLength);
    
    const decrypted = decryptBuffer(Buffer.from(res.data), kyc.documentIv);
    console.log("Decrypted size:", decrypted.length);
    console.log("Decrypted start (hex):", decrypted.slice(0, 16).toString('hex'));
    console.log("Decrypted start (utf8):", decrypted.slice(0, 16).toString('utf8'));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
