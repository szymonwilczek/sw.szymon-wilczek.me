import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import sharp from "sharp";

const GITHUB_RECOMMENDED_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB
const MAX_RECOMMENDED_DIMENSION = 2560; // 2.5K QHD
const MAX_RECOMMENDED_SIZE_BYTES = 2.0 * 1024 * 1024; // 2.0 MB

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
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

async function main() {
  const imagesBaseDir = path.resolve("./public/images");
  if (!fs.existsSync(imagesBaseDir)) {
    console.error("public/images directory not found.");
    process.exit(1);
  }

  const albums = fs
    .readdirSync(imagesBaseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "thumbs" && !d.name.startsWith("."))
    .map((d) => d.name);

  console.log(
    `Standard: Max ${MAX_RECOMMENDED_DIMENSION}px (2.5K)\nTarget size < 2.0MB per photo\nWebP Thumbnails in thumbs/`,
  );

  let totalPhotos = 0;
  let totalOptimized = 0;
  let totalNeedsOptimization = 0;
  let totalMediaBytes = 0;
  let totalThumbBytes = 0;
  let missingThumbCount = 0;

  const unoptimizedList = [];
  const albumBreakdown = [];

  for (const album of albums) {
    const albumPath = path.join(imagesBaseDir, album);
    const files = fs
      .readdirSync(albumPath)
      .filter((f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith("."));

    let albumBytes = 0;
    let albumUnoptimizedCount = 0;
    let albumMissingThumbs = 0;

    for (const file of files) {
      totalPhotos++;
      const filePath = path.join(albumPath, file);
      const ext = path.extname(file);
      const base = path.basename(file, ext);
      const thumbPath = path.join(albumPath, "thumbs", `${base}.webp`);

      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      albumBytes += stat.size;
      totalMediaBytes += stat.size;

      if (fs.existsSync(thumbPath)) {
        totalThumbBytes += fs.statSync(thumbPath).size;
      } else {
        missingThumbCount++;
        albumMissingThumbs++;
      }

      try {
        const meta = await sharp(buffer).metadata();
        const isTooWide =
          (meta.width || 0) > MAX_RECOMMENDED_DIMENSION ||
          (meta.height || 0) > MAX_RECOMMENDED_DIMENSION;
        const isTooHeavy = stat.size > MAX_RECOMMENDED_SIZE_BYTES;

        if (isTooWide || isTooHeavy || !fs.existsSync(thumbPath)) {
          totalNeedsOptimization++;
          albumUnoptimizedCount++;
          const reasons = [];
          if (isTooWide) reasons.push("Resolution > 2.5K");
          if (isTooHeavy) reasons.push("Size > 2MB");
          if (!fs.existsSync(thumbPath)) reasons.push("Missing WebP Thumbnail");

          unoptimizedList.push({
            album,
            file,
            relPath: path.relative(process.cwd(), filePath),
            dims: `${meta.width}x${meta.height}`,
            size: formatBytes(stat.size),
            reason: reasons.join(", "),
          });
        } else {
          totalOptimized++;
        }
      } catch (err) {
        console.error(`Error reading metadata for ${file}:`, err.message);
      }
    }

    albumBreakdown.push({
      album,
      photoCount: files.length,
      sizeFormatted: formatBytes(albumBytes),
      unoptimizedCount: albumUnoptimizedCount,
      missingThumbs: albumMissingThumbs,
    });
  }

  console.log("-- ALBUMS OVERVIEW: --");
  for (const item of albumBreakdown) {
    const status =
      item.unoptimizedCount === 0
        ? "OPTIMIZED"
        : `[WARNING] ${item.unoptimizedCount} files need compression`;
    console.log(
      `  • ${item.album.padEnd(30)} ${item.photoCount.toString().padStart(2)} photos | ${item.sizeFormatted.padStart(9)} | ${status}`,
    );
  }

  if (unoptimizedList.length > 0) {
    console.log(`[WARNING] UNOPTIMIZED PHOTOS FOUND (${unoptimizedList.length}):`);
    for (const item of unoptimizedList) {
      console.log(`  [NEEDS COMPRESSION] ${item.relPath}`);
      console.log(`     Dimensions: ${item.dims} | Size: ${item.size} | Reason: ${item.reason}`);
      console.log(`     Fix command: npm run media:compress ${item.relPath}`);
    }
  } else {
    console.log("\n[OK] ALL PHOTOS ARE FULLY OPTIMIZED");
  }

  const repoSize = getTrackedGitRepoSize();
  const remainingQuota = Math.max(0, GITHUB_RECOMMENDED_LIMIT_BYTES - repoSize);

  console.log(`Total Media Assets:      ${formatBytes(totalMediaBytes)} (${totalPhotos} photos)`);
  console.log(`Tracked Repository Size: ${formatBytes(repoSize)}`);
  console.log(
    `GitHub 1GB Usage:        ${renderProgressBar(repoSize, GITHUB_RECOMMENDED_LIMIT_BYTES)}`,
  );
  console.log(`Remaining Capacity:      ${formatBytes(remainingQuota)} until 1GB guideline`);
}

main().catch((err) => {
  console.error("Fatal audit error:", err);
  process.exit(1);
});
