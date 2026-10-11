import { hash, rng, smooth } from "./stamp";

export interface Tool {
  id: string;
  kanji: string;
  name: string;
  as: string;
  why: string;
}

const WHY = "[WHY I KEEP IT · SINCE WHEN]";
export const TOOLS: Tool[] = [
  { id: "bowl", kanji: "碗", name: "Emacs", as: "chawan, the tea bowl", why: WHY },
  { id: "caddy", kanji: "棗", name: "Org", as: "natsume, the lacquer caddy", why: WHY },
  { id: "scoop", kanji: "杓", name: "Typus Mono 95", as: "chashaku, the bamboo scoop", why: WHY },
  { id: "whisk", kanji: "筅", name: "[KEYBOARD]", as: "chasen, the whisk", why: WHY },
  { id: "water", kanji: "建", name: "[OS]", as: "kensui, the water bowl", why: WHY },
  { id: "rest", kanji: "蓋", name: "Astro", as: "futaoki, the lid rest", why: WHY },
  { id: "cloth", kanji: "巾", name: "au-themes", as: "chakin, the linen cloth", why: WHY },
  { id: "silk", kanji: "袱", name: "[TERMINAL]", as: "fukusa, the silk square", why: WHY },
];

export interface Part {
  d: string;
  fill: string;
  stroke: string;
  sw: number;
  o: number;
  filter?: string;
}

const f1 = (n: number) => Math.round(n * 10) / 10;

const P = (d: string, fill: string, stroke = "var(--fg-main)", sw = 1, o = 1, filter?: string) => ({
  d,
  fill,
  stroke,
  sw,
  o,
  filter,
});

export function tray(tools: Tool[] = TOOLS) {
  const r = rng(hash("dogu"));
  const blob = (rx: number, ry: number, n: number, j: number, cx = 0, cy = 0) =>
    smooth(
      Array.from({ length: n }, (_, i): [number, number] => {
        const a = (i / n) * Math.PI * 2;
        const k = 1 + (r() - 0.5) * j;
        return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k];
      }),
      true,
    );

  let tines = "";
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * Math.PI * 2;
    tines += `M${f1(Math.cos(a) * 13)} ${f1(Math.sin(a) * 13)} L${f1(Math.cos(a + 0.05) * 40)} ${f1(Math.sin(a + 0.05) * 40)} `;
  }

  const bowl = blob(122, 118, 14, 0.06);
  const caddy = blob(54, 54, 10, 0.02);
  const scoop = "M-130 -6 C -40 -8, 60 -7, 120 -6 C 134 -6, 140 2, 132 8 C 60 8, -40 7, -130 6 Z";
  const whisk = blob(42, 42, 10, 0.04);
  const water = blob(72, 70, 12, 0.04);
  const rest = blob(28, 28, 8, 0.02);

  // where each piece sits, how it is turned, its outline (for the shadow) and its drawing
  const layout: Record<
    string,
    { x: number; y: number; rot: number; outline: string; parts: Part[] }
  > = {
    bowl: {
      x: 300,
      y: 280,
      rot: 0,
      outline: bowl,
      parts: [
        P(bowl, "url(#dg-glaze)", undefined, 1.2, 1, "url(#dg-wob)"),
        P(blob(100, 96, 12, 0.08), "none", "var(--glaze-rim)", 1, 0.5),
        P(blob(48, 44, 9, 0.18, 10, 8), "var(--glaze-pool)", "none", 0, 0.5),

        // the kintsugi seam
        P(
          "M-58 -100 C -50 -80, -66 -64, -48 -46 C -36 -34, -44 -18, -30 -6",
          "none",
          "var(--cursor)",
          3.2,
        ),

        P("M-48 -46 C -60 -40, -72 -42, -82 -30", "none", "var(--cursor)", 2.2),
        P("M60 -40 c 10 6, 14 18, 10 30 c -2 8, 4 16, 2 26", "none", "var(--glaze-run)", 5, 0.35),
      ],
    },
    caddy: {
      x: 590,
      y: 160,
      rot: 0,
      outline: caddy,
      parts: [
        P(caddy, "url(#dg-lac)"),
        P(blob(44, 44, 10, 0.02), "none", "var(--paper)", 0.8, 0.35),
        P("M-30 -26 C -20 -38, 0 -42, 14 -38", "none", "var(--paper)", 3, 0.4),
      ],
    },
    scoop: {
      x: 640,
      y: 330,
      rot: -16,
      outline: scoop,
      parts: [
        P(scoop, "var(--bamboo)", "var(--bamboo-dk)"),
        P(
          "M-10 -7 C -8 -2, -8 3, -10 7 M -4 -7 C -2 -2, -2 3, -4 7",
          "none",
          "var(--bamboo-dk)",
          1.2,
        ),
        P("M-120 -1 C -40 -2, 40 -1, 116 0", "none", "var(--paper)", 1, 0.4),
      ],
    },
    whisk: {
      x: 820,
      y: 200,
      rot: 8,
      outline: whisk,
      parts: [
        P(blob(42, 42, 12, 0.08), "var(--bamboo-pale)", "none", 0, 0.6),
        P(tines.trim(), "none", "var(--bamboo-dk)", 0.9, 0.9),
        P(blob(13, 13, 8, 0.05), "var(--bamboo)", "var(--bamboo-dk)"),
      ],
    },
    water: {
      x: 820,
      y: 440,
      rot: 0,
      outline: water,
      parts: [
        P(water, "var(--bronze)"),
        P(blob(58, 56, 12, 0.05), "var(--bronze-deep)", "none", 0),
        P(
          `${blob(12, 9, 6, 0.3, 30, -20)} ${blob(9, 7, 6, 0.3, -24, 26)}`,
          "var(--sea)",
          "none",
          0,
          0.45,
        ),
      ],
    },
    rest: {
      x: 530,
      y: 480,
      rot: 0,
      outline: rest,
      parts: [
        P(blob(28, 28, 8, 0.03), "var(--bamboo)", "var(--bamboo-dk)"),
        P(blob(20, 20, 8, 0.03), "var(--bamboo-deep)", "var(--bamboo-dk)", 0.8),
      ],
    },
    cloth: {
      x: 180,
      y: 488,
      rot: -4,
      outline: "M-60 -26 L 60 -24 L 58 26 L -58 24 Z",
      parts: [
        P(
          "M-60 -26 C -20 -27, 20 -23, 60 -24 L 58 26 C 20 27, -20 23, -58 24 Z",
          "var(--paper)",
          "var(--fg-dim)",
        ),
        P(
          "M-20 -26 L -18 24 M 22 -24 L 20 26 M -60 0 C -20 2, 20 -2, 60 0",
          "none",
          "var(--fg-dim)",
          0.6,
          0.5,
        ),
      ],
    },
    silk: {
      x: 140,
      y: 150,
      rot: 12,
      outline: "M-46 -46 L 46 -46 L 46 46 L -46 46 Z",
      parts: [
        P(
          "M-46 -46 C -10 -48, 20 -44, 46 -46 C 48 -10, 44 20, 46 46 C 10 48, -20 44, -46 46 C -48 10, -44 -20, -46 -46 Z",
          "var(--red)",
          "var(--silk-dk)",
        ),
        P("M-46 -46 L 46 46", "none", "var(--silk-dk)", 1, 0.6),
        P("M-46 -46 C -10 -40, 20 -20, 46 46 L -46 46 Z", "var(--silk-fold)", "none", 0, 0.5),
      ],
    },
  };

  const edge = smooth(
    [
      [40, 50],
      [500, 40],
      [960, 52],
      [968, 300],
      [958, 560],
      [500, 568],
      [38, 556],
      [32, 300],
    ],
    true,
  );
  const floor = smooth(
    [
      [64, 74],
      [500, 64],
      [936, 76],
      [942, 300],
      [934, 536],
      [500, 544],
      [62, 532],
      [56, 300],
    ],
    true,
  );
  let grain = "";
  for (let k = 0; k < 9; k++) {
    const y = 110 + k * 50 + r() * 20;
    grain += `M${f1(70 + r() * 60)} ${f1(y)} C ${f1(300 + r() * 80)} ${f1(y + (r() - 0.5) * 14)}, ${f1(620 + r() * 80)} ${f1(y + (r() - 0.5) * 14)}, ${f1(880 + r() * 40)} ${f1(y)} `;
  }

  return {
    edge,
    floor,
    grain: grain.trim(),
    pieces: tools.map((tool) => {
      const at = layout[tool.id];
      const tr = rng(hash(tool.id));
      return {
        ...tool,
        ...at,
        tag: { x: Math.min(at.x + 40, 770), y: at.y - 40, rot: f1((tr() - 0.5) * 6) },
      };
    }),
  };
}
