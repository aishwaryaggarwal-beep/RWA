import bcrypt from 'bcrypt';
import prisma from './src/prisma.js';

async function main() {
  const email = "validator2@rwa.com"; // <-- CHANGE THIS to your validator's actual email
  const plainPassword = "val123";

  console.log(`⏳ Encrypting password for: ${email}`);

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: {
        password: hashedPassword,
        role: "VALIDATOR"
      }
    });

    console.log("✅ SUCCESS!");
    console.log("User Role set to: " + updatedUser.role);
    console.log("Password has been encrypted.");

  } catch (error) {
    console.error("❌ ERROR:", error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
