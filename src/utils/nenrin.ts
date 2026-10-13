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
const round1 = (value: number) => Math.round(value * 10) / 10;

const mondayOf = (day: Date) => new Date(day.valueOf() - ((day.getUTCDay() + 6) % 7) * DAY);

function isoWeek(monday: Date) {
  const thursday = new Date(monday.valueOf() + 3 * DAY);
  const year = thursday.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  return { year, week: Math.floor((thursday.valueOf() - jan1) / DAY / 7) + 1 };
}

const span = (monday: Date) => {
  const sunday = new Date(monday.valueOf() + 6 * DAY);
  const startMonth = MONTHS[monday.getUTCMonth()];
  const endMonth = MONTHS[sunday.getUTCMonth()];
  return startMonth === endMonth
    ? `${monday.getUTCDate()}–${sunday.getUTCDate()}·${endMonth}`
    : `${monday.getUTCDate()}·${startMonth}–${sunday.getUTCDate()}·${endMonth}`;
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
      const [year, month, dayOfMonth] = date.split("-").map(Number);
      const area = subject.match(/^([\w./-]+):/)?.[1].split("/")[0] ?? "other";
      const day = new Date(Date.UTC(year, month - 1, dayOfMonth));
      return { day, monday: mondayOf(day), area };
    });
  if (!commits.length) return [];

  const first = commits.reduce(
    (earliest, commit) => Math.min(earliest, commit.monday.valueOf()),
    Infinity,
  );
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const last = mondayOf(new Date(today)).valueOf();
  const result: Week[] = [];
  for (let mondayTime = first; mondayTime <= last; mondayTime += 7 * DAY) {
    const monday = new Date(mondayTime);
    const these = commits.filter((commit) => commit.monday.valueOf() === mondayTime);
    const count = new Map<string, number>();
    for (const commit of these) count.set(commit.area, (count.get(commit.area) ?? 0) + 1);
    result.push({
      ...isoWeek(monday),
      monday,
      dates: span(monday),
      n: these.length,
      areas: [...count].sort((former, latter) => latter[1] - former[1]).slice(0, 3),
      growing: mondayTime === last,
      since: these.length
        ? new Date(Math.min(...these.map((commit) => commit.day.valueOf())))
        : null,
    });
  }
  return result;
}

export function stump(list: Week[], center = 280, fit = 226) {
  const POINTS = 48;
  const rand = rng(hash("nenrin"));
  const phases = [rand() * 6.3, rand() * 6.3];
  const eccentricity = 0.16;
  const tiltAngle = 2.2;

  let totalRadius = 12;
  const raw = list.map((week) => (totalRadius += 4 + Math.sqrt(week.n) * 4.2));
  const scale = Math.min(1, fit / totalRadius);
  const outer = totalRadius * scale;
  let wobble: number[] = new Array(POINTS).fill(0);

  const reach = (angle: number, radius: number, wobbles: number[]) => {
    const position = ((((angle / (Math.PI * 2)) % 1) + 1) % 1) * POINTS;
    const i = Math.floor(position);
    const offset =
      wobbles[i % POINTS] + (wobbles[(i + 1) % POINTS] - wobbles[i % POINTS]) * (position - i);
    return (
      radius * (1 + eccentricity * Math.cos(angle - tiltAngle) * Math.min(1, radius / 120)) + offset
    );
  };

  const pointAt = (angle: number, distance: number) =>
    `${round1(center + Math.cos(angle) * distance)} ${round1(center + Math.sin(angle) * distance * 0.96)}`;

  const shape = (radius: number, wobbles: number[]) =>
    smooth(
      Array.from({ length: POINTS }, (_, i): [number, number] => {
        const angle = (i / POINTS) * Math.PI * 2;
        const distance = reach(angle, radius, wobbles);
        return [center + Math.cos(angle) * distance, center + Math.sin(angle) * distance * 0.96];
      }),
      true,
    );

  const grow = () =>
    wobble.map((value, i) => {
      const angle = (i / POINTS) * Math.PI * 2;
      return (
        value +
        (Math.sin(angle * 3 + phases[0]) * 0.6 +
          Math.sin(angle * 5 + phases[1]) * 0.4 +
          (rand() - 0.5) * 0.8) *
          scale
      );
    });

  const pith = shape(6 * scale, wobble);
  const rings = raw.map((radius) => {
    wobble = grow();
    return shape(radius * scale, wobble);
  });
  const barkWob = wobble.map((value) => value * 1.3);
  const bark = shape(outer + 16, barkWob);
  const rim = (angle: number, inset: number) => reach(angle, outer, wobble) + inset;

  let fissures = "";
  for (let fissure = 0; fissure < 30; fissure++) {
    const angle = (fissure / 30) * Math.PI * 2 + rand() * 0.1;
    const tip = Math.min(reach(angle, outer + 16, barkWob) - 1, rim(angle, 12 + rand() * 4));
    fissures += `M${pointAt(angle, rim(angle, 3))} L${pointAt(angle, tip)} `;
  }

  // drying check
  const crackAngle = 0.6;
  const crackWidth = 0.05;
  const crack = `M${pointAt(crackAngle - crackWidth, rim(crackAngle - crackWidth, 18))} L${pointAt(crackAngle - crackWidth * 0.4, rim(crackAngle, 0) * 0.75)} L${pointAt(crackAngle + 0.01, rim(crackAngle, 0) * 0.42)} L${pointAt(crackAngle + crackWidth * 0.3, rim(crackAngle, 0) * 0.75)} L${pointAt(crackAngle + crackWidth, rim(crackAngle + crackWidth, 18))} Z`;
  const gold = `M${pointAt(crackAngle, rim(crackAngle, 14))} L${pointAt(crackAngle - crackWidth * 0.1, rim(crackAngle, 0) * 0.75)} L${pointAt(crackAngle + 0.01, rim(crackAngle, 0) * 0.45)}`;

  return { pith, rings, bark, fissures: fissures.trim(), crack, gold };
}
