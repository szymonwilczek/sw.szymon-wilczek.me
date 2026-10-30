// Reads each upstream commit from the GitHub API and keeps what the research
// pages need in src/data/research.json.
//   npm run research -- torvalds/linux:<sha>
// Without arguments it refreshes the commits already in the file.

import { readFile, writeFile } from "node:fs/promises";

const OUT = new URL("../src/data/research.json", import.meta.url);
const API = "https://api.github.com/repos/";

async function known() {
  try {
    const kept = JSON.parse(await readFile(OUT, "utf8"));
    return kept.map((commit) => `${commit.repo}:${commit.sha}`);
  } catch {
    return [];
  }
}

async function fetchCommit(repo, sha) {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`${API}${repo}/commits/${sha}`, { headers });
  if (!response.ok) throw new Error(`${repo}@${sha}: ${response.status}`);
  return response.json();
}

function keep(repo, raw) {
  return {
    repo,
    sha: raw.sha,
    message: raw.commit.message,
    authored: raw.commit.author.date,
    committed: raw.commit.committer.date,
    committer: raw.commit.committer.name,
    files: raw.files.map((file) => ({
      name: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      patch: file.patch ?? "",
    })),
  };
}

const wanted = [...new Set([...(await known()), ...process.argv.slice(2)])];
if (wanted.length === 0) {
  console.error("usage: npm run research -- owner/repo:<sha> ...");
  process.exit(1);
}

const bySha = new Map();
for (const entry of wanted) {
  const [repo, sha] = entry.split(":");
  const commit = keep(repo, await fetchCommit(repo, sha));
  bySha.set(commit.sha, commit);
}
const commits = [...bySha.values()];
commits.sort((a, b) => b.authored.localeCompare(a.authored));
await writeFile(OUT, JSON.stringify(commits, null, 2) + "\n");
console.log(`${commits.length} commits kept in src/data/research.json`);
