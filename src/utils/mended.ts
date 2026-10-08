// Kintsugi for essays: every commit after the first that touched an essay's
// .org file is a mend. The date and subject come from git log; the first
// substantial added line hints which paragraph was mended.

import { execFileSync } from "node:child_process";

export interface Mend {
  date: string;
  subject: string;
  hint: string | null;
}

// the longest run of plain words in an Org line, free of markup
function plainRun(line: string): string | null {
  const text = line.replace(/\[\[[^\]]*\]\[([^\]]*)\]\]/g, "$1").replace(/\[\[[^\]]*\]\]/g, "");
  const runs = text
    .split(/[*/=~+[\]_]/)
    .map((run) => run.trim())
    .filter((run) => run.split(/\s+/).length >= 4);
  const longest = runs.sort((a, b) => b.length - a.length)[0];
  return longest ? longest.slice(0, 48).replace(/\s+\S*$/, "") : null;
}

export function mendsOf(file: string): Mend[] {
  let log: string;
  try {
    log = execFileSync(
      "git",
      [
        "log",
        "--follow",
        "--date=short",
        "--format=%x1e%ad%x1f%s",
        "-p",
        "--unified=0",
        "--",
        file,
      ],
      { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return [];
  }

  const entries = log.split("\x1e").filter((entry) => entry.trim());

  // oldest entry is the essay being written, not mended
  return entries.slice(0, -1).map((entry) => {
    const [head, ...diff] = entry.split("\n");
    const [date, subject] = head.split("\x1f");
    const added = diff
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => line.slice(1).trim())
      .filter((line) => line && !/^(#|:|\||-----)/.test(line));
    const hint = added.map(plainRun).find(Boolean) ?? null;
    return { date: date.replaceAll("-", "·"), subject: subject.replace(/^[\w-]+:\s*/, ""), hint };
  });
}
