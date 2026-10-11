import { hash, rng, smooth } from "./stamp";

type Point = [number, number];

interface Wash {
  d: string;
  fill: string;
  o: number;
  stroke?: string;
  sw?: number;
}

const SH = 300;
const f1 = (n: number) => Math.round(n * 10) / 10;
const circle = (x: number, y: number, r: number) =>
  `M${f1(x - r)} ${f1(y)} a${f1(r)} ${f1(r)} 0 1 0 ${f1(2 * r)} 0 a${f1(r)} ${f1(r)} 0 1 0 ${f1(-2 * r)} 0`;
const ellipse = (x: number, y: number, rx: number, ry: number) =>
  `M${f1(x - rx)} ${f1(y)} a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(2 * rx)} 0 a${f1(rx)} ${f1(ry)} 0 1 0 ${f1(-2 * rx)} 0`;
const mix = (a: string, b: string, t: number) =>
  `color-mix(in srgb,${a},${b} ${Math.round(t * 100)}%)`;

const PAPER = "var(--paper)";
const INK = "var(--fg-main)";
const PALETTE = [
  "var(--red)",
  "var(--cursor)",
  "var(--tape)",
  "var(--sea)",
  "var(--leaf)",
  "var(--sky)",
  "var(--bg-region)",
  "var(--accent-0)",
  "var(--fg-link)",
  "var(--red-warmer)",
];

export function drawShiori(slug: string, terrain: string[]) {
  const r = rng(hash(slug + "/strip"));
  const t = new Set(terrain);
  const wc = (col: string, k?: number) => mix(col, PAPER, k ?? 0.18 + r() * 0.22);
  const P = PALETTE;
  const wash: Wash[] = [];
  const back: string[] = [];
  let white = "";
  let pencil = "";
  let win = "";
  const add = (d: string, fill: string, o = 0.88) => wash.push({ d, fill, o });
  const ln = (pts: Point[]) => "M" + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L") + " ";

  const line = (
    y: number,
    amp: number,
    rough: number,
    peak?: { x: number; h: number; w: number },
  ) => {
    let pts: Point[] = [
      [-2, y],
      [102, y],
    ];
    for (let l = 0; l < 4; l++) {
      const n: Point[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        n.push(pts[i], [
          (pts[i][0] + pts[i + 1][0]) / 2,
          (pts[i][1] + pts[i + 1][1]) / 2 + (r() - 0.5) * amp * Math.pow(rough, l),
        ]);
      }
      n.push(pts[pts.length - 1]);
      pts = n;
    }
    if (peak)
      pts = pts.map(([x, yy]) => [x, yy - peak.h * Math.exp(-Math.pow((x - peak.x) / peak.w, 2))]);
    return pts;
  };
  const down = (pts: Point[], y: number) => smooth(pts, false) + ` L102 ${y} L-2 ${y} Z`;

  // sky
  add(`M0 0 H100 V${SH} H0 Z`, wc("var(--sky)", 0.45), 0.75);
  for (let k = 0; k < 3; k++)
    back.push(ellipse(r() * 100, 10 + r() * 80, 16 + r() * 20, 6 + r() * 8));
  const sun = [18 + r() * 64, 22 + r() * 30];
  add(circle(sun[0], sun[1], 7 + r() * 3), wc("var(--red)", 0.3), 0.8);

  // row of facades standing on yb
  const town = (y0: number, y1: number, tiers: number, look: "white" | "roof" | "mixed") => {
    const th = (y1 - y0) / tiers;
    for (let ti = 0; ti < tiers; ti++) {
      const yb = y0 + (ti + 1) * th;
      let x = -4 - r() * 8;
      while (x < 102) {
        const w = (look === "white" ? 14 : 16) + r() * 16;
        const hh = th * (1.15 + r() * 0.6);
        const top = yb - hh;
        const gh = 5 + r() * 8;
        const g =
          look === "white"
            ? r() < 0.75
              ? "flat"
              : "dome"
            : look === "roof"
              ? r() < 0.7
                ? "roof"
                : "flat"
              : ["tri", "step", "bell", "flat", "tri", "step"][Math.floor(r() * 6)];
        const x1 = x + w;
        const yt = top + gh;
        let d;
        if (g === "tri")
          d = `M${f1(x)} ${f1(yt)} L${f1(x + w / 2)} ${f1(top)} L${f1(x1)} ${f1(yt)}`;
        else if (g === "step") {
          const s = w / 6;
          const sh = gh / 3;
          d = `M${f1(x)} ${f1(yt)} V${f1(yt - sh)} H${f1(x + s)} V${f1(yt - 2 * sh)} H${f1(x + 2 * s)} V${f1(top)} H${f1(x1 - 2 * s)} V${f1(yt - 2 * sh)} H${f1(x1 - s)} V${f1(yt - sh)} H${f1(x1)} V${f1(yt)}`;
        } else if (g === "bell")
          d = `M${f1(x)} ${f1(yt)} Q${f1(x + w * 0.12)} ${f1(top + gh * 0.15)} ${f1(x + w / 2)} ${f1(top)} Q${f1(x1 - w * 0.12)} ${f1(top + gh * 0.15)} ${f1(x1)} ${f1(yt)}`;
        else if (g === "dome")
          d = `M${f1(x)} ${f1(yt)} Q${f1(x + w / 2)} ${f1(top - gh * 0.4)} ${f1(x1)} ${f1(yt)}`;
        else d = `M${f1(x)} ${f1(yt - gh * 0.4)} H${f1(x1)}`;
        const body = `${d} L${f1(x1)} ${f1(yb)} L${f1(x)} ${f1(yb)} Z`;
        const col =
          look === "white"
            ? r() < 0.8
              ? mix(PAPER, "var(--tape)", 0.35)
              : wc(P[Math.floor(r() * P.length)], 0.45)
            : wc(P[Math.floor(r() * P.length)]);

        add(body, col, 0.92);
        wash.push({ d: body, fill: "none", o: 0.35, stroke: mix(col, INK, 0.3), sw: 0.7 });
        if (g === "roof")
          add(
            `M${f1(x - 1)} ${f1(yt)} L${f1(x + w / 2)} ${f1(top)} L${f1(x1 + 1)} ${f1(yt)} Z`,
            wc("var(--red)", 0.15),
            0.9,
          );
        white += body + " ";
        if (r() < 0.55) pencil += `M${f1(x + 0.4)} ${f1(yb)} L${f1(x + 0.3)} ${f1(yt + 0.5)} `;

        // windows
        const cols = w > 25 ? 3 : 2;
        const fl = Math.max(1, Math.floor((yb - yt - 5) / 9));
        for (let f = 0; f < fl; f++)
          for (let k = 0; k < cols; k++) {
            const wx = x + (w / (cols + 1)) * (k + 1) - 1.5;
            const wy = yt + 3.5 + f * 9;
            if (wy + 5 > yb - 2) continue;
            win += `M${f1(wx)} ${f1(wy)} h3 v${look === "white" ? 3.6 : 5} h-3 Z `;
          }
        if (g !== "flat" && g !== "roof") win += circle(x + w / 2, top + gh * 0.62, 1.2) + " ";
        if (ti === tiers - 1) win += `M${f1(x + w / 2 - 2)} ${f1(yb)} v-6 q2 -2.4 4 0 v6 Z `;
        x = x1;
      }
    }
  };

  const sea = (y0: number, y1: number) => {
    add(`M-2 ${f1(y0)} H102 V${f1(y1)} H-2 Z`, wc("var(--sea)", 0.1), 0.92);
    for (let y = y0 + 4; y < y1; y += 5 + r() * 3) {
      const x = r() * 80;
      pencil += `M${f1(x)} ${f1(y)} q3 -1.6 6 0 q3 1.6 6 0 `;
      if (r() < 0.6) white += `M${f1(r() * 90)} ${f1(y + 2)} h${f1(4 + r() * 8)} `;
    }
  };

  const palm = (x: number, yb: number, h: number) => {
    const tx = x + (r() - 0.5) * 10;
    const ty = yb - h;
    const trunk = `M${f1(x)} ${f1(yb)} Q${f1(x + 2)} ${f1(yb - h / 2)} ${f1(tx)} ${f1(ty)}`;
    pencil += trunk + " ";
    wash.push({ d: trunk, fill: "none", o: 0.9, stroke: wc("var(--red-warmer)", 0.3), sw: 2 });
    for (let k = 0; k < 7; k++) {
      const a = -Math.PI / 2 + (k / 6 - 0.5) * 3.2;
      const l = 12 + r() * 8;
      const ex = tx + Math.cos(a) * l;
      const ey = ty + Math.sin(a) * l * 0.7 + 6;
      const frond = `M${f1(tx)} ${f1(ty)} Q${f1(tx + Math.cos(a) * l * 0.6)} ${f1(ty + Math.sin(a) * l * 0.4 - 3)} ${f1(ex)} ${f1(ey)}`;
      wash.push({ d: frond, fill: "none", o: 0.85, stroke: wc("var(--leaf)", 0.05), sw: 2.6 });
      pencil += frond + " ";
    }
  };

  const birds = (y0: number, y1: number) => {
    for (let k = 0; k < 4; k++) {
      const x = 15 + r() * 70;
      const y = y0 + r() * (y1 - y0);
      const s = 2 + r() * 2;
      pencil += `M${f1(x - s)} ${f1(y - s * 0.5)} Q${f1(x - s * 0.4)} ${f1(y - s * 0.7)} ${f1(x)} ${f1(y)} Q${f1(x + s * 0.4)} ${f1(y - s * 0.7)} ${f1(x + s)} ${f1(y - s * 0.5)} `;
    }
  };

  const boat = (x: number, y: number) => {
    add(`M${f1(x)} ${f1(y)} h14 l-3 3.4 h-8 Z`, wc("var(--cursor)", 0.1), 0.95);
    pencil += `M${f1(x + 7)} ${f1(y)} V${f1(y - 13)} `;
    add(`M${f1(x + 7.6)} ${f1(y - 12)} L${f1(x + 13)} ${f1(y - 1)} H${f1(x + 7.6)} Z`, PAPER, 0.95);
  };

  if (t.has("mountains")) {
    const far = line(52 + r() * 10, 26, 0.55, { x: 25 + r() * 50, h: 22, w: 18 });
    add(down(far, 200), wc("var(--bg-region)", 0.2), 0.85);
    white += smooth(far, false) + " ";
    const near = line(92 + r() * 10, 18, 0.5);
    add(down(near, 200), wc("var(--leaf)", 0.05), 0.9);
    pencil += smooth(near, false) + " ";
  }
  if (t.has("rock")) {
    const rk = line(150, 18, 0.5, { x: 32 + r() * 22, h: 90 + r() * 15, w: 22 });
    add(down(rk, 250), wc("var(--bg-alt)", 0.05), 0.92);
    white += smooth(rk, false) + " ";
    for (let k = 0; k < 9; k++) {
      const y = 90 + k * 16 + r() * 6;
      pencil +=
        smooth(
          [
            [18 + r() * 10, y],
            [40, y + (r() - 0.5) * 5],
            [62 + r() * 12, y + (r() - 0.5) * 6],
          ],
          false,
        ) + " ";
    }

    add(down(line(196, 8, 0.4), 250), wc("var(--leaf)", 0.1), 0.8);
    const sh = rk.filter(([x]) => x > 40).map(([x, y]): Point => [x, y + 4]);

    add(smooth([[40, 250], ...sh], false) + " L102 250 Z", wc("var(--fg-dim)", 0.3), 0.3);
    for (let k = 0; k < 12; k++) {
      const x = 14 + r() * 70;
      const y = 110 + r() * 110;
      add(ellipse(x, y, 2 + r() * 3, 1.4 + r() * 1.6), wc("var(--leaf)", 0), 0.85);
    }
  }

  if (t.has("gorge")) {
    const wl: Point[] = [];
    const wr: Point[] = [];

    for (let y = -4; y <= SH + 4; y += 14) {
      wl.push([28 + r() * 10 + Math.sin(y / 40) * 4, y]);
      wr.push([62 + r() * 10 + Math.sin(y / 50) * 4, y]);
    }

    add(smooth(wl, false) + ` L-2 ${SH + 4} L-2 -4 Z`, wc("var(--cursor)", 0.35), 0.9);
    add(smooth(wr, false) + ` L102 ${SH + 4} L102 -4 Z`, wc("var(--accent-0)", 0.4), 0.9);
    white += smooth(wl, false) + " " + smooth(wr, false) + " ";

    for (let k = 0; k < 16; k++) {
      const y = 20 + r() * 230;
      const x = r() < 0.5 ? 2 + r() * 22 : 76 + r() * 22;
      add(ellipse(x, y, 2.4 + r() * 3, 1.6 + r() * 1.8), wc("var(--leaf)", 0), 0.9);
    }

    // far wall through the slot, behind both near walls
    wash.splice(2, 0, {
      d: down(line(70, 14, 0.5), 140),
      fill: wc("var(--bg-region)", 0.3),
      o: 0.55,
    });

    for (let k = 0; k < 14; k++) {
      const y = r() * SH;
      const x = r() < 0.5 ? r() * 26 : 74 + r() * 26;
      pencil += `M${f1(x)} ${f1(y)} l${f1(4 + r() * 6)} ${f1(1 + r() * 4)} `;
    }
  }

  if (t.has("cliff")) {
    const wpts: Point[] = [];
    for (let y = 118; y <= 262; y += 12) wpts.push([52 + r() * 10 + (y - 118) * 0.05, y]);
    const face = smooth(wpts, false) + " L102 262 L102 118 Z";
    add(face, wc("var(--tape)", 0.05), 0.92);
    add(face, wc("var(--cursor)", 0.5), 0.35);
    white += smooth(wpts, false) + " ";
    for (let k = 0; k < 10; k++) {
      const y = 124 + k * 13;
      pencil += `M${f1(66 + r() * 10)} ${f1(y)} l${f1(10 + r() * 14)} ${f1((r() - 0.5) * 3)} `;
    }
    town(60, 120, 2, "white");
  }

  // lower half
  if (t.has("city")) {
    town(70, 262, 4, "mixed");
    sea(262, SH + 2);
  } else if (t.has("bay")) {
    sea(120, 205);
    boat(14 + r() * 50, 170 + r() * 20);
    town(195, SH + 2, 3, "roof");
  } else if (t.has("cliff")) sea(150, SH + 2);
  else if (t.has("rock")) sea(246, SH + 2);
  else if (t.has("river")) {
    const rv = line(268, 4, 0.4);
    add(down(rv, SH + 2), wc("var(--sea)", 0.05), 0.95);
    pencil += smooth(rv, false) + " ";
  } else if (t.has("sea") || t.has("coast")) sea(220, SH + 2);

  if (t.has("beach")) {
    const b = line(272, 6, 0.4);
    add(down(b, SH + 2), wc("var(--tape)", 0.05), 0.95);
    white += smooth(b, false) + " ";
  }

  if (t.has("walkway")) {
    // boardwalk pinned along left wall
    const wk: Point[] = [];
    let y = 120 + r() * 20;
    for (let x = 18; x < 48; x += 6) {
      wk.push([x, y]);
      y += (r() - 0.35) * 5;
    }
    white += ln(wk);
    pencil += ln(wk) + ln(wk.map(([x, yy]) => [x, yy + 2.4]));
    for (const [x, yy] of wk) pencil += `M${f1(x)} ${f1(yy + 2.4)} l-2.4 5 `;
  }

  if (t.has("palm")) palm(12 + r() * 16, SH + 2, 120 + r() * 30);
  if (t.has("birds")) birds(28, 70);
  if (t.has("boat") && !t.has("bay")) boat(20 + r() * 50, 250);

  // washes through one displacement filter
  const id = hash(slug).toString(36);
  const noise = hash(slug) % 997;
  const paths = wash
    .map(
      (w) =>
        `<path d="${w.d}" style="fill:${w.fill};stroke:${w.stroke ?? "none"}"${w.sw ? ` stroke-width="${w.sw}"` : ""} opacity="${w.o}"/>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${SH}">` +
    `<defs>` +
    `<filter id="wc-${id}" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="${noise}"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter>` +
    `<filter id="pn-${id}"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="${noise}"/><feDisplacementMap in="SourceGraphic" scale="0.9"/></filter>` +
    `<filter id="gr-${id}"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${noise}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.05"/></filter>` +
    `<filter id="bb-${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>` +
    `<clipPath id="sk-${id}"><rect width="100" height="${SH}"/></clipPath>` +
    `</defs>` +
    `<g clip-path="url(#sk-${id})">` +
    `<g class="shiori-wash" filter="url(#wc-${id})">${paths}</g>` +
    back.map((d) => `<path class="shiori-mist" d="${d}" filter="url(#bb-${id})"/>`).join("") +
    `<path class="shiori-white" d="${white}" filter="url(#wc-${id})"/>` +
    `<path class="shiori-windows" d="${win || "M0 0"}" filter="url(#pn-${id})"/>` +
    `<path class="shiori-pencil" d="${pencil || "M0 0"}" filter="url(#pn-${id})"/>` +
    `<rect class="shiori-grain" width="100" height="${SH}" filter="url(#gr-${id})"/>` +
    `</g></svg>`
  );
}

export const shioriUrl = (slug: string) => `/art/shiori/${slug}.svg`;
