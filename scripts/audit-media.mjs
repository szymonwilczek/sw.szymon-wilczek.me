import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  GITHUB_RECOMMENDED_LIMIT_BYTES,
  formatBytes,
  getTrackedGitRepoSize,
  renderProgressBar,
} from "./media-quota.mjs";

const MAX_RECOMMENDED_DIMENSION = 2560; // 2.5K QHD
const MAX_RECOMMENDED_SIZE_BYTES = 2.0 * 1024 * 1024; // 2.0 MB

async function main() {
  const imagesBaseDir = path.resolve("./public/images");
  if (!fs.existsSync(imagesBaseDir)) {
    console.error("public/images directory not found.");
    process.exit(1);
  }

  const albums = fs
    .readdirSync(imagesBaseDir, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && entry.name !== "thumbs" && !entry.name.startsWith("."),
    )
    .map((entry) => entry.name);

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
      .filter((name) => /\.(jpe?g|png)$/i.test(name) && !name.startsWith("."));

    let albumBytes = 0;
    let albumUnoptimizedCount = 0;
    let albumMissingThumbs = 0;

    for (const file of files) {
      totalPhotos++;
      const filePath = path.join(albumPath, file);
      const extension = path.extname(file);
      const base = path.basename(file, extension);
      const thumbPath = path.join(albumPath, "thumbs", `${base}.webp`);
      const coverPath = path.join(albumPath, "thumbs", `${base}-600.webp`);

      const stat = fs.statSync(filePath);
      const buffer = fs.readFileSync(filePath);
      albumBytes += stat.size;
      totalMediaBytes += stat.size;

      const hasThumb = fs.existsSync(thumbPath);
      const hasCover = fs.existsSync(coverPath);

      if (hasThumb) totalThumbBytes += fs.statSync(thumbPath).size;
      if (hasCover) totalThumbBytes += fs.statSync(coverPath).size;

      if (!hasThumb || !hasCover) {
        missingThumbCount++;
        albumMissingThumbs++;
      }

      try {
        const meta = await sharp(buffer).metadata();
        const isTooWide =
          (meta.width || 0) > MAX_RECOMMENDED_DIMENSION ||
          (meta.height || 0) > MAX_RECOMMENDED_DIMENSION;
        const isTooHeavy = stat.size > MAX_RECOMMENDED_SIZE_BYTES;

        if (isTooWide || isTooHeavy || !hasThumb || !hasCover) {
          totalNeedsOptimization++;
          albumUnoptimizedCount++;
          const reasons = [];
          if (isTooWide) reasons.push("Resolution > 2.5K");
          if (isTooHeavy) reasons.push("Size > 2MB");
          if (!hasThumb) reasons.push("Missing 1200px WebP");
          if (!hasCover) reasons.push("Missing 600px WebP");

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
      } catch (error) {
        console.error(`Error reading metadata for ${file}:`, error.message);
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

main().catch((error) => {
  console.error("Fatal audit error:", error);
  process.exit(1);
});
