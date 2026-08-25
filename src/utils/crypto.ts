import crypto from "node:crypto";

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string; // Base64
  salt: string; // Base64
}

/**
 * Encrypts a string using AES-256-GCM with PBKDF2 key derivation.
 * Compatible with Web Crypto SubtleCrypto in VaultUnlock.astro.
 */
export function encryptPayload(
  plaintext: string,
  passphrase: string,
): EncryptedPayload {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // derive 32-byte key using PBKDF2 (SHA-256, 100,000 iterations)
  const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(), // 16-byte GCM authentication tag appended
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
  };
}
