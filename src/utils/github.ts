// Stars, forks and a year of commits for each repository, read from the
// GitHub API at build time.

import { smooth } from "./sand";

export interface RepoStats {
  stars: number;
  forks: number;
  pushed: string;
  days: number[][];
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
    const res = await get(`${API}${repo}/stats/commit_activity`, token);
    if (res.status === 200) {
      const weeks: Array<{ days: number[] }> = await res.json();
      return weeks.map((w) => w.days);
    }
    if (res.status !== 202) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  return [];
}

async function load(repo: string, token: string): Promise<RepoStats | null> {
  try {
    const res = await get(API + repo, token);
    if (!res.ok) return null;
    const info = await res.json();
    return {
      stars: info.stargazers_count,
      forks: info.forks_count,
      pushed: info.pushed_at,
      days: await activity(repo, token),
    };
  } catch {
    return null;
  }
}

/** Stats for "owner/repo", or null without a token or when GitHub fails */
export function repoStats(repo: string): Promise<RepoStats | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return Promise.resolve(null);
  if (!cache.has(repo)) cache.set(repo, load(repo, token));
  return cache.get(repo)!;
}

/** Weekly commit totals drawn as a soft line */
export function sparkline(days: number[][]): string {
  const weeks = days.map((d) => d.reduce((a, b) => a + b, 0));
  if (weeks.length < 2 || Math.max(...weeks) === 0) return "";
  const buckets: number[] = [];
  for (let i = 0; i < weeks.length; i += 2) buckets.push(weeks[i] + (weeks[i + 1] ?? 0));
  const top = Math.max(...buckets);
  const step = 104 / (buckets.length - 1);
  return smooth(
    buckets.map((v, i): [number, number] => [i * step, 16 - (v / top) * 14]),
    false,
  );
}

/** Every repository's days added together, 52 weeks of 7 */
export function yearOfInk(all: number[][][]): number[][] {
  const year = Array.from({ length: 52 }, () => Array<number>(7).fill(0));
  for (const days of all) {
    const recent = days.slice(-52);
    const offset = 52 - recent.length;
    recent.forEach((week, w) => week.forEach((n, d) => (year[w + offset][d] += n)));
  }
  return year;
}
