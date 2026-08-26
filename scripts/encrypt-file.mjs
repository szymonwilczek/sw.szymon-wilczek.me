#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = process.argv.slice(2);
if (args.length < 2) {
  console.log(`
Usage:
  node scripts/encrypt-file.mjs <input-file> <passphrase> [title] [category]

Example:
  node scripts/encrypt-file.mjs ./my-archive.tar.gz "my-secret-passphrase" "Confidential Audit" "Client"
`);
  process.exit(1);
}

const [inputPath, passphrase, titleInput, categoryInput] = args;

if (!fs.existsSync(inputPath)) {
  console.error(`Error: File "${inputPath}" does not exist.`);
  process.exit(1);
}

const rawData = fs.readFileSync(inputPath);
const filename = path.basename(inputPath);
const outName = `${filename}.enc`;
const outDir = path.join(process.cwd(), "public", "downloads");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, outName);

// derive 256-bit key with PBKDF2
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(passphrase, salt, 100000, 32, "sha256");

const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
const ciphertext = Buffer.concat([
  cipher.update(rawData),
  cipher.final(),
  cipher.getAuthTag(),
]);

fs.writeFileSync(outPath, ciphertext);

const sha256 = crypto.createHash("sha256").update(rawData).digest("hex");
const sizeKb = (rawData.length / 1024).toFixed(1);
const formattedSize =
  rawData.length > 1024 * 1024
    ? `${(rawData.length / (1024 * 1024)).toFixed(1)} MB`
    : `${sizeKb} KB`;

const jsonSlug = filename.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase();
const jsonPath = path.join(
  process.cwd(),
  "src",
  "content",
  "files",
  `${jsonSlug}.json`,
);

const metadata = {
  title: titleInput || `Confidential Archive (${filename})`,
  description: `Sealed archive.`,
  filename: filename,
  filesize: formattedSize,
  sha256: sha256,
  category: categoryInput || "Private",
  date: new Date().toISOString().split("T")[0],
  encrypted: true,
  encryptedUrl: `/downloads/${outName}`,
  salt: salt.toString("base64"),
  iv: iv.toString("base64"),
};

fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));

console.log(`
  Successfully Encrypted File:
  Input File:     ${inputPath}
  Encrypted File: ${outPath}
  SHA-256:        ${sha256}
  Filesize:       ${formattedSize}
  JSON Metadata:  ${jsonPath}
`);
