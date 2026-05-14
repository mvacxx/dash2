import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";
const ivLength = 12;

function getEncryptionKey() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error("TOKEN_ENCRYPTION_KEY is required to encrypt tokens.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encryptToken(token: string) {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptToken(encryptedToken: string) {
  const [iv, authTag, encrypted] = encryptedToken.split(":");

  if (!iv || !authTag || !encrypted) {
    throw new Error("Invalid encrypted token payload.");
  }

  const decipher = createDecipheriv(algorithm, getEncryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
