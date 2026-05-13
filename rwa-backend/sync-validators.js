import prisma from './src/prisma.js';

async function setupValidators() {
  const validators = [
    { email: "validator1@rwa.com", wallet: "0x29fab4bccB290ef936b4C49C0C97c8c7662D3A4F", name: "Forensic Auditor A" },
    { email: "validator2@rwa.com", wallet: "0xca37f13E839F2a7b4653Ca9D3736ed099b001C20", name: "Property Inspector B" }
  ];

  console.log("🛡️ Synchronizing Validator Network...");

  for (const v of validators) {
    await prisma.user.upsert({
      where: { email: v.email },
      update: { role: 'VALIDATOR', walletAddress: v.wallet },
      create: {
        email: v.email,
        name: v.name,
        password: "secure_placeholder", // They should use Privy to login
        role: 'VALIDATOR',
        walletAddress: v.wallet
      }
    });
    console.log(`✅ Validator Active: ${v.name} (${v.email})`);
  }

  process.exit(0);
}

setupValidators();
