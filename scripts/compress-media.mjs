import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const GITHUB_RECOMMENDED_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const MAX_DIMENSION = 2560; // 2.5K QHD
const JPEG_QUALITY = 85;

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const unit = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${parseFloat((bytes / Math.pow(unit, i)).toFixed(2))} ${sizes[i]}`;
}

function getTrackedGitRepoSize() {
  try {
    const output = execSync("git ls-files", { encoding: "utf8" });
    const files = output.trim().split("\n").filter(Boolean);
    let total = 0;
    for (const file of files) {
      if (fs.existsSync(file)) {
        try {
          total += fs.statSync(file).size;
        } catch {}
      }
    }
    return total;
  } catch {
    return 0;
  }
}

function renderProgressBar(usedBytes, totalBytes, length = 36) {
  const percent = Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
  const filledLength = Math.round((length * percent) / 100);
  const emptyLength = length - filledLength;
  const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);
  return `[${bar}] ${formatBytes(usedBytes)} / ${formatBytes(totalBytes)} (${percent.toFixed(1)}%)`;
}

async function generateThumbnail(filePath, force = false) {
  const directory = path.dirname(filePath);
  const extension = path.extname(filePath);
  const base = path.basename(filePath, extension);
  const thumbsDir = path.join(directory, "thumbs");

  if (!fs.existsSync(thumbsDir)) {
    fs.mkdirSync(thumbsDir, { recursive: true });
  }

  const thumbPath = path.join(thumbsDir, `${base}.webp`);
  const coverPath = path.join(thumbsDir, `${base}-600.webp`);
  const origStat = fs.statSync(filePath);

  let streamThumbCreated = false;
  let coverThumbCreated = false;

  const buffer = fs.readFileSync(filePath);

  if (force || !fs.existsSync(thumbPath) || fs.statSync(thumbPath).mtimeMs < origStat.mtimeMs) {
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: 1200,
        height: 1200,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColorspace("srgb")
      .webp({
        quality: 80,
        effort: 4,
      })
      .toBuffer();
    fs.writeFileSync(thumbPath, thumbBuffer);
    streamThumbCreated = true;
  }

  if (force || !fs.existsSync(coverPath) || fs.statSync(coverPath).mtimeMs < origStat.mtimeMs) {
    const coverBuffer = await sharp(buffer)
      .rotate()
      .resize({
        width: 600,
        height: 600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColorspace("srgb")
      .webp({
        quality: 78,
        effort: 4,
      })
      .toBuffer();
    fs.writeFileSync(coverPath, coverBuffer);
    coverThumbCreated = true;
  }

  const thumbSize = fs.existsSync(thumbPath) ? fs.statSync(thumbPath).size : 0;
  const coverSize = fs.existsSync(coverPath) ? fs.statSync(coverPath).size : 0;

  return {
    skipped: !streamThumbCreated && !coverThumbCreated,
    size: thumbSize + coverSize,
  };
}

async function compressImageFile(filePath, force = false, thumbsOnly = false) {
  const stat = fs.statSync(filePath);
  const buffer = fs.readFileSync(filePath);
  const meta = await sharp(buffer).metadata();

  const isWide = (meta.width || 0) > MAX_DIMENSION || (meta.height || 0) > MAX_DIMENSION;
  const isHeavy = stat.size > 2.0 * 1024 * 1024; // > 2.0MB

  let compressed = false;
  let newMasterSize = stat.size;

  if (!thumbsOnly && (force || isWide || isHeavy || meta.format !== "jpeg")) {
    const optimizedBuffer = await sharp(buffer)
      .rotate() // auto-orient from EXIF
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toColorspace("srgb")
      .jpeg({
        quality: JPEG_QUALITY,
        mozjpeg: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimiseScans: true,
        quantisationTable: 3,
        chromaSubsampling: "4:2:0",
      })
      .withMetadata()
      .toBuffer();

    fs.writeFileSync(filePath, optimizedBuffer);
    compressed = true;
    newMasterSize = optimizedBuffer.length;
  }

  const thumbRes = await generateThumbnail(filePath, force);

  return {
    skipped: !compressed && thumbRes.skipped,
    oldSize: stat.size,
    newSize: newMasterSize,
    thumbSize: thumbRes.size,
    thumbCreated: !thumbRes.skipped,
    oldDims: `${meta.width}x${meta.height}`,
    newDims: thumbsOnly
      ? `${meta.width}x${meta.height}`
      : `${Math.min(meta.width || 0, MAX_DIMENSION)}x${Math.min(meta.height || 0, MAX_DIMENSION)}`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const thumbsOnly = args.includes("--thumbs-only");
  const targetArg = args.find((arg) => !arg.startsWith("--"));
  const imagesBaseDir = path.resolve("./public/images");

  let filesToProcess = [];
  const isExplicitTarget = Boolean(targetArg);

  if (targetArg) {
    const targetPath = path.resolve(targetArg);
    if (!fs.existsSync(targetPath)) {
      console.error(`Error: Target path does not exist: ${targetArg}`);
      process.exit(1);
    }
    const stat = fs.statSync(targetPath);
    if (stat.isDirectory()) {
      const walk = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const full = path.join(directory, entry.name);
          if (entry.isDirectory() && entry.name !== "thumbs" && !entry.name.startsWith("."))
            walk(full);
          else if (/\.(jpe?g|png)$/i.test(entry.name) && !entry.name.startsWith("."))
            filesToProcess.push(full);
        }
      };
      walk(targetPath);
    } else {
      filesToProcess.push(targetPath);
    }
  } else {
    if (fs.existsSync(imagesBaseDir)) {
      const walk = (directory) => {
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
          const full = path.join(directory, entry.name);
          if (entry.isDirectory() && entry.name !== "thumbs" && !entry.name.startsWith("."))
            walk(full);
          else if (/\.(jpe?g|png)$/i.test(entry.name) && !entry.name.startsWith("."))
            filesToProcess.push(full);
        }
      };
      walk(imagesBaseDir);
    }
  }

  console.log(`Target Max Resolution: ${MAX_DIMENSION}px\nMozJPEG Quality: ${JPEG_QUALITY}`);
  console.log(`Target: ${targetArg || "All gallery images"} (${filesToProcess.length} files)`);

  let totalOld = 0;
  let totalNew = 0;
  let processedCount = 0;
  let skippedCount = 0;

  for (const file of filesToProcess) {
    const relPath = path.relative(process.cwd(), file);
    try {
      const result = await compressImageFile(file, isExplicitTarget, thumbsOnly);
      totalOld += result.oldSize;
      totalNew += result.newSize;

      if (result.skipped) {
        skippedCount++;
        console.log(`  [OK] ${relPath} (${formatBytes(result.oldSize)} - already optimized)`);
      } else {
        processedCount++;
        const saved = result.oldSize - result.newSize;
        const percent = ((saved / result.oldSize) * 100).toFixed(1);
        console.log(
          `  [OPTIMIZED] ${relPath}: ${formatBytes(result.oldSize)} -> ${formatBytes(result.newSize)} (-${percent}%)`,
        );
      }
    } catch (error) {
      console.error(`  [ERROR] Failed to compress ${relPath}:`, error.message);
    }
  }

  const repoSize = getTrackedGitRepoSize();
  const remainingQuota = Math.max(0, GITHUB_RECOMMENDED_LIMIT_BYTES - repoSize);

  console.log("[END] COMPRESSION COMPLETE SUMMARY:");
  console.log(`Processed: ${processedCount} photos\nSkipped: ${skippedCount} photos`);
  if (totalOld > 0 && processedCount > 0) {
    const savedTotal = totalOld - totalNew;
    const savedPct = ((savedTotal / totalOld) * 100).toFixed(1);
    console.log(`Total Size Before:       ${formatBytes(totalOld)}`);
    console.log(`Total Size After:        ${formatBytes(totalNew)}`);
    console.log(`Total Space Saved:       ${formatBytes(savedTotal)} (-${savedPct}%)`);
  }
  console.log("---------------------------------------------------------------");
  console.log(`Tracked Repository Size: ${formatBytes(repoSize)}`);
  console.log(
    `GitHub 1GB Usage:        ${renderProgressBar(repoSize, GITHUB_RECOMMENDED_LIMIT_BYTES)}`,
  );
  console.log(`Remaining Capacity:      ${formatBytes(remainingQuota)}`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
