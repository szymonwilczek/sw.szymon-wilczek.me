// Finds everything I got merged upstream and keeps what the research pages
// need in src/data/research.json, with the review threads in threads.json:
//   npm run research              finds new work, keeps what is already saved
//   npm run research -- --refresh fetches every saved item and thread again
//
// What I'd rather not show goes in src/data/research-skip.json:
// "owner/repo" skips the whole repository, "owner/repo/<sha>" one commit,
// "owner/repo#<number>" one pull request or issue.

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { listThread, pullThread } from "./threads.mjs";

const OUT = new URL("../src/data/research.json", import.meta.url);
const THREADS = new URL("../src/data/threads.json", import.meta.url);
const SKIP = new URL("../src/data/research-skip.json", import.meta.url);
const API = "https://api.github.com/";
const PAGE = 100;
const SEARCH_PAGES = 3;
const SHORT_SHA = 12;
const DAY_MS = 86_400_000;
const LOOKBACK_DAYS = 30;
const WEB_FLOW = "web-flow";
const NOREPLY = /noreply/;

const refresh = process.argv.includes("--refresh");

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execFileSync("gh", ["auth", "token"], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

const TOKEN = token();

let calls = 0;
const RETRIES = 3;
async function github(path, { allowMissing = false, accept = "application/vnd.github+json" } = {}) {
  const headers = { Accept: accept };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  for (let attempt = 1; ; attempt++) {
    calls++;
    const response = await fetch(path.startsWith("http") ? path : `${API}${path}`, { headers });
    if (allowMissing && [404, 422].includes(response.status)) return null;
    if (response.ok) return response.json();
    if (response.status < 500 || attempt === RETRIES)
      throw new Error(`${path}: ${response.status}`);
  }
}

async function search(kind, query) {
  const items = [];
  for (let page = 1; page <= SEARCH_PAGES; page++) {
    const params = new URLSearchParams({ q: query, per_page: PAGE, page });
    const found = await github(`search/${kind}?${params}`);
    items.push(...found.items);
    if (items.length >= found.total_count || found.items.length < PAGE) break;
  }
  return items;
}

async function readJson(url, empty) {
  try {
    return JSON.parse(await readFile(url, "utf8"));
  } catch {
    return empty;
  }
}

// the owner of the repository this site is built from is the one it is about
function login() {
  if (process.env.GITHUB_REPOSITORY_OWNER) return process.env.GITHUB_REPOSITORY_OWNER;
  const origin = execFileSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" });
  return /github\.com[:/]([^/]+)\//.exec(origin)[1];
}

const me = login();
const saved = (await readJson(OUT, [])).map((item) => ({ kind: "commit", ...item }));
const savedThreads = refresh ? {} : await readJson(THREADS, {});
const keyOf = (item) => `${item.repo}#${item.sha ?? item.number}`;
const kept = new Map(refresh ? [] : saved.map((item) => [keyOf(item), item]));

const skips = (await readJson(SKIP, [])).map((entry) => entry.toLowerCase());
function skipped({ repo, sha, number }) {
  const own = repo.toLowerCase();
  return skips.some((entry) => {
    if (entry === own) return true;
    if (number && entry === `${own}#${number}`) return true;
    const prefix = entry.startsWith(`${own}/`) ? entry.slice(own.length + 1) : "";
    return Boolean(sha && prefix) && sha.startsWith(prefix);
  });
}

const repos = new Map();
async function repoInfo(repo) {
  if (!repos.has(repo)) repos.set(repo, await github(`repos/${repo}`, { allowMissing: true }));
  return repos.get(repo);
}

const mine = new Set();

async function upstream(repo) {
  if (mine.has(repo)) return false;
  const info = await repoInfo(repo);
  return Boolean(info) && info.owner.login !== me && !info.fork && info.stargazers_count > 0;
}

const people = new Map();
async function fullName(user) {
  if (!people.has(user)) people.set(user, (await github(`users/${user}`)).name || user);
  return people.get(user);
}

// --- who I am ---------------------------------

const emails = new Set(saved.flatMap((item) => (item.email ? [item.email] : [])));
for (const hit of await search("commits", `author:${me}`)) {
  const email = hit.commit.author.email;
  if (!NOREPLY.test(email)) emails.add(email);
}

// --- pull requests and issues -------------------------

const pulls = [];
for (const hit of await search("issues", `is:pr is:merged author:${me} -user:${me}`)) {
  const repo = hit.repository_url.replace(`${API}repos/`, "");
  const pull = await github(`repos/${repo}/pulls/${hit.number}`);
  if (pull.merged_by?.login === me) mine.add(repo);
  else pulls.push({ repo, pull });
}

const issues = [];
const resolved = `is:issue is:closed reason:completed author:${me} -user:${me}`;
for (const hit of await search("issues", resolved)) {
  const repo = hit.repository_url.replace(`${API}repos/`, "");
  const issue = await github(`repos/${repo}/issues/${hit.number}`);
  if (issue.closed_by && issue.closed_by.login !== me) issues.push({ repo, issue });
}

// --- commits sent by mail ----

const BOT = /\[bot\]/;

function landedBySomeoneElse(raw) {
  const committer = raw.committer;
  if (committer?.type === "Bot" || BOT.test(raw.commit.committer.name)) return false;
  return (
    committer?.login !== WEB_FLOW &&
    committer?.login !== me &&
    !emails.has(raw.commit.committer.email)
  );
}

const named = new Map();
async function bestNamed(name) {
  if (!named.has(name)) {
    const params = new URLSearchParams({ q: `${name} in:name`, sort: "stars", per_page: PAGE });
    const found = await github(`search/repositories?${params}`);
    named.set(name, found.items.find((repo) => repo.name === name)?.full_name);
  }
  return named.get(name);
}

async function holds(repo, sha) {
  return Boolean(await github(`repos/${repo}/commits/${sha}`, { allowMissing: true }));
}

// the repository a mirrored commit really lives in
async function homeOf(sha, hits) {
  const candidates = new Set(hits.map((hit) => hit.repository.full_name));
  for (const hit of hits.filter((hit) => hit.repository.fork)) {
    const info = await repoInfo(hit.repository.full_name);
    if (info?.source) candidates.add(info.source.full_name);
  }
  for (const name of new Set(hits.map((hit) => hit.repository.name))) {
    const best = await bestNamed(name);
    if (best) candidates.add(best);
  }
  const ranked = [];
  for (const repo of candidates) {
    if (await upstream(repo)) ranked.push(await repoInfo(repo));
  }
  ranked.sort((a, b) => b.stargazers_count - a.stargazers_count);
  for (const info of ranked) {
    if (await holds(info.full_name, sha)) return info.full_name;
  }
  return null;
}

const knownRepos = new Set(saved.filter((item) => item.kind === "commit").map((item) => item.repo));

// a backport keeps the subject and gets a new sha
const savedSubjects = new Set(saved.map((item) => (item.message ?? item.title).split("\n")[0]));
const bySubject = new Map();
for (const email of emails) {
  for (const hit of await search("commits", `author-email:${email}`)) {
    const subject = hit.commit.message.split("\n")[0];
    if (savedSubjects.has(subject) || !landedBySomeoneElse(hit)) continue;
    bySubject.set(subject, [...(bySubject.get(subject) ?? []), hit]);
  }
}
let oldest = saved.reduce((at, item) => (item.authored < at ? item.authored : at), "9999");
for (const hits of bySubject.values()) {
  const { sha } = hits[0];
  let known = false;
  for (const repo of knownRepos) known ||= await holds(repo, sha);
  if (known) continue;
  const home = await homeOf(sha, hits);
  if (!home) continue;
  knownRepos.add(home);
  const authored = hits[0].commit.author.date;
  if (authored < oldest) oldest = authored;
}

const commits = new Map();
const since = new Date(Date.parse(oldest) - LOOKBACK_DAYS * DAY_MS || 0).toISOString();
for (const repo of knownRepos) {
  if (skipped({ repo })) continue;
  for (const email of emails) {
    const params = new URLSearchParams({ author: email, since, per_page: PAGE });
    for (const raw of await github(`repos/${repo}/commits?${params}`)) {
      if (landedBySomeoneElse(raw)) commits.set(raw.sha, { repo });
    }
  }
}

// --- everything kept ----------------------------

function filesOf(files) {
  return files.map((file) => ({
    name: file.filename,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch ?? "",
  }));
}

async function keepCommit(repo, sha) {
  const raw = await github(`repos/${repo}/commits/${sha}`);
  return {
    kind: "commit",
    repo,
    sha: raw.sha,
    author: raw.commit.author.name,
    email: raw.commit.author.email,
    message: raw.commit.message,
    authored: raw.commit.author.date,
    committed: raw.commit.committer.date,
    committer: raw.commit.committer.name,
    files: filesOf(raw.files),
  };
}

// pull request is described in Markdown
async function keepPull(repo, pull) {
  const files = await github(`repos/${repo}/pulls/${pull.number}/files?per_page=${PAGE}`);
  const [first] = await github(`repos/${repo}/pulls/${pull.number}/commits?per_page=1`);
  const rendered = await github(`repos/${repo}/pulls/${pull.number}`, {
    accept: "application/vnd.github.html+json",
  });
  return {
    kind: "pull",
    repo,
    sha: pull.merge_commit_sha,
    number: pull.number,
    author: await fullName(pull.user.login),
    email: first.commit.author.email,
    message: pull.title,
    html: rendered.body_html ?? "",
    authored: pull.created_at,
    committed: pull.merged_at,
    committer: await fullName(pull.merged_by.login),
    files: filesOf(files),
  };
}

async function keepIssue(repo, issue) {
  return {
    kind: "issue",
    repo,
    number: issue.number,
    title: issue.title,
    authored: issue.created_at,
    committed: issue.closed_at,
    committer: await fullName(issue.closed_by.login),
  };
}

const items = [];
const once = async (found, make) => {
  if (skipped(found) || !(await upstream(found.repo))) return;
  items.push(kept.get(keyOf(found)) ?? (await make()));
};

for (const [sha, { repo }] of commits) await once({ repo, sha }, () => keepCommit(repo, sha));
for (const { repo, pull } of pulls) {
  const found = { repo, sha: pull.merge_commit_sha, number: pull.number };
  await once(found, () => keepPull(repo, pull));
}
for (const { repo, issue } of issues) {
  await once({ repo, number: issue.number }, () => keepIssue(repo, issue));
}
for (const [key, item] of kept) {
  if (!items.some((other) => keyOf(other) === key)) await once(item, () => item);
}

// the same patch carried by two upstreams
const subjectOf = (item) => (item.message ?? item.title).split("\n")[0];
const stars = async (item) => (await repoInfo(item.repo))?.stargazers_count ?? 0;
const unique = new Map();
for (const item of items) {
  const subject = `${item.kind}:${subjectOf(item)}`;
  const other = unique.get(subject);
  if (!other || (await stars(item)) > (await stars(other))) unique.set(subject, item);
}
const work = [...unique.values()].sort((a, b) => b.authored.localeCompare(a.authored));

// --- review threads --

const name = await fullName(me);
const threads = {};
for (const item of work) {
  if (item.kind === "issue") continue;
  const short = item.sha.slice(0, SHORT_SHA);
  if (savedThreads[short]) {
    threads[short] = savedThreads[short];
    continue;
  }
  const thread =
    item.kind === "pull"
      ? await pullThread(item, me, github)
      : await listThread(item, name, [...emails]);
  if (thread) threads[short] = thread;
}

await writeFile(OUT, JSON.stringify(work, null, 2) + "\n");
await writeFile(THREADS, JSON.stringify(threads, null, 2) + "\n");
const counts = Object.groupBy(work, (item) => item.repo);
for (const [repo, list] of Object.entries(counts)) console.log(`${repo}: ${list.length}`);
console.log(`${work.length} items, ${Object.keys(threads).length} threads, ${calls} GitHub calls`);
