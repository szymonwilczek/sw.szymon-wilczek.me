// Stars, forks and a year of commits for each repository, read from the
// GitHub API at build time.

import { smooth } from "./sand";

export interface RepoStats {
  stars: number;
  forks: number;
  pushed: string;
  days: number[][];
  last: { subject: string; date: string } | null;
  sample?: boolean;
}

const API = "https://api.github.com/repos/";
const cache = new Map<string, Promise<RepoStats | null>>();

async function get(url: string, token: string): Promise<Response> {
  return fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

// GitHub answers 202 while it computes the statistics; ask again a few times
async function activity(repo: string, token: string): Promise<number[][]> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await get(`${API}${repo}/stats/commit_activity`, token);
    if (response.status === 200) {
      const weeks: Array<{ days: number[] }> = await response.json();
      return weeks.map((week) => week.days);
    }
    if (response.status !== 202) break;
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
  }
  return [];
}

async function lastCommit(repo: string, token: string): Promise<RepoStats["last"]> {
  const response = await get(`${API}${repo}/commits?per_page=1`, token);
  if (!response.ok) return null;
  const [newest] = await response.json();
  if (!newest) return null;
  return { subject: newest.commit.message.split("\n")[0], date: newest.commit.committer.date };
}

async function load(repo: string, token: string): Promise<RepoStats | null> {
  try {
    const response = await get(API + repo, token);
    if (!response.ok) return null;
    const info = await response.json();
    return {
      stars: info.stargazers_count,
      forks: info.forks_count,
      pushed: info.pushed_at,
      days: await activity(repo, token),
      last: await lastCommit(repo, token),
    };
  } catch {
    return null;
  }
}

const SUBJECTS = [
  "fix: keep the cursor inside the frame",
  "docs: say what the flags do",
  "refactor: split the parser in two",
  "feat: read the config once",
  "chore: bump dependencies",
  "test: cover the empty input",
];

// seeded by the repository
function sample(repo: string): RepoStats {
  let seed = 7;
  for (const character of repo) seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const start = Math.floor(rand() * 30);
  let level = rand() * 0.5;
  const days = Array.from({ length: 52 }, (_, week) => {
    level = Math.min(1, Math.max(0, level + (rand() - 0.5) * 0.7));
    const rest = week < start || rand() < 0.18;
    return Array.from({ length: 7 }, () => (rest ? 0 : Math.round(level * rand() * 6)));
  });
  const daysAgo = Math.floor(rand() * 40);
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    stars: Math.floor(rand() * rand() * 60),
    forks: Math.floor(rand() * rand() * 8),
    pushed: date,
    days,
    last: { subject: SUBJECTS[Math.floor(rand() * SUBJECTS.length)], date },
    sample: true,
  };
}

/** Stats for "owner/repo": from GitHub with a token, a sample locally without one, else null */
export function repoStats(repo: string): Promise<RepoStats | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Promise.resolve(process.env.CI ? null : sample(repo));
  if (!cache.has(repo)) cache.set(repo, load(repo, token));
  return cache.get(repo)!;
}

/**
 * A year of commits as one brush stroke: a thread where the work rested,
 * thick where it ran. Weekly totals, the newest week on the right.
 */
export function inkStroke(days: number[][], width: number, height: number): string {
  const weeks = days.slice(-52).map((week) => week.reduce((total, day) => total + day, 0));
  const top = Math.max(...weeks, 0);
  if (weeks.length < 2 || top === 0) return "";
  const step = width / (weeks.length - 1);
  const upper: Array<[number, number]> = [];
  const lower: Array<[number, number]> = [];
  weeks.forEach((count, i) => {
    const thick = 0.7 + Math.sqrt(count / top) * height * 0.62;
    const middle = height / 2 + Math.sin(i / 5) * 1.2;
    upper.push([i * step, middle - thick / 2]);
    lower.unshift([i * step, middle + thick / 2]);
  });
  return smooth([...upper, ...lower], true) + " Z";
}

/** Commits in the last 52 weeks */
export function commitCount(days: number[][]): number {
  return days
    .slice(-52)
    .reduce((sum, week) => sum + week.reduce((total, day) => total + day, 0), 0);
}

/** Every repository's year added up, day by day: 52 weeks of 7 days, the newest week last */
export function yearOfInk(allDays: number[][][]): number[][] {
  const year = Array.from({ length: 52 }, () => Array<number>(7).fill(0));
  for (const days of allDays) {
    const recent = days.slice(-52);
    const offset = 52 - recent.length;
    recent.forEach((week, weekIndex) =>
      week.forEach((count, dayIndex) => (year[weekIndex + offset][dayIndex] += count)),
    );
  }
  return year;
}
