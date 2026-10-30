// Upstream commits in research.json, read the way the research pages show them:
// subject split from its subsystem, prose from its trailers.

import commits from "../data/research.json";

export const SHORT_SHA = 12;
const DAY_MS = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface Trailer {
  key: string;
  value: string;
}

export interface PatchFile {
  name: string;
  additions: number;
  deletions: number;
  patch: string;
}

export interface Patch {
  sha: string;
  short: string;
  project: "linux" | "git";
  repo: string;
  subject: string;
  area: string;
  title: string;
  prose: string;
  trailers: Trailer[];
  notes: string[];
  authored: Date;
  merged: Date;
  lag: number;
  by: string;
  files: PatchFile[];
  additions: number;
  deletions: number;
  syzbot: boolean;
}

const TRAILER =
  /^(Signed-off-by|Reported-by|Tested-by|Reviewed-by|Acked-by|Suggested-by|Fixes|Closes|Link|Cc): (.+)$/;
const NOTE = /^\[[^\]]+: (.+)\]$/;

export function dayMonthYear(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function read(raw: (typeof commits)[number]): Patch {
  const [subject, ...rest] = raw.message.trimEnd().split("\n");
  const lines = rest.join("\n").trim().split("\n");
  const firstTrailer = lines.findIndex((line) => TRAILER.test(line) || NOTE.test(line));
  const tail = firstTrailer === -1 ? [] : lines.slice(firstTrailer);
  const trailers = tail.flatMap((line) => {
    const match = line.match(TRAILER);
    return match ? [{ key: match[1], value: match[2] }] : [];
  });
  const notes = tail.flatMap((line) => line.match(NOTE)?.[1] ?? []);
  const separator = subject.indexOf(": ");
  const authored = new Date(raw.authored);
  const merged = new Date(raw.committed);
  return {
    sha: raw.sha,
    short: raw.sha.slice(0, SHORT_SHA),
    project: raw.repo === "git/git" ? "git" : "linux",
    repo: raw.repo,
    subject,
    area: subject.slice(0, separator),
    title: subject.slice(separator + 2),
    prose: (firstTrailer === -1 ? lines : lines.slice(0, firstTrailer)).join("\n").trim(),
    trailers,
    notes,
    authored,
    merged,
    lag: Math.round((merged.valueOf() - authored.valueOf()) / DAY_MS),
    by: raw.committer,
    files: raw.files,
    additions: raw.files.reduce((sum, file) => sum + file.additions, 0),
    deletions: raw.files.reduce((sum, file) => sum + file.deletions, 0),
    syzbot: trailers.some((trailer) => trailer.value.startsWith("syzbot")),
  };
}

export const patches: Patch[] = commits
  .map(read)
  .sort((a, b) => b.authored.valueOf() - a.authored.valueOf());

export function name(trailer: Trailer): string {
  return trailer.value.split(" <")[0];
}

// where the patch was sent and discussed: its own message id when
// the maintainer left one, otherwise a search for its subject
export function loreUrl(patch: Patch): string {
  const link = patch.trailers.find(
    (trailer) =>
      trailer.key === "Link" && /lore\.kernel\.org\/r\/|patch\.msgid\.link/.test(trailer.value),
  );
  if (link) return link.value;
  const list = patch.project === "git" ? "git" : "all";
  return `https://lore.kernel.org/${list}/?q=${encodeURIComponent(`s:"${patch.title}"`)}`;
}

export function syzbotUrl(patch: Patch): string | undefined {
  return patch.trailers.find(
    (trailer) => trailer.key === "Closes" && trailer.value.includes("syzkaller"),
  )?.value;
}

export function githubUrl(patch: Patch): string {
  return `https://github.com/${patch.repo}/commit/${patch.sha}`;
}

export function kernelOrgUrl(patch: Patch): string {
  return patch.project === "git"
    ? `https://git.kernel.org/pub/scm/git/git.git/commit/?id=${patch.sha}`
    : `https://git.kernel.org/pub/scm/linux/kernel/git/torvalds/linux.git/commit/?id=${patch.sha}`;
}
