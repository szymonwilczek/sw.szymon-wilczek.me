// The repositories kept on /projects: one line each, a language and the way
// to the code.

import data from "../data/projects.json";
import { smooth } from "./sand";
import { hash, rng } from "./stamp";

export interface Project {
  title: string;
  url: string;
  excerpt: string;
  language: string;
  date: string;
  badge?: string;
  archived?: boolean;
  pinned?: boolean;
}

export const PROJECTS: Project[] = data;

// each language borrows a token from the theme
const INK: Record<string, string> = {
  C: "var(--fg-main)",
  Rust: "var(--red)",
  TypeScript: "var(--fg-link)",
  Lua: "var(--accent-0)",
  Java: "var(--red-warmer)",
  JavaScript: "var(--cursor)",
  "C++": "var(--fg-dim)",
};

export function inkOf(language: string): string {
  return INK[language] ?? "var(--fg-dim)";
}

/** "owner/repo" for GitHub, otherwise the bare host of the site */
export function repoPath(url: string): { path: string; site: boolean } {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/^\/|\/$/g, "");
  if (parsed.hostname === "github.com") return { path, site: false };
  return { path: parsed.hostname, site: true };
}

/** A small seven-point blot of ink */
export function blot(seed: string, radius = 5.2): string {
  const rand = rng(hash(seed));
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2;
    const wobble = 1 + (rand() - 0.5) * 0.3;
    points.push([7 + Math.cos(angle) * radius * wobble, 7 + Math.sin(angle) * radius * wobble]);
  }
  return smooth(points, true);
}

/** languages with how many projects use each, most used first */
export function languages(projects: Project[]): Array<[string, number]> {
  const counts = new Map<string, number>();
  for (const project of projects)
    counts.set(project.language, (counts.get(project.language) ?? 0) + 1);
  return [...counts].sort((former, latter) => latter[1] - former[1]);
}
