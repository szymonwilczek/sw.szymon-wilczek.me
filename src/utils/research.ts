// Upstream work in research.json, read the way the research pages show it:
// subject split from its area, prose from its trailers.
// Every project comes from the data; nothing here knows one by name.

import saved from "../data/research.json";

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

interface Saved {
  kind: string;
  repo: string;
  sha?: string;
  number?: number;
  author?: string;
  email?: string;
  message?: string;
  title?: string;
  html?: string;
  authored: string;
  committed: string;
  committer: string;
  files?: PatchFile[];
}

export interface Patch {
  sha: string;
  short: string;
  repo: string;
  pull?: number;
  author: string;
  email: string;
  subject: string;
  area: string;
  title: string;
  prose: string;
  html?: string;
  trailers: Trailer[];
  notes: string[];
  authored: Date;
  merged: Date;
  lag: number;
  by: string;
  files: PatchFile[];
  additions: number;
  deletions: number;
  bot?: string;
}

export interface Issue {
  repo: string;
  number: number;
  title: string;
  opened: Date;
  closed: Date;
  by: string;
  url: string;
}

const TRAILER = /^([A-Z][\w-]*): (.+)$/;
const NOTE = /^\[[^\]]+: (.+)\]$/;
const BOT = /bot\b|bot[+@]|syzkaller|robot/i;

export function dayMonthYear(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function name(trailer: Trailer): string {
  return trailer.value.split(" <")[0];
}

// a bot signs with a bare address: its name is what comes before + or @
export function botName(trailer: Trailer): string {
  return name(trailer).split(/[+@]/)[0];
}

// trailers are the paragraphs at the end made of nothing but trailers
function splitTrailers(body: string) {
  const paragraphs = body.trim().split(/\n{2,}/);
  let first = paragraphs.length;
  while (
    first > 0 &&
    paragraphs[first - 1].split("\n").every((line) => TRAILER.test(line) || NOTE.test(line))
  ) {
    first--;
  }
  const tail = paragraphs.slice(first).join("\n").split("\n").filter(Boolean);
  return {
    prose: paragraphs.slice(0, first).join("\n\n").trim(),
    trailers: tail.flatMap((line) => {
      const match = line.match(TRAILER);
      return match ? [{ key: match[1], value: match[2] }] : [];
    }),
    notes: tail.flatMap((line) => line.match(NOTE)?.[1] ?? []),
  };
}

function read(raw: Saved): Patch {
  const [subject, ...rest] = (raw.message ?? "").trimEnd().split("\n");
  const { prose, trailers, notes } = splitTrailers(rest.join("\n"));
  const separator = subject.indexOf(": ");
  const authored = new Date(raw.authored);
  const merged = new Date(raw.committed);
  const files = raw.files ?? [];
  const reporter = trailers.find(
    (trailer) => trailer.key === "Reported-by" && BOT.test(trailer.value),
  );
  return {
    sha: raw.sha ?? "",
    short: (raw.sha ?? "").slice(0, SHORT_SHA),
    repo: raw.repo,
    pull: raw.number,
    author: raw.author ?? "",
    email: raw.email ?? "",
    subject,
    area: separator === -1 ? "" : subject.slice(0, separator),
    title: separator === -1 ? subject : subject.slice(separator + 2),
    prose,
    html: raw.html,
    trailers,
    notes,
    authored,
    merged,
    lag: Math.round((merged.valueOf() - authored.valueOf()) / DAY_MS),
    by: raw.committer,
    files,
    additions: files.reduce((sum, file) => sum + file.additions, 0),
    deletions: files.reduce((sum, file) => sum + file.deletions, 0),
    bot: reporter && botName(reporter),
  };
}

const all = saved as Saved[];

export const patches: Patch[] = all
  .filter((item) => item.kind !== "issue")
  .map(read)
  .sort((a, b) => b.authored.valueOf() - a.authored.valueOf());

export const issues: Issue[] = all
  .filter((item) => item.kind === "issue")
  .map((item) => ({
    repo: item.repo,
    number: item.number ?? 0,
    title: item.title ?? "",
    opened: new Date(item.authored),
    closed: new Date(item.committed),
    by: item.committer,
    url: `https://github.com/${item.repo}/issues/${item.number}`,
  }))
  .sort((a, b) => b.closed.valueOf() - a.closed.valueOf());

export interface Project {
  repo: string;
  id: string;
  patches: Patch[];
  issues: Issue[];
  first: Date;
  last: Date;
}

// one project per repository, the one worked on most lately first
export const projects: Project[] = [...new Set(all.map((item) => item.repo))]
  .map((repo) => {
    const own = {
      patches: patches.filter((p) => p.repo === repo),
      issues: issues.filter((i) => i.repo === repo),
    };
    const dates = [...own.patches.map((p) => p.authored), ...own.issues.map((i) => i.opened)];
    return {
      repo,
      id: repo.replace("/", "-").toLowerCase(),
      ...own,
      first: new Date(Math.min(...dates.map(Number))),
      last: new Date(Math.max(...dates.map(Number))),
    };
  })
  .sort((a, b) => b.last.valueOf() - a.last.valueOf());

export function repoUrl(repo: string): string {
  return `https://github.com/${repo}`;
}

export function githubUrl(patch: Patch): string {
  return `${repoUrl(patch.repo)}/commit/${patch.sha}`;
}

export function pullUrl(patch: Patch): string | undefined {
  return patch.pull ? `${repoUrl(patch.repo)}/pull/${patch.pull}` : undefined;
}

export function rawPatchUrl(patch: Patch): string {
  return `${pullUrl(patch) ?? githubUrl(patch)}.patch`;
}

// where the patch was discussed
export function threadUrl(patch: Patch, firstVersion?: string): string | undefined {
  const linked = patch.trailers.find(
    (trailer) => trailer.key === "Link" && /\/r\/|patch\.msgid\.link/.test(trailer.value),
  );
  return pullUrl(patch) ?? firstVersion ?? linked?.value;
}

// the reports a patch closes, by their URL
export function reports(patch: Patch): string[] {
  return patch.trailers
    .filter((trailer) => trailer.key === "Closes" && /^https?:\/\//.test(trailer.value))
    .map((trailer) => trailer.value);
}

export function hostOf(url: string): string {
  return new URL(url).hostname;
}
