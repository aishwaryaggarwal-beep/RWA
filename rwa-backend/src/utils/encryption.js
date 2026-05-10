import crypto from "crypto";

const algorithm = "aes-256-cbc";

// ⚠️ store this securely in env
const key = crypto
  .createHash("sha256")
  .update(process.env.ENCRYPTION_KEY)
  .digest();

export function encryptBuffer(buffer) {
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(buffer),
    cipher.final(),
  ]);

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
  };
}

export function decryptBuffer(encryptedData, ivHex) {
  const iv = Buffer.from(ivHex, "hex");

  const decipher = crypto.createDecipheriv(algorithm, key, iv);

  return Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
}