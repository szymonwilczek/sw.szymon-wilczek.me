import { readFileSync } from "node:fs";
import { hash, rng } from "./stamp";

export type Stage = "seed" | "sprout" | "leaf" | "bloom";

export const STAGES: Record<Stage, { kanji: string; word: string; name: string }> = {
  seed: { kanji: "種", word: "IDEA", name: "a seed" },
  sprout: { kanji: "芽", word: "NOTES", name: "a sprout" },
  leaf: { kanji: "葉", word: "DRAFT", name: "in leaf" },
  bloom: { kanji: "花", word: "DONE", name: "in flower" },
};

const KEYWORDS: Record<string, Stage> = {
  IDEA: "seed",
  NOTES: "sprout",
  DRAFT: "leaf",
  DONE: "bloom",
};

export interface Seed {
  id: string;
  title: string;
  stage: Stage;
  sown: Date | null;
  writing: string | null;
  note: string | null;
}

const round1 = (value: number) => Math.round(value * 10) / 10;

const orgDate = (value: string | undefined) => {
  const parts = value?.match(/(\d{4})-(\d{2})-(\d{2})/);
  return parts ? new Date(Date.UTC(+parts[1], +parts[2] - 1, +parts[3])) : null;
};

export function readSeeds(file = "src/data/seeds.org"): Seed[] {
  const text = readFileSync(file, "utf8");
  return text
    .split(/^\* /m)
    .slice(1)
    .map((entry, i) => {
      const [head, ...rest] = entry.split("\n");
      const [, keyword, title] = head.trim().match(/^(?:([A-Z]+)\s+)?(.*)$/) ?? [];
      const props: Record<string, string> = {};
      for (const [, key, value] of entry.matchAll(/^:([A-Z]+):[ \t]*(.*)$/gm))
        props[key] = value.trim();
      const note =
        rest
          .join("\n")
          .replace(/:PROPERTIES:[\s\S]*?:END:/, "")
          .replace(/^#.*$/gm, "")
          .trim() || null;
      return {
        id: `s${i}`,
        title: (title ?? "").trim(),
        stage: KEYWORDS[keyword ?? ""] ?? "seed",
        sown: orgDate(props.SOWN),
        writing: props.WRITING || null,
        note,
      } satisfies Seed;
    });
}

interface Mark {
  d: string;
  tone?: "earth" | "husk" | "leaf" | "petal";
  bare?: boolean;
  w?: number;
  gold?: boolean;
}

export function plant(stage: Stage, seed: string) {
  const rand = rng(hash(`plant/${seed}`));
  const lean = (rand() - 0.5) * 6;
  const forms: Mark[] = [];
  const lines: Mark[] = [];
  const form = (path: string, tone: Mark["tone"], bare = false) =>
    forms.push({ d: path, tone, bare });
  const line = (path: string, width = 1.4) => lines.push({ d: path, w: width });
  const leafPair = (y: number, size: number, tilt: number) => {
    const x = 50 + (lean * (90 - y)) / 60;
    form(
      `M${round1(x)} ${y} C ${round1(x - size * 0.5)} ${round1(y - size * 0.55 - tilt)}, ${round1(x - size * 1.1)} ${round1(y - size * 0.4 - tilt)}, ${round1(x - size * 1.25)} ${round1(y - tilt)} C ${round1(x - size * 0.8)} ${round1(y + size * 0.25 - tilt)}, ${round1(x - size * 0.35)} ${round1(y + size * 0.2)}, ${round1(x)} ${y} Z`,
      "leaf",
    );
    form(
      `M${round1(x)} ${y} C ${round1(x + size * 0.45)} ${round1(y - size * 0.65 + tilt)}, ${round1(x + size * 1.05)} ${round1(y - size * 0.6 + tilt)}, ${round1(x + size * 1.2)} ${round1(y - size * 0.2 + tilt)} C ${round1(x + size * 0.8)} ${round1(y + size * 0.15)}, ${round1(x + size * 0.35)} ${round1(y + size * 0.15)}, ${round1(x)} ${y} Z`,
      "leaf",
    );
    line(
      `M${round1(x - size * 0.15)} ${round1(y - size * 0.05)} C ${round1(x - size * 0.5)} ${round1(y - size * 0.2 - tilt)}, ${round1(x - size * 0.8)} ${round1(y - size * 0.15 - tilt)}, ${round1(x - size * 1.05)} ${round1(y - tilt * 0.9)}`,
      0.7,
    );
    line(
      `M${round1(x + size * 0.15)} ${round1(y - size * 0.08)} C ${round1(x + size * 0.45)} ${round1(y - size * 0.3 + tilt)}, ${round1(x + size * 0.75)} ${round1(y - size * 0.3 + tilt)}, ${round1(x + size * 1)} ${round1(y - size * 0.2 + tilt)}`,
      0.7,
    );
  };

  // the soil it sits in
  form("M16 91 C 30 86.5, 70 86.5, 84 91 C 70 94.5, 30 94.5, 16 91 Z", "earth", true);
  line("M20 90.4 C 30 88.2, 40 87.6, 47 87.8 M 54 87.8 C 62 88, 72 88.6, 80 90.6", 1);
  line("M30 92.6 l 1.6 0 M 64 92.8 l 1.4 0 M 41 93.4 l 1 0", 0.9);

  if (stage === "seed") {
    form("M44.4 87.6 C 43.4 83, 47.4 79.4, 52.4 80.2 C 57 81, 58.4 85.4, 56.6 88 Z", "husk");
    line("M47.6 84 C 49.6 82.2, 52.4 82, 54.4 83.4", 0.7);
    line("M50.6 88.4 C 50 90.4, 51.2 91.6, 50.4 93.2", 0.6);
    return { forms, lines };
  }

  const tipY = { sprout: 62, leaf: 34, bloom: 37 }[stage];
  const tipX = 50 + lean;
  line(
    `M50 89 C ${round1(50 - lean * 0.3)} ${round1(89 - (89 - tipY) * 0.4)}, ${round1(tipX - lean * 0.2)} ${round1(tipY + (89 - tipY) * 0.3)}, ${round1(tipX)} ${tipY}`,
    1.6,
  );
  if (stage === "sprout") {
    form("M45.6 88 C 45 85.4, 47.6 84, 50 84.6 C 46.6 85.6, 46.4 87, 45.6 88 Z", "husk");
    leafPair(tipY, 13, 2);
    return { forms, lines };
  }

  leafPair(72, 15, 3);
  leafPair(55, 12, -2);
  if (stage === "leaf") {
    leafPair(42, 8, 1);
    form(
      `M${round1(tipX - 2.6)} ${tipY + 2} C ${round1(tipX - 2.6)} ${tipY - 3}, ${round1(tipX)} ${tipY - 6}, ${round1(tipX + 0.4)} ${tipY - 6} C ${round1(tipX + 2.8)} ${tipY - 3}, ${round1(tipX + 2.4)} ${tipY + 1}, ${round1(tipX - 2.6)} ${tipY + 2} Z`,
      "leaf",
    );
    return { forms, lines };
  }

  // ume blossom
  const centerX = tipX;
  const centerY = tipY - 10;
  const turn = rand() * 0.3;
  const notch = (petal: number) => {
    const angle = -Math.PI / 2 + turn + ((petal + 0.5) * 2 * Math.PI) / 5;
    return `${round1(centerX + Math.cos(angle) * 4.6)} ${round1(centerY + Math.sin(angle) * 4.6)}`;
  };
  let flower = `M${notch(4)}`;
  for (let petal = 0; petal < 5; petal++) flower += ` A5 5 0 1 1 ${notch(petal)}`;
  form(`${flower} Z`, "petal");
  lines.push({
    d: `M${round1(centerX - 1.6)} ${round1(centerY)} a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 Z`,
    gold: true,
  });
  line(
    `M${round1(centerX)} ${round1(centerY)} l -2.4 -3.4 M ${round1(centerX)} ${round1(centerY)} l 3 -2.6 M ${round1(centerX)} ${round1(centerY)} l 0.4 3.8 M ${round1(centerX)} ${round1(centerY)} l -3.4 1.6 M ${round1(centerX)} ${round1(centerY)} l 3.2 1.8`,
    0.5,
  );
  return { forms, lines };
}

const PAPERS = ["--tape", "--sky", "--leaf", "--sea"];

export function packet(seed: Seed) {
  const rand = rng(hash(`packet/${seed.id}/${seed.title}`));
  return {
    paper: PAPERS[Math.floor(rand() * PAPERS.length)],
    rot: round1((rand() - 0.5) * 3.2),
    slipRot: round1((rand() - 0.5) * 4),
  };
}
