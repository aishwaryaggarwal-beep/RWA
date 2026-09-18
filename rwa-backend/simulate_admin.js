import prisma from './src/prisma.js';
import axios from 'axios';
import { decryptBuffer } from './src/utils/encryption.js';

async function simulateAdminRequest(userId) {
    const kyc = await prisma.kYC.findUnique({
      where: { userId: Number(userId) },
      include: { user: { select: { walletAddress: true } } }
    });

    if (!kyc) return console.log("KYC not found");

    const docRes = await axios.get(`https://gateway.pinata.cloud/ipfs/${kyc.documentCid}`, { responseType: "arraybuffer" });
    const decryptedDoc = decryptBuffer(Buffer.from(docRes.data), kyc.documentIv);
    
    const magic = decryptedDoc.slice(0, 8).toString("hex");
    let docMime = kyc.documentMimeType;

    if (magic.startsWith("25504446")) docMime = "application/pdf";
    else if (magic.startsWith("89504e470d0a1a0a")) docMime = "image/png";
    else if (magic.startsWith("ffd8ff")) docMime = "image/jpeg";
    
    console.log("Detected MIME:", docMime);
}

simulateAdminRequest(12).catch(console.error).finally(() => prisma.$disconnect());
