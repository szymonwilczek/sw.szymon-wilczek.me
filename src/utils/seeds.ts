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

const f1 = (n: number) => Math.round(n * 10) / 10;

const orgDate = (value: string | undefined) => {
  const m = value?.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
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
  const r = rng(hash(`plant/${seed}`));
  const lean = (r() - 0.5) * 6;
  const forms: Mark[] = [];
  const lines: Mark[] = [];
  const form = (d: string, tone: Mark["tone"], bare = false) => forms.push({ d, tone, bare });
  const line = (d: string, w = 1.4) => lines.push({ d, w });
  const leafPair = (y: number, size: number, tilt: number) => {
    const x = 50 + (lean * (90 - y)) / 60;
    form(
      `M${f1(x)} ${y} C ${f1(x - size * 0.5)} ${f1(y - size * 0.55 - tilt)}, ${f1(x - size * 1.1)} ${f1(y - size * 0.4 - tilt)}, ${f1(x - size * 1.25)} ${f1(y - tilt)} C ${f1(x - size * 0.8)} ${f1(y + size * 0.25 - tilt)}, ${f1(x - size * 0.35)} ${f1(y + size * 0.2)}, ${f1(x)} ${y} Z`,
      "leaf",
    );
    form(
      `M${f1(x)} ${y} C ${f1(x + size * 0.45)} ${f1(y - size * 0.65 + tilt)}, ${f1(x + size * 1.05)} ${f1(y - size * 0.6 + tilt)}, ${f1(x + size * 1.2)} ${f1(y - size * 0.2 + tilt)} C ${f1(x + size * 0.8)} ${f1(y + size * 0.15)}, ${f1(x + size * 0.35)} ${f1(y + size * 0.15)}, ${f1(x)} ${y} Z`,
      "leaf",
    );
    line(
      `M${f1(x - size * 0.15)} ${f1(y - size * 0.05)} C ${f1(x - size * 0.5)} ${f1(y - size * 0.2 - tilt)}, ${f1(x - size * 0.8)} ${f1(y - size * 0.15 - tilt)}, ${f1(x - size * 1.05)} ${f1(y - tilt * 0.9)}`,
      0.7,
    );
    line(
      `M${f1(x + size * 0.15)} ${f1(y - size * 0.08)} C ${f1(x + size * 0.45)} ${f1(y - size * 0.3 + tilt)}, ${f1(x + size * 0.75)} ${f1(y - size * 0.3 + tilt)}, ${f1(x + size * 1)} ${f1(y - size * 0.2 + tilt)}`,
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

  const top = { sprout: 62, leaf: 34, bloom: 37 }[stage];
  const tipX = 50 + lean;
  line(
    `M50 89 C ${f1(50 - lean * 0.3)} ${f1(89 - (89 - top) * 0.4)}, ${f1(tipX - lean * 0.2)} ${f1(top + (89 - top) * 0.3)}, ${f1(tipX)} ${top}`,
    1.6,
  );
  if (stage === "sprout") {
    form("M45.6 88 C 45 85.4, 47.6 84, 50 84.6 C 46.6 85.6, 46.4 87, 45.6 88 Z", "husk");
    leafPair(top, 13, 2);
    return { forms, lines };
  }

  leafPair(72, 15, 3);
  leafPair(55, 12, -2);
  if (stage === "leaf") {
    leafPair(42, 8, 1);
    form(
      `M${f1(tipX - 2.6)} ${top + 2} C ${f1(tipX - 2.6)} ${top - 3}, ${f1(tipX)} ${top - 6}, ${f1(tipX + 0.4)} ${top - 6} C ${f1(tipX + 2.8)} ${top - 3}, ${f1(tipX + 2.4)} ${top + 1}, ${f1(tipX - 2.6)} ${top + 2} Z`,
      "leaf",
    );
    return { forms, lines };
  }

  // ume blossom
  const cx = tipX;
  const cy = top - 10;
  const turn = r() * 0.3;
  const notch = (k: number) => {
    const a = -Math.PI / 2 + turn + ((k + 0.5) * 2 * Math.PI) / 5;
    return `${f1(cx + Math.cos(a) * 4.6)} ${f1(cy + Math.sin(a) * 4.6)}`;
  };
  let flower = `M${notch(4)}`;
  for (let k = 0; k < 5; k++) flower += ` A5 5 0 1 1 ${notch(k)}`;
  form(`${flower} Z`, "petal");
  lines.push({
    d: `M${f1(cx - 1.6)} ${f1(cy)} a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 Z`,
    gold: true,
  });
  line(
    `M${f1(cx)} ${f1(cy)} l -2.4 -3.4 M ${f1(cx)} ${f1(cy)} l 3 -2.6 M ${f1(cx)} ${f1(cy)} l 0.4 3.8 M ${f1(cx)} ${f1(cy)} l -3.4 1.6 M ${f1(cx)} ${f1(cy)} l 3.2 1.8`,
    0.5,
  );
  return { forms, lines };
}

const PAPERS = ["--tape", "--sky", "--leaf", "--sea"];

export function packet(seed: Seed) {
  const r = rng(hash(`packet/${seed.id}/${seed.title}`));
  return {
    paper: PAPERS[Math.floor(r() * PAPERS.length)],
    rot: f1((r() - 0.5) * 3.2),
    slipRot: f1((r() - 0.5) * 4),
  };
}
