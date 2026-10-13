// the tea, the lamp, the koro and the weather on the eaves

import { mix, lerp } from "../core.js";
import {
  TREMBLE_FILTER,
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  addText,
  inked,
  brushStroke,
} from "../pen.js";
import { smoke, steam } from "./plume.js";

const TEA_SURFACE = 22; // the face of the tea, above where the cup stands

function teaCup(groups, group, rand, x, y, tones, mini) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x + 4, y + 2, 16, 4, 0.6, 8),
    tones.pool,
    0.8,
    "url(#bk-pool)",
  );
  inked(
    group,
    rand,
    wobblyPolygon(
      rand,
      [
        [x - 10, y - 22],
        [x + 10, y - 22],
        [x + 9, y],
        [x - 9, y],
      ],
      0.6,
    ),
    mix(tones.stone, tones.moss, 0.35),
    tones.ink,
    1.1,
  );
  addLine(group, wobblyRing(rand, x, y - 22, 10, 2.6, 0.3, 8), tones.ink, 0.9, 0.8);
  if (!mini) steam(groups, [x, y - TEA_SURFACE], tones);
}

function hangingLamp(
  group,
  lightGroup,
  poolGroup,
  rand,
  x,
  beamY,
  tones,
  lit,
  glow,
  boardMap,
  edgeY,
) {
  const lampTop = 196,
    lampBottom = 262,
    cy = (lampTop + lampBottom) / 2;
  // the cord, tied round the beam
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x, beamY - 2],
        [x + 0.6, (beamY + lampTop) / 2],
        [x, lampTop - 4],
      ],
      0.2,
    ),
    tones.ink,
    0.9,
    0.85,
    true,
  );
  addLine(group, wobblyRing(rand, x, beamY, 2.6, 2, 0.1, 8), tones.ink, 0.9, 0.9, true);
  const front = wobblyBox(rand, x - 19, lampTop + 8, x + 13, lampBottom, 0.4),
    side = wobblyPolygon(
      rand,
      [
        [x + 13, lampTop + 8],
        [x + 21, lampTop + 8],
        [x + 21, lampBottom - 3],
        [x + 13, lampBottom],
      ],
      0.3,
    ),
    brightness = lit * glow;

  // the paper unlit
  addSolid(group, front, mix(tones.fusuma, tones.paper, 0.35), 1);
  addSolid(group, side, mix(tones.fusuma, tones.ink, 0.12), 1);
  addWash(group, rand, front, tones.tape || tones.gold, 0.22);
  addSolid(group, wobblyRing(rand, x - 3, lampBottom - 9, 8, 2.4, 0.3, 8), tones.ink, 0.14);
  addLine(
    group,
    wobblySegment(rand, [x - 3, lampBottom - 11], [x - 2, lampBottom - 17], 0.2, 2),
    tones.ink,
    0.8,
    0.2,
    true,
  );

  const lampFace = (aim, opacity) => {
    addLine(
      aim,
      wobblySegment(rand, [x - 19, cy], [x + 13, cy], 0.3, 2),
      tones.woodDk,
      0.7,
      opacity,
      true,
    );
    addLine(
      aim,
      wobblySegment(rand, [x - 3, lampTop + 9], [x - 3, lampBottom - 1], 0.2, 2),
      tones.woodDk,
      0.5,
      opacity * 0.6,
      true,
    );
    addText(aim, {
      t: "縁",
      tr: `translate(${x - 3} ${cy + 8})`,
      fs: 20,
      font: "'Yuji Syuku', serif",
      fill: tones.ink,
      o: 0.4 + opacity,
    });
    addLine(aim, front, tones.ink, 1.1);
    addLine(aim, side, tones.ink, 1);
  };
  lampFace(group, 0.35);
  // the roof board over it and the foot under it, wood
  const roof = wobblyPolygon(
      rand,
      [
        [x - 26, lampTop + 8],
        [x - 20, lampTop - 1],
        [x + 22, lampTop - 1],
        [x + 28, lampTop + 8],
      ],
      0.4,
    ),
    foot = wobblyBox(rand, x - 21, lampBottom - 1, x + 22, lampBottom + 4, 0.3);
  addSolid(group, roof, mix(tones.woodDk, tones.paper, 0.15), 1);
  addSolid(group, foot, mix(tones.woodDk, tones.paper, 0.2), 1);
  addLine(group, roof, tones.ink, 1.1);
  addLine(group, foot, tones.ink, 1);

  // lit
  if (brightness > 0.05) {
    addWash(
      lightGroup,
      rand,
      wobblyRing(rand, x, cy, 30, 40, 2, 12),
      tones.glow,
      0.18 * brightness,
      "url(#bk-pool)",
    );
    addSolid(lightGroup, front, mix(tones.glow, tones.glowSoft, 0.45), brightness);
    addSolid(lightGroup, side, tones.glow, brightness * 0.9);
    addSolid(
      lightGroup,
      wobblyRing(rand, x - 3, lampBottom - 20, 12, 14, 2, 10),
      mix(tones.glowSoft, tones.paper, 0.6),
      brightness * 0.85,
      "url(#bk-pool)",
    );
    lampFace(lightGroup, 0.5 * brightness);
  }
  if (brightness <= 0.05) return;

  // the boards
  const height = edgeY(x) - cy,
    depth = 210,
    boardAt = (px, z) =>
      boardMap(Math.max(0, Math.min(1, (px + 10) / 845)), Math.pow(Math.min(1, z / depth), 1.3));
  const ringStops = [0.14, 0.26, 0.42, 0.62, 0.85],
    peak = 0.5 * brightness;
  ringStops.forEach((share, i) => {
    const reach = height * Math.sqrt(Math.pow(share, -2 / 3) - 1),
      points = [];
    for (let k = 0; k <= 16; k++) {
      const angle = (k / 16) * Math.PI;
      points.push(boardAt(x + reach * Math.cos(angle), reach * Math.sin(angle)));
    }
    addWash(
      poolGroup,
      rand,
      wobblyPolygon(rand, points, 3),
      tones.glow,
      peak * (share - (ringStops[i - 1] ?? 0)) * 1.6,
    );
  });

  // a little of it reaches the garden beyond the edge, lower and further off
  addWash(
    poolGroup,
    rand,
    wobblyRing(rand, x + 6, edgeY(x) - 14, height * 0.7, 9, 2, 10),
    tones.glow,
    0.1 * brightness,
    "url(#bk-pool)",
  );
  const toPost = 782 - x;
  [0.6, 1.2, 2].forEach((reach, i) =>
    addLine(
      lightGroup,
      wobblySegment(
        rand,
        [783, cy - toPost * reach * 0.8],
        [783, Math.min(edgeY(790), cy + toPost * reach)],
        0.3,
        3,
      ),
      tones.glowSoft,
      1.4,
      [0.5, 0.3, 0.16][i] * brightness,
      true,
    ),
  );
  [0.3, 0.6, 1].forEach((reach, i) => {
    const halfWidth = (cy - beamY) * reach;
    addLine(
      lightGroup,
      wobblySegment(
        rand,
        [x - halfWidth, beamY + 4 + halfWidth * 0.04],
        [x + halfWidth, beamY + 4 - halfWidth * 0.04],
        0.3,
        3,
      ),
      tones.glowSoft,
      1.2,
      [0.5, 0.3, 0.15][i] * brightness,
      true,
    );
  });
  addWash(
    lightGroup,
    rand,
    wobblyRing(rand, x, beamY - 16, 150, 18, 2, 12),
    tones.glow,
    0.12 * brightness,
    "url(#bk-pool)",
  );
  addLine(
    lightGroup,
    wobblySegment(rand, [615, 470], [619, 537], 0.3, 3),
    tones.glowSoft,
    1.3,
    0.4 * brightness,
    true,
  );
}

function seasonLook(tones, seasonKey) {
  const season = seasonKey || "aki";
  return {
    s: season,
    snow: season === "fuyu",
    ground: {
      haru: mix(tones.moss, "#a9c27a", 0.18),
      natsu: mix(tones.moss, tones.mossDk, 0.3),
      aki: mix(mix(tones.moss, tones.mossDk, 0.25), tones.earth, 0.16),
      fuyu: mix(tones.moss, tones.paper, 0.72),
    }[season],
    mound:
      season === "fuyu"
        ? mix(tones.mossDk, tones.paper, 0.35)
        : season === "aki"
          ? mix(tones.mossDk, tones.earth, 0.15)
          : tones.mossDk,
    crown: {
      haru: { maple: "#e7b3bd", redWarmer: "#f4dade" },
      natsu: {
        maple: mix(tones.mossDk, "#4c7a30", 0.45),
        redWarmer: mix(tones.moss, "#9cc25a", 0.4),
      },
      aki: {},
      fuyu: null,
    }[season],
    fall: { haru: "#efc4cc", natsu: null, aki: tones.maple, fuyu: "#f6f4ee" }[season],
    blind: { haru: 236, natsu: 300, aki: 236, fuyu: 0 }[season],
    chime: { haru: "風", natsu: "涼" }[season] || null,
  };
}

const SNOW = "#f5f3ec";
function snowCap(group, rand, points, width) {
  brushStroke(group, rand, points, width, SNOW, 0.97, { blunt: true, tip: 0.4 });
  addLine(
    group,
    wobblyLine(
      rand,
      points.map(([x, y]) => [x, y + width * 0.35]),
      0.3,
    ),
    "#9fb0c4",
    0.7,
    0.5,
  );
}

function arcTop(cx, cy, rx, ry, steps) {
  const points = [];
  for (let i = 0; i <= (steps || 6); i++) {
    const angle = Math.PI * (1.08 + (i / (steps || 6)) * 0.84);
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return points;
}

function falling(group, rand, kind, color, count, x0, x1, y0, y1) {
  for (let k = 0; k < count; k++) {
    const x = lerp(x0, x1, rand()),
      y = lerp(y0, y1, rand()),
      angle = rand() * 3;
    if (kind === "fuyu") {
      const size = 1.1 + rand() * 1.8;
      addSolid(group, wobblyRing(rand, x, y, size, size, 0.2, 6), color, 0.75 + rand() * 0.25);
      continue;
    }
    const rx = kind === "aki" ? 4 : 3.2,
      ry = kind === "aki" ? 2.6 : 1.7;
    addSolid(
      group,
      wobblyPolygon(
        rand,
        [
          [x - rx * Math.cos(angle), y - rx * Math.sin(angle)],
          [x + ry * Math.sin(angle), y - ry * Math.cos(angle)],
          [x + rx * Math.cos(angle), y + rx * Math.sin(angle)],
          [x - ry * Math.sin(angle), y + ry * Math.cos(angle)],
        ],
        0.4,
      ),
      color,
      0.8 + rand() * 0.2,
      TREMBLE_FILTER,
    );
  }
}

// small celadon burner
function koro(groups, group, rand, x, y, tones, mini, burnt, unlit) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x + 3, y + 2, 22, 5, 0.6, 8),
    tones.pool,
    0.8,
    "url(#bk-pool)",
  );
  const outline = `M${x - 17} ${y - 13} Q${x - 19} ${y - 1} ${x - 8} ${y + 1} L${x + 8} ${y + 1} Q${x + 19} ${y - 1} ${x + 17} ${y - 13} Z`;
  [
    [-11, 1],
    [0, 3],
    [11, 1],
  ].forEach(([dx, dy]) =>
    inked(
      group,
      rand,
      wobblyBox(rand, x + dx - 2, y + dy - 2, x + dx + 2, y + dy + 3, 0.2),
      mix(tones.mountLt, tones.moss, 0.3),
      tones.ink,
      0.8,
    ),
  );
  addSolid(group, outline, mix(mix(tones.mountLt, tones.moss, 0.3), tones.paper, 0.2), 1);
  addLine(group, outline, tones.ink, 1.1, 0.95);
  addSolid(
    group,
    wobblyRing(rand, x, y - 13, 17, 4, 0.3, 10),
    mix(tones.stone, tones.paper, 0.45),
    1,
  );
  addLine(group, wobblyRing(rand, x, y - 13, 17, 4, 0.3, 10), tones.ink, 0.9, 0.85);
  const length = 40 * (1 - (burnt ?? 0.35)),
    tip = [x + 3 + length * 0.12, y - 13 - length];
  addLine(
    group,
    wobblySegment(rand, [x + 3, y - 13], tip, 0.2, 1),
    mix(tones.earth, tones.ink, 0.25),
    1.6,
    0.95,
    true,
  );
  if (!unlit)
    addLine(
      group,
      wobblyLine(rand, [tip, [tip[0] + 2, tip[1] - 3], [tip[0] + 1, tip[1] - 6]], 0.2),
      tones.stone,
      1.4,
      0.8,
      true,
    );
  if (unlit) return;
  addSolid(group, wobblyRing(rand, tip[0], tip[1] + 1, 1.6, 1.6, 0, 6), tones.red, 1);
  addSolid(group, wobblyRing(rand, x + 6, y - 13, 3, 1, 0.2, 6), tones.stone, 0.8);

  smoke(groups, tip, tones, mini);
}

export { teaCup, hangingLamp, seasonLook, SNOW, snowCap, arcTop, falling, koro };
