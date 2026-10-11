import { execFileSync } from "node:child_process";
import { hash, rng, smooth } from "./stamp";
import { MONTHS } from "./books";

export interface Week {
  year: number;
  week: number;
  monday: Date;
  dates: string;
  n: number;
  areas: Array<[string, number]>;
  growing: boolean;
  since: Date | null;
}

const DAY = 86400000;
const f1 = (n: number) => Math.round(n * 10) / 10;

const mondayOf = (day: Date) => new Date(day.valueOf() - ((day.getUTCDay() + 6) % 7) * DAY);

function isoWeek(monday: Date) {
  const thursday = new Date(monday.valueOf() + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  return { year, week: Math.floor((thursday.valueOf() - jan1) / DAY / 7) + 1 };
}

const span = (monday: Date) => {
  const sunday = new Date(monday.valueOf() + 6 * DAY);
  const m1 = MONTHS[monday.getUTCMonth()];
  const m2 = MONTHS[sunday.getUTCMonth()];
  return m1 === m2
    ? `${monday.getUTCDate()}–${sunday.getUTCDate()}·${m2}`
    : `${monday.getUTCDate()}·${m1}–${sunday.getUTCDate()}·${m2}`;
};

export function weeks(now = new Date()): Week[] {
  let log: string;
  try {
    log = execFileSync("git", ["log", "--date=short", "--format=%ad%x1f%s"], {
      encoding: "utf8",
      maxBuffer: 1 << 26,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return [];
  }
  const commits = log
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [date, subject] = line.split("\x1f");
      const [y, m, d] = date.split("-").map(Number);
      const area = subject.match(/^([\w./-]+):/)?.[1].split("/")[0] ?? "other";
      const day = new Date(Date.UTC(y, m - 1, d));
      return { day, monday: mondayOf(day), area };
    });
  if (!commits.length) return [];

  const first = commits.reduce((a, c) => Math.min(a, c.monday.valueOf()), Infinity);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const last = mondayOf(new Date(today)).valueOf();
  const out: Week[] = [];
  for (let t = first; t <= last; t += 7 * DAY) {
    const monday = new Date(t);
    const these = commits.filter((c) => c.monday.valueOf() === t);
    const count = new Map<string, number>();
    for (const c of these) count.set(c.area, (count.get(c.area) ?? 0) + 1);
    out.push({
      ...isoWeek(monday),
      monday,
      dates: span(monday),
      n: these.length,
      areas: [...count].sort((a, b) => b[1] - a[1]).slice(0, 3),
      growing: t === last,
      since: these.length ? new Date(Math.min(...these.map((c) => c.day.valueOf()))) : null,
    });
  }
  return out;
}

export function stump(list: Week[], C = 280, fit = 226) {
  const N = 48;
  const r = rng(hash("nenrin"));
  const ph = [r() * 6.3, r() * 6.3];
  const ecc = 0.16;
  const phi = 2.2;

  let R = 12;
  const raw = list.map((w) => (R += 4 + Math.sqrt(w.n) * 4.2));
  const k = Math.min(1, fit / R);
  const outer = R * k;
  let acc: number[] = new Array(N).fill(0);

  const reach = (a: number, rad: number, wob: number[]) => {
    const t = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * N;
    const i = Math.floor(t);
    const w = wob[i % N] + (wob[(i + 1) % N] - wob[i % N]) * (t - i);
    return rad * (1 + ecc * Math.cos(a - phi) * Math.min(1, rad / 120)) + w;
  };

  const at = (a: number, q: number) =>
    `${f1(C + Math.cos(a) * q)} ${f1(C + Math.sin(a) * q * 0.96)}`;

  const shape = (rad: number, wob: number[]) =>
    smooth(
      Array.from({ length: N }, (_, i): [number, number] => {
        const a = (i / N) * Math.PI * 2;
        const q = reach(a, rad, wob);
        return [C + Math.cos(a) * q, C + Math.sin(a) * q * 0.96];
      }),
      true,
    );

  const grow = () =>
    acc.map((v, i) => {
      const a = (i / N) * Math.PI * 2;
      return (
        v + (Math.sin(a * 3 + ph[0]) * 0.6 + Math.sin(a * 5 + ph[1]) * 0.4 + (r() - 0.5) * 0.8) * k
      );
    });

  const pith = shape(6 * k, acc);
  const rings = raw.map((rad) => {
    acc = grow();
    return shape(rad * k, acc);
  });
  const barkWob = acc.map((v) => v * 1.3);
  const bark = shape(outer + 16, barkWob);
  const rim = (a: number, d: number) => reach(a, outer, acc) + d;

  let fissures = "";
  for (let q = 0; q < 30; q++) {
    const a = (q / 30) * Math.PI * 2 + r() * 0.1;
    const tip = Math.min(reach(a, outer + 16, barkWob) - 1, rim(a, 12 + r() * 4));
    fissures += `M${at(a, rim(a, 3))} L${at(a, tip)} `;
  }

  // drying check
  const ca = 0.6;
  const cw = 0.05;
  const crack = `M${at(ca - cw, rim(ca - cw, 18))} L${at(ca - cw * 0.4, rim(ca, 0) * 0.75)} L${at(ca + 0.01, rim(ca, 0) * 0.42)} L${at(ca + cw * 0.3, rim(ca, 0) * 0.75)} L${at(ca + cw, rim(ca + cw, 18))} Z`;
  const gold = `M${at(ca, rim(ca, 14))} L${at(ca - cw * 0.1, rim(ca, 0) * 0.75)} L${at(ca + 0.01, rim(ca, 0) * 0.45)}`;

  return { pith, rings, bark, fissures: fissures.trim(), crack, gold };
}
