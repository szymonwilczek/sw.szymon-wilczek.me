// What the media scripts share: sizes in words and how full the repository is

import fs from "node:fs";
import { execSync } from "node:child_process";

export const GITHUB_RECOMMENDED_LIMIT_BYTES = 1024 * 1024 * 1024; // 1 GB

export function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const unit = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(unit));
  return `${parseFloat((bytes / Math.pow(unit, i)).toFixed(2))} ${sizes[i]}`;
}

export function getTrackedGitRepoSize() {
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

export function renderProgressBar(usedBytes, totalBytes, length = 36) {
  const percent = Math.min(100, Math.max(0, (usedBytes / totalBytes) * 100));
  const filledLength = Math.round((length * percent) / 100);
  const emptyLength = length - filledLength;
  const bar = "█".repeat(filledLength) + "░".repeat(emptyLength);
  return `[${bar}] ${formatBytes(usedBytes)} / ${formatBytes(totalBytes)} (${percent.toFixed(1)}%)`;
}
