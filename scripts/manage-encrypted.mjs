#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [, , command, inputPath, passphrase, ...extraArgs] = process.argv;

function showHelp() {
  console.log(`
Usage:
  Add encrypted note or binary archive to the Vault (/vault):
     node scripts/manage-encrypted.mjs vault <file.org|file.md|archive.tar.gz|text> <passphrase> [title]

Examples:
  node scripts/manage-encrypted.mjs vault ./my-secret.org "myMasterPassphrase" "Private Ledger"
  node scripts/manage-encrypted.mjs vault ./keys.tar.gz "myMasterPassphrase" "Private Keys Archive"
`);
}

if (!command || !inputPath || (command === "vault" && !passphrase)) {
  showHelp();
  process.exit(1);
}

const rootDir = process.cwd();

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  return mb.toFixed(1) + " MB";
}

function calculateSha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function encryptAesGcm(bufferOrString, secret) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(secret, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const inputBuffer =
    typeof bufferOrString === "string" ? Buffer.from(bufferOrString, "utf-8") : bufferOrString;
  const encrypted = Buffer.concat([
    cipher.update(inputBuffer),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    salt: salt.toString("base64"),
    rawEncrypted: encrypted,
  };
}

const binaryExtensions = [
  ".tar.gz",
  ".tgz",
  ".tar.xz",
  ".zip",
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".iso",
  ".bin",
  ".sqlite",
  ".gpg",
  ".7z",
  ".rar",
];

function isBinaryFile(filePath) {
  const lower = filePath.toLowerCase();
  return binaryExtensions.some((extension) => lower.endsWith(extension));
}

if (command === "vault") {
  const targetDir = path.join(rootDir, "src", "content", "vault");
  const downloadsDir = path.join(rootDir, "public", "downloads");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.mkdirSync(downloadsDir, { recursive: true });

  if (fs.existsSync(inputPath) && isBinaryFile(inputPath)) {
    const filename = path.basename(inputPath);
    const defaultTitle = filename.replace(/[-_.]/g, " ");
    const title =
      extraArgs.join(" ") || defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1);
    const slug = slugify(title) || "secret-file-" + Date.now();

    const fileBuffer = fs.readFileSync(inputPath);
    const sha256 = calculateSha256(fileBuffer);
    const filesize = formatBytes(fileBuffer.length);

    const encrypted = encryptAesGcm(fileBuffer, passphrase);
    const encFilename = `${filename}.enc`;
    fs.writeFileSync(path.join(downloadsDir, encFilename), encrypted.rawEncrypted);

    const data = {
      title,
      description: `Sealed binary archive (${filesize}).`,
      date: new Date().toISOString().split("T")[0],
      type: "file",
      filename,
      filesize,
      sha256,
      encryptedUrl: `/downloads/${encFilename}`,
      iv: encrypted.iv,
      salt: encrypted.salt,
    };

    fs.writeFileSync(path.join(targetDir, `${slug}.json`), JSON.stringify(data, null, 2) + "\n");
    console.log(`\nEncrypted binary file saved to Vault!`);
    console.log(`  File: ${filename} (${filesize})`);
    console.log(`  Encrypted blob: public/downloads/${encFilename}`);
    console.log(`  Vault descriptor: src/content/vault/${slug}.json`);
    console.log(`  Passphrase: "${passphrase}"`);
  } else {
    let content = "";
    let defaultTitle = "Private Document";
    let filename = "document.org";

    if (fs.existsSync(inputPath)) {
      content = fs.readFileSync(inputPath, "utf-8");
      filename = path.basename(inputPath);
      defaultTitle = path.basename(inputPath, path.extname(inputPath)).replace(/[-_]/g, " ");
      defaultTitle = defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1);
    } else {
      content = inputPath;
    }

    const title = extraArgs.join(" ") || defaultTitle;
    const slug = slugify(title) || "secret-doc-" + Date.now();

    const encrypted = encryptAesGcm(content, passphrase);

    const data = {
      title,
      description: `Sealed document.`,
      date: new Date().toISOString().split("T")[0],
      type: "note",
      filename,
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: encrypted.salt,
    };

    fs.writeFileSync(path.join(targetDir, `${slug}.json`), JSON.stringify(data, null, 2) + "\n");
    console.log(`\nEncrypted text document saved to Secret Vault!`);
    console.log(`  Title: "${title}"`);
    console.log(`  Vault descriptor: src/content/vault/${slug}.json`);
    console.log(`  Passphrase: "${passphrase}"`);
  }
} else {
  showHelp();
}
