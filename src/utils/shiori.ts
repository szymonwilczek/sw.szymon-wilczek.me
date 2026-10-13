import { hash, rng, smooth } from "./stamp";

type Point = [number, number];

interface Wash {
  d: string;
  fill: string;
  o: number;
  stroke?: string;
  sw?: number;
}

const STRIP_HEIGHT = 300;
const round1 = (value: number) => Math.round(value * 10) / 10;
const circle = (x: number, y: number, radius: number) =>
  `M${round1(x - radius)} ${round1(y)} a${round1(radius)} ${round1(radius)} 0 1 0 ${round1(2 * radius)} 0 a${round1(radius)} ${round1(radius)} 0 1 0 ${round1(-2 * radius)} 0`;
const ellipse = (x: number, y: number, rx: number, ry: number) =>
  `M${round1(x - rx)} ${round1(y)} a${round1(rx)} ${round1(ry)} 0 1 0 ${round1(2 * rx)} 0 a${round1(rx)} ${round1(ry)} 0 1 0 ${round1(-2 * rx)} 0`;
const mix = (from: string, into: string, share: number) =>
  `color-mix(in srgb,${from},${into} ${Math.round(share * 100)}%)`;

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
  const rand = rng(hash(slug + "/strip"));
  const features = new Set(terrain);
  const watercolour = (colour: string, paperShare?: number) =>
    mix(colour, PAPER, paperShare ?? 0.18 + rand() * 0.22);
  const palette = PALETTE;
  const wash: Wash[] = [];
  const back: string[] = [];
  let white = "";
  let pencil = "";
  let windows = "";
  const add = (path: string, fill: string, opacity = 0.88) =>
    wash.push({ d: path, fill, o: opacity });
  const polyline = (points: Point[]) =>
    "M" + points.map(([x, y]) => `${round1(x)} ${round1(y)}`).join(" L") + " ";

  const line = (
    y: number,
    wobble: number,
    rough: number,
    peak?: { x: number; h: number; w: number },
  ) => {
    let points: Point[] = [
      [-2, y],
      [102, y],
    ];
    for (let level = 0; level < 4; level++) {
      const refined: Point[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        refined.push(points[i], [
          (points[i][0] + points[i + 1][0]) / 2,
          (points[i][1] + points[i + 1][1]) / 2 + (rand() - 0.5) * wobble * Math.pow(rough, level),
        ]);
      }
      refined.push(points[points.length - 1]);
      points = refined;
    }
    if (peak)
      points = points.map(([x, pointY]) => [
        x,
        pointY - peak.h * Math.exp(-Math.pow((x - peak.x) / peak.w, 2)),
      ]);
    return points;
  };
  const down = (points: Point[], y: number) => smooth(points, false) + ` L102 ${y} L-2 ${y} Z`;

  // sky
  add(`M0 0 H100 V${STRIP_HEIGHT} H0 Z`, watercolour("var(--sky)", 0.45), 0.75);
  for (let cloud = 0; cloud < 3; cloud++)
    back.push(ellipse(rand() * 100, 10 + rand() * 80, 16 + rand() * 20, 6 + rand() * 8));
  const sun = [18 + rand() * 64, 22 + rand() * 30];
  add(circle(sun[0], sun[1], 7 + rand() * 3), watercolour("var(--red)", 0.3), 0.8);

  // row of facades standing on yb
  const town = (
    rowTop: number,
    rowBottom: number,
    tiers: number,
    style: "white" | "roof" | "mixed",
  ) => {
    const tierHeight = (rowBottom - rowTop) / tiers;
    for (let tier = 0; tier < tiers; tier++) {
      const baseY = rowTop + (tier + 1) * tierHeight;
      let x = -4 - rand() * 8;
      while (x < 102) {
        const width = (style === "white" ? 14 : 16) + rand() * 16;
        const height = tierHeight * (1.15 + rand() * 0.6);
        const top = baseY - height;
        const gableHeight = 5 + rand() * 8;
        const gable =
          style === "white"
            ? rand() < 0.75
              ? "flat"
              : "dome"
            : style === "roof"
              ? rand() < 0.7
                ? "roof"
                : "flat"
              : ["tri", "step", "bell", "flat", "tri", "step"][Math.floor(rand() * 6)];
        const right = x + width;
        const eaveY = top + gableHeight;
        let outline;
        if (gable === "tri")
          outline = `M${round1(x)} ${round1(eaveY)} L${round1(x + width / 2)} ${round1(top)} L${round1(right)} ${round1(eaveY)}`;
        else if (gable === "step") {
          const stepWidth = width / 6;
          const stepHeight = gableHeight / 3;
          outline = `M${round1(x)} ${round1(eaveY)} V${round1(eaveY - stepHeight)} H${round1(x + stepWidth)} V${round1(eaveY - 2 * stepHeight)} H${round1(x + 2 * stepWidth)} V${round1(top)} H${round1(right - 2 * stepWidth)} V${round1(eaveY - 2 * stepHeight)} H${round1(right - stepWidth)} V${round1(eaveY - stepHeight)} H${round1(right)} V${round1(eaveY)}`;
        } else if (gable === "bell")
          outline = `M${round1(x)} ${round1(eaveY)} Q${round1(x + width * 0.12)} ${round1(top + gableHeight * 0.15)} ${round1(x + width / 2)} ${round1(top)} Q${round1(right - width * 0.12)} ${round1(top + gableHeight * 0.15)} ${round1(right)} ${round1(eaveY)}`;
        else if (gable === "dome")
          outline = `M${round1(x)} ${round1(eaveY)} Q${round1(x + width / 2)} ${round1(top - gableHeight * 0.4)} ${round1(right)} ${round1(eaveY)}`;
        else outline = `M${round1(x)} ${round1(eaveY - gableHeight * 0.4)} H${round1(right)}`;
        const body = `${outline} L${round1(right)} ${round1(baseY)} L${round1(x)} ${round1(baseY)} Z`;
        const colour =
          style === "white"
            ? rand() < 0.8
              ? mix(PAPER, "var(--tape)", 0.35)
              : watercolour(palette[Math.floor(rand() * palette.length)], 0.45)
            : watercolour(palette[Math.floor(rand() * palette.length)]);

        add(body, colour, 0.92);
        wash.push({ d: body, fill: "none", o: 0.35, stroke: mix(colour, INK, 0.3), sw: 0.7 });
        if (gable === "roof")
          add(
            `M${round1(x - 1)} ${round1(eaveY)} L${round1(x + width / 2)} ${round1(top)} L${round1(right + 1)} ${round1(eaveY)} Z`,
            watercolour("var(--red)", 0.15),
            0.9,
          );
        white += body + " ";
        if (rand() < 0.55)
          pencil += `M${round1(x + 0.4)} ${round1(baseY)} L${round1(x + 0.3)} ${round1(eaveY + 0.5)} `;

        // windows
        const columns = width > 25 ? 3 : 2;
        const floors = Math.max(1, Math.floor((baseY - eaveY - 5) / 9));
        for (let floor = 0; floor < floors; floor++)
          for (let column = 0; column < columns; column++) {
            const windowX = x + (width / (columns + 1)) * (column + 1) - 1.5;
            const windowY = eaveY + 3.5 + floor * 9;
            if (windowY + 5 > baseY - 2) continue;
            windows += `M${round1(windowX)} ${round1(windowY)} h3 v${style === "white" ? 3.6 : 5} h-3 Z `;
          }
        if (gable !== "flat" && gable !== "roof")
          windows += circle(x + width / 2, top + gableHeight * 0.62, 1.2) + " ";
        if (tier === tiers - 1)
          windows += `M${round1(x + width / 2 - 2)} ${round1(baseY)} v-6 q2 -2.4 4 0 v6 Z `;
        x = right;
      }
    }
  };

  const sea = (top: number, bottom: number) => {
    add(`M-2 ${round1(top)} H102 V${round1(bottom)} H-2 Z`, watercolour("var(--sea)", 0.1), 0.92);
    for (let y = top + 4; y < bottom; y += 5 + rand() * 3) {
      const x = rand() * 80;
      pencil += `M${round1(x)} ${round1(y)} q3 -1.6 6 0 q3 1.6 6 0 `;
      if (rand() < 0.6)
        white += `M${round1(rand() * 90)} ${round1(y + 2)} h${round1(4 + rand() * 8)} `;
    }
  };

  const palm = (x: number, baseY: number, height: number) => {
    const crownX = x + (rand() - 0.5) * 10;
    const crownY = baseY - height;
    const trunk = `M${round1(x)} ${round1(baseY)} Q${round1(x + 2)} ${round1(baseY - height / 2)} ${round1(crownX)} ${round1(crownY)}`;
    pencil += trunk + " ";
    wash.push({
      d: trunk,
      fill: "none",
      o: 0.9,
      stroke: watercolour("var(--red-warmer)", 0.3),
      sw: 2,
    });
    for (let leaf = 0; leaf < 7; leaf++) {
      const angle = -Math.PI / 2 + (leaf / 6 - 0.5) * 3.2;
      const length = 12 + rand() * 8;
      const tipX = crownX + Math.cos(angle) * length;
      const tipY = crownY + Math.sin(angle) * length * 0.7 + 6;
      const frond = `M${round1(crownX)} ${round1(crownY)} Q${round1(crownX + Math.cos(angle) * length * 0.6)} ${round1(crownY + Math.sin(angle) * length * 0.4 - 3)} ${round1(tipX)} ${round1(tipY)}`;
      wash.push({
        d: frond,
        fill: "none",
        o: 0.85,
        stroke: watercolour("var(--leaf)", 0.05),
        sw: 2.6,
      });
      pencil += frond + " ";
    }
  };

  const birds = (top: number, bottom: number) => {
    for (let bird = 0; bird < 4; bird++) {
      const x = 15 + rand() * 70;
      const y = top + rand() * (bottom - top);
      const span = 2 + rand() * 2;
      pencil += `M${round1(x - span)} ${round1(y - span * 0.5)} Q${round1(x - span * 0.4)} ${round1(y - span * 0.7)} ${round1(x)} ${round1(y)} Q${round1(x + span * 0.4)} ${round1(y - span * 0.7)} ${round1(x + span)} ${round1(y - span * 0.5)} `;
    }
  };

  const boat = (x: number, y: number) => {
    add(`M${round1(x)} ${round1(y)} h14 l-3 3.4 h-8 Z`, watercolour("var(--cursor)", 0.1), 0.95);
    pencil += `M${round1(x + 7)} ${round1(y)} V${round1(y - 13)} `;
    add(
      `M${round1(x + 7.6)} ${round1(y - 12)} L${round1(x + 13)} ${round1(y - 1)} H${round1(x + 7.6)} Z`,
      PAPER,
      0.95,
    );
  };

  if (features.has("mountains")) {
    const far = line(52 + rand() * 10, 26, 0.55, { x: 25 + rand() * 50, h: 22, w: 18 });
    add(down(far, 200), watercolour("var(--bg-region)", 0.2), 0.85);
    white += smooth(far, false) + " ";
    const near = line(92 + rand() * 10, 18, 0.5);
    add(down(near, 200), watercolour("var(--leaf)", 0.05), 0.9);
    pencil += smooth(near, false) + " ";
  }
  if (features.has("rock")) {
    const rock = line(150, 18, 0.5, { x: 32 + rand() * 22, h: 90 + rand() * 15, w: 22 });
    add(down(rock, 250), watercolour("var(--bg-alt)", 0.05), 0.92);
    white += smooth(rock, false) + " ";
    for (let ledge = 0; ledge < 9; ledge++) {
      const y = 90 + ledge * 16 + rand() * 6;
      pencil +=
        smooth(
          [
            [18 + rand() * 10, y],
            [40, y + (rand() - 0.5) * 5],
            [62 + rand() * 12, y + (rand() - 0.5) * 6],
          ],
          false,
        ) + " ";
    }

    add(down(line(196, 8, 0.4), 250), watercolour("var(--leaf)", 0.1), 0.8);
    const shadow = rock.filter(([x]) => x > 40).map(([x, y]): Point => [x, y + 4]);

    add(
      smooth([[40, 250], ...shadow], false) + " L102 250 Z",
      watercolour("var(--fg-dim)", 0.3),
      0.3,
    );
    for (let shrub = 0; shrub < 12; shrub++) {
      const x = 14 + rand() * 70;
      const y = 110 + rand() * 110;
      add(ellipse(x, y, 2 + rand() * 3, 1.4 + rand() * 1.6), watercolour("var(--leaf)", 0), 0.85);
    }
  }

  if (features.has("gorge")) {
    const leftWall: Point[] = [];
    const rightWall: Point[] = [];

    for (let y = -4; y <= STRIP_HEIGHT + 4; y += 14) {
      leftWall.push([28 + rand() * 10 + Math.sin(y / 40) * 4, y]);
      rightWall.push([62 + rand() * 10 + Math.sin(y / 50) * 4, y]);
    }

    add(
      smooth(leftWall, false) + ` L-2 ${STRIP_HEIGHT + 4} L-2 -4 Z`,
      watercolour("var(--cursor)", 0.35),
      0.9,
    );
    add(
      smooth(rightWall, false) + ` L102 ${STRIP_HEIGHT + 4} L102 -4 Z`,
      watercolour("var(--accent-0)", 0.4),
      0.9,
    );
    white += smooth(leftWall, false) + " " + smooth(rightWall, false) + " ";

    for (let shrub = 0; shrub < 16; shrub++) {
      const y = 20 + rand() * 230;
      const x = rand() < 0.5 ? 2 + rand() * 22 : 76 + rand() * 22;
      add(ellipse(x, y, 2.4 + rand() * 3, 1.6 + rand() * 1.8), watercolour("var(--leaf)", 0), 0.9);
    }

    // far wall through the slot, behind both near walls
    wash.splice(2, 0, {
      d: down(line(70, 14, 0.5), 140),
      fill: watercolour("var(--bg-region)", 0.3),
      o: 0.55,
    });

    for (let crack = 0; crack < 14; crack++) {
      const y = rand() * STRIP_HEIGHT;
      const x = rand() < 0.5 ? rand() * 26 : 74 + rand() * 26;
      pencil += `M${round1(x)} ${round1(y)} l${round1(4 + rand() * 6)} ${round1(1 + rand() * 4)} `;
    }
  }

  if (features.has("cliff")) {
    const cliffPoints: Point[] = [];
    for (let y = 118; y <= 262; y += 12) cliffPoints.push([52 + rand() * 10 + (y - 118) * 0.05, y]);
    const face = smooth(cliffPoints, false) + " L102 262 L102 118 Z";
    add(face, watercolour("var(--tape)", 0.05), 0.92);
    add(face, watercolour("var(--cursor)", 0.5), 0.35);
    white += smooth(cliffPoints, false) + " ";
    for (let ledge = 0; ledge < 10; ledge++) {
      const y = 124 + ledge * 13;
      pencil += `M${round1(66 + rand() * 10)} ${round1(y)} l${round1(10 + rand() * 14)} ${round1((rand() - 0.5) * 3)} `;
    }
    town(60, 120, 2, "white");
  }

  // lower half
  if (features.has("city")) {
    town(70, 262, 4, "mixed");
    sea(262, STRIP_HEIGHT + 2);
  } else if (features.has("bay")) {
    sea(120, 205);
    boat(14 + rand() * 50, 170 + rand() * 20);
    town(195, STRIP_HEIGHT + 2, 3, "roof");
  } else if (features.has("cliff")) sea(150, STRIP_HEIGHT + 2);
  else if (features.has("rock")) sea(246, STRIP_HEIGHT + 2);
  else if (features.has("river")) {
    const river = line(268, 4, 0.4);
    add(down(river, STRIP_HEIGHT + 2), watercolour("var(--sea)", 0.05), 0.95);
    pencil += smooth(river, false) + " ";
  } else if (features.has("sea") || features.has("coast")) sea(220, STRIP_HEIGHT + 2);

  if (features.has("beach")) {
    const shore = line(272, 6, 0.4);
    add(down(shore, STRIP_HEIGHT + 2), watercolour("var(--tape)", 0.05), 0.95);
    white += smooth(shore, false) + " ";
  }

  if (features.has("walkway")) {
    // boardwalk pinned along left wall
    const walk: Point[] = [];
    let y = 120 + rand() * 20;
    for (let x = 18; x < 48; x += 6) {
      walk.push([x, y]);
      y += (rand() - 0.35) * 5;
    }
    white += polyline(walk);
    pencil += polyline(walk) + polyline(walk.map(([x, pointY]) => [x, pointY + 2.4]));
    for (const [x, pointY] of walk) pencil += `M${round1(x)} ${round1(pointY + 2.4)} l-2.4 5 `;
  }

  if (features.has("palm")) palm(12 + rand() * 16, STRIP_HEIGHT + 2, 120 + rand() * 30);
  if (features.has("birds")) birds(28, 70);
  if (features.has("boat") && !features.has("bay")) boat(20 + rand() * 50, 250);

  // washes through one displacement filter
  const id = hash(slug).toString(36);
  const noise = hash(slug) % 997;
  const paths = wash
    .map(
      (layer) =>
        `<path d="${layer.d}" style="fill:${layer.fill};stroke:${layer.stroke ?? "none"}"${layer.sw ? ` stroke-width="${layer.sw}"` : ""} opacity="${layer.o}"/>`,
    )
    .join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${STRIP_HEIGHT}">` +
    `<defs>` +
    `<filter id="wc-${id}" x="-4%" y="-4%" width="108%" height="108%"><feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves="3" seed="${noise}"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter>` +
    `<filter id="pn-${id}"><feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="1" seed="${noise}"/><feDisplacementMap in="SourceGraphic" scale="0.9"/></filter>` +
    `<filter id="gr-${id}"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${noise}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.3 1.05"/></filter>` +
    `<filter id="bb-${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3.5"/></filter>` +
    `<clipPath id="sk-${id}"><rect width="100" height="${STRIP_HEIGHT}"/></clipPath>` +
    `</defs>` +
    `<g clip-path="url(#sk-${id})">` +
    `<g class="shiori-wash" filter="url(#wc-${id})">${paths}</g>` +
    back.map((path) => `<path class="shiori-mist" d="${path}" filter="url(#bb-${id})"/>`).join("") +
    `<path class="shiori-white" d="${white}" filter="url(#wc-${id})"/>` +
    `<path class="shiori-windows" d="${windows || "M0 0"}" filter="url(#pn-${id})"/>` +
    `<path class="shiori-pencil" d="${pencil || "M0 0"}" filter="url(#pn-${id})"/>` +
    `<rect class="shiori-grain" width="100" height="${STRIP_HEIGHT}" filter="url(#gr-${id})"/>` +
    `</g></svg>`
  );
}

export const shioriUrl = (slug: string) => `/art/shiori/${slug}.svg`;
