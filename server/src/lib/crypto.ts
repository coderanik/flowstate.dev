import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Get the encryption secret from env, or generate one ephemerally.
 * If ephemeral, all keys are lost on server restart (which is fine for security).
 */
let encryptionKey: Buffer | null = null;

function getKey(): Buffer {
  if (encryptionKey) return encryptionKey;

  const envSecret = process.env.ENCRYPTION_SECRET;
  if (envSecret && envSecret.length >= 32) {
    // Use first 32 bytes of the env secret
    encryptionKey = Buffer.from(envSecret.slice(0, 32), "utf-8");
  } else {
    // Generate ephemeral key -- keys won't survive server restart
    encryptionKey = randomBytes(32);
    console.log("  ⚠ No ENCRYPTION_SECRET set -- using ephemeral key (keys lost on restart)");
  }

  return encryptionKey;
}

/**
 * Encrypt a plaintext string. Returns a hex-encoded string containing
 * iv + authTag + ciphertext. The original value cannot be recovered
 * without the server's encryption key.
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf-8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Pack: iv (hex) + authTag (hex) + ciphertext (hex)
  return iv.toString("hex") + authTag.toString("hex") + encrypted;
}

/**
 * Decrypt a value produced by encrypt(). Returns the original plaintext.
 */
export function decrypt(packed: string): string {
  const key = getKey();

  const ivHex = packed.slice(0, IV_LENGTH * 2);
  const tagHex = packed.slice(IV_LENGTH * 2, IV_LENGTH * 2 + TAG_LENGTH * 2);
  const ciphertext = packed.slice(IV_LENGTH * 2 + TAG_LENGTH * 2);

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(tagHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}
