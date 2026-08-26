#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const [, , command, inputPath, passphrase, ...extraArgs] = process.argv;

function showHelp() {
  console.log(`
Usage:
  1. Add encrypted note/document to the Vault (/vault):
     node scripts/manage-encrypted.mjs vault <file.org|file.md|text> <passphrase> [title]

  2. Add downloadable file/archive to Files & Archives (/files):
     node scripts/manage-encrypted.mjs file <path/to/archive.tar.gz> [passphrase] [category]

Examples:
  node scripts/manage-encrypted.mjs vault ./my-secret.org "myMasterPassphrase" "Private Ledger"
  node scripts/manage-encrypted.mjs file ./backup.tar.gz "clientSecretKey" "Confidential Audit"
  node scripts/manage-encrypted.mjs file ./tool.tar.gz "" "Public Utilities"
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

function encryptAesGcm(bufferOrString, pass) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(pass, salt, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const inputBuf =
    typeof bufferOrString === "string"
      ? Buffer.from(bufferOrString, "utf-8")
      : bufferOrString;
  const encrypted = Buffer.concat([
    cipher.update(inputBuf),
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

if (command === "vault") {
  let content = "";
  let defaultTitle = "Private Document";

  if (fs.existsSync(inputPath)) {
    content = fs.readFileSync(inputPath, "utf-8");
    defaultTitle = path
      .basename(inputPath, path.extname(inputPath))
      .replace(/[-_]/g, " ");
    defaultTitle = defaultTitle.charAt(0).toUpperCase() + defaultTitle.slice(1);
  } else {
    content = inputPath;
  }

  const title = extraArgs.join(" ") || defaultTitle;
  const slug = slugify(title) || "secret-doc-" + Date.now();

  const enc = encryptAesGcm(content, passphrase);

  const targetDir = path.join(rootDir, "src", "content", "vault");
  fs.mkdirSync(targetDir, { recursive: true });

  const targetFile = path.join(targetDir, `${slug}.json`);
  const data = {
    title,
    date: new Date().toISOString().split("T")[0],
    ciphertext: enc.ciphertext,
    iv: enc.iv,
    salt: enc.salt,
  };

  fs.writeFileSync(targetFile, JSON.stringify(data, null, 2) + "\n");
  console.log(`\nEncrypted document saved to: src/content/vault/${slug}.json`);
  console.log(`  Title: "${title}"`);
  console.log(`  Passphrase: "${passphrase}"`);
} else if (command === "file") {
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: File not found at ${inputPath}`);
    process.exit(1);
  }

  const filename = path.basename(inputPath);
  const slug = slugify(filename.replace(/\./g, "-"));
  const fileBuf = fs.readFileSync(inputPath);
  const sha256 = calculateSha256(fileBuf);
  const filesize = formatBytes(fileBuf.length);
  const category = extraArgs.join(" ") || "General";

  const downloadsDir = path.join(rootDir, "public", "downloads");
  fs.mkdirSync(downloadsDir, { recursive: true });

  const filesContentDir = path.join(rootDir, "src", "content", "files");
  fs.mkdirSync(filesContentDir, { recursive: true });

  if (passphrase && passphrase.trim().length > 0) {
    const enc = encryptAesGcm(fileBuf, passphrase);
    const encFilename = `${filename}.enc`;
    fs.writeFileSync(path.join(downloadsDir, encFilename), enc.rawEncrypted);

    const docData = {
      title: filename.replace(/[-_]/g, " "),
      description: `Cryptographically sealed archive protected by AES-256-GCM encryption.`,
      filename,
      filesize,
      sha256,
      category,
      date: new Date().toISOString().split("T")[0],
      encrypted: true,
      encryptedUrl: `/downloads/${encFilename}`,
      salt: enc.salt,
      iv: enc.iv,
    };

    fs.writeFileSync(
      path.join(filesContentDir, `${slug}.json`),
      JSON.stringify(docData, null, 2) + "\n",
    );
    console.log(`\nEncrypted file archive saved!`);
    console.log(`  Encrypted binary: public/downloads/${encFilename}`);
    console.log(`  Metadata: src/content/files/${slug}.json`);
    console.log(`  Passphrase: "${passphrase}"`);
  } else {
    fs.copyFileSync(inputPath, path.join(downloadsDir, filename));

    const docData = {
      title: filename.replace(/[-_]/g, " "),
      description: `Public distribution package with verified SHA-256 checksum.`,
      filename,
      filesize,
      sha256,
      category,
      date: new Date().toISOString().split("T")[0],
      downloadUrl: `/downloads/${filename}`,
      encrypted: false,
    };

    fs.writeFileSync(
      path.join(filesContentDir, `${slug}.json`),
      JSON.stringify(docData, null, 2) + "\n",
    );
    console.log(`\nPublic file archive saved!`);
    console.log(`  Binary copy: public/downloads/${filename}`);
    console.log(`  Metadata: src/content/files/${slug}.json`);
  }
} else {
  showHelp();
}
