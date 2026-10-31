// bamboo: leaves, culms, clumps

import { mix, hash, rng, roundCoord, lerp, smooth } from "./core.js";
import {
  jitter,
  wobblyPolygon,
  wobblyLine,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
} from "./pen.js";

// bamboo
function leafPath(x, y, angle, length, width) {
  const dirX = Math.cos(angle),
    dirY = Math.sin(angle),
    normalX = -dirY,
    normalY = dirX;
  const tipX = x + dirX * length,
    tipY = y + dirY * length;
  const leftBulge = [
      x + dirX * length * 0.32 + normalX * width,
      y + dirY * length * 0.32 + normalY * width,
    ],
    rightBulge = [
      x + dirX * length * 0.4 - normalX * width * 0.75,
      y + dirY * length * 0.4 - normalY * width * 0.75,
    ];
  return `M${roundCoord(x)} ${roundCoord(y)} Q${roundCoord(leftBulge[0])} ${roundCoord(leftBulge[1])} ${roundCoord(tipX)} ${roundCoord(tipY)} Q${roundCoord(rightBulge[0])} ${roundCoord(rightBulge[1])} ${roundCoord(x)} ${roundCoord(y)} Z`;
}

function leafSpray(group, rand, x, y, scale, tones, dir) {
  const count = 2 + Math.floor(rand() * 3),
    leafColor = mix(tones.mossDk, tones.ink, 0.35);
  for (let k = 0; k < count; k++) {
    const angle =
      Math.PI * (0.5 - dir * (0.12 + 0.3 * (k / Math.max(1, count - 1))) + jitter(rand, 0.05));
    const path = leafPath(x, y, angle, scale * (18 + rand() * 9), scale * (2.8 + rand() * 1.2));
    addSolid(group, path, leafColor, 0.72);
    addLine(group, path, tones.ink, 0.6, 0.6);
  }
}

function culmGeometry(culm) {
  const { x0, y0, h: height, lean, w: width } = culm;
  const pointAt = (along) => [x0 + lean * along * along, y0 - height * along];
  const widthAt = (along) => width * (1 - 0.35 * along);
  return {
    at: pointAt,
    wid: widthAt,
    edge: (along, side) => {
      const [x, y] = pointAt(along);
      return [x + (side * widthAt(along)) / 2, y];
    },
  };
}

function culmPart(group, rand, culm, tones, t0, t1, cutLow, cutTop) {
  const geometry = culmGeometry(culm),
    nodes = culm.nodes;
  const leftFrom = t0,
    rightFrom = t0 + (cutLow || 0),
    leftTo = t1,
    rightTo = t1 + (cutTop || 0);
  const edgePoints = (from, to, side) =>
    Array.from({ length: 7 }, (_, i) => geometry.edge(lerp(from, to, i / 6), side));
  const leftEdge = edgePoints(leftFrom, leftTo, -1),
    rightEdge = edgePoints(rightFrom, rightTo, 1);
  const outline = wobblyPolygon(rand, [...leftEdge, ...rightEdge.slice().reverse()], 0.3);
  addWash(group, rand, outline, mix(tones.bamboo, tones.mossDk, 0.22), 0.9);
  addLine(group, wobblyLine(rand, leftEdge, 0.25), tones.ink, 1.2, 0.9);
  addLine(group, wobblyLine(rand, rightEdge, 0.25), tones.ink, 1.2, 0.9);
  addLine(
    group,
    wobblyLine(
      rand,
      edgePoints(leftFrom + (leftTo - leftFrom) * 0.05, leftTo - (leftTo - leftFrom) * 0.05, -0.45),
      0.2,
    ),
    tones.paper,
    1.4,
    0.45,
    true,
  );
  for (let node = 1; node < nodes; node++) {
    const along = node / nodes;
    if (along <= Math.max(leftFrom, rightFrom) + 0.01 || along >= Math.min(leftTo, rightTo) - 0.01)
      continue;
    const from = geometry.edge(along, -1.25),
      to = geometry.edge(along, 1.25),
      mid = geometry.at(along);
    addLine(group, wobblyLine(rand, [from, [mid[0], mid[1] + 1.2], to], 0.15), tones.ink, 1.4, 0.9);
    addLine(
      group,
      wobblyLine(rand, [geometry.edge(along + 0.012, -1), geometry.edge(along + 0.012, 1)], 0.15),
      tones.ink,
      0.7,
      0.55,
    );
  }
  return { L: leftEdge, R: rightEdge };
}

// the hollow you see at a slanted cut
function cutFace(group, rand, left, right, width, tones) {
  const cx = (left[0] + right[0]) / 2,
    cy = (left[1] + right[1]) / 2,
    halfX = (right[0] - left[0]) / 2,
    halfY = (right[1] - left[1]) / 2;
  const ring = (scale) =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      return [
        cx + halfX * Math.cos(angle) * scale + 0 * halfY,
        cy + halfY * Math.cos(angle) * scale - Math.sin(angle) * width * 0.32 * scale,
      ];
    });
  const outer = smooth(ring(1), true),
    inner = smooth(ring(0.72), true);
  addSolid(group, outer, mix(tones.bamboo, tones.paper, 0.55), 1);
  addSolid(group, inner, mix(tones.deep, tones.bamboo, 0.25), 0.9);
  addLine(group, outer, tones.ink, 1.1, 0.95);
  addLine(group, inner, tones.ink, 0.7, 0.6);
}

function culmTop(group, rand, culm, tones, scale) {
  const geometry = culmGeometry(culm),
    tip = geometry.at(1);
  const twig = [
    tip,
    [tip[0] + culm.lean * 0.12, tip[1] - 10 * scale],
    [tip[0] + culm.lean * 0.2 + 3 * scale, tip[1] - 22 * scale],
  ];
  addLine(group, wobblyLine(rand, twig, 0.2), tones.ink, 1.3, 0.85);
  leafSpray(group, rand, twig[2][0], twig[2][1], scale, tones, culm.lean >= 0 ? 1 : -1);
  [1, 2].forEach((branch) => {
    const along = 1 - branch / culm.nodes,
      base = geometry.edge(along, branch % 2 ? 1 : -1),
      side = branch % 2 ? 1 : -1;
    const end = [base[0] + side * 14 * scale, base[1] - 9 * scale];
    addLine(
      group,
      wobblyLine(rand, [base, [base[0] + side * 7 * scale, base[1] - 6 * scale], end], 0.2),
      tones.ink,
      1,
      0.8,
    );
    leafSpray(group, rand, end[0], end[1], scale * 0.9, tones, side);
  });
}

const CULMS = [
  [-38, 120, -10, 7],
  [-24, 176, -6, 8],
  [-8, 240, -2, 10],
  [8, 214, 6, 9],
  [24, 252, 12, 10],
  [40, 190, 18, 8],
  [54, 140, 22, 7],
];

// where an edge of a culm meets the swipe line
function edgeHit(culm, line, side) {
  const geometry = culmGeometry(culm),
    [lineFrom, lineTo] = line,
    gap = (along) => {
      const [x, y] = geometry.edge(along, side);
      return (
        y -
        (lineFrom[1] + ((lineTo[1] - lineFrom[1]) * (x - lineFrom[0])) / (lineTo[0] - lineFrom[0]))
      );
    };
  let lo = 0,
    hi = 1;
  if (gap(lo) * gap(hi) > 0) return null;
  for (let step = 0; step < 30; step++) {
    const mid = (lo + hi) / 2;
    if (gap(lo) * gap(mid) <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

// cut: { line: [a, b], phase }
function bambooClump(groups, rand, x, y, tones, scale, cut) {
  scale = scale || 1;
  const base = newGroup();
  addWash(
    base,
    rand,
    wobblyRing(rand, x + 10 * scale, y + 4 * scale, 64 * scale, 10 * scale, 2, 12),
    tones.pool,
    0.55,
    "url(#bk-pool)",
  );
  addWash(
    base,
    rand,
    wobblyRing(rand, x + 6 * scale, y + 2 * scale, 50 * scale, 7 * scale, 2, 12),
    tones.moss,
    0.35,
    "url(#bk-pool)",
  );
  groups.push(base);
  const fallLater = [],
    fallRand = rng(hash("bamboo/fall"));
  CULMS.map((spec, i) => [spec, i])
    .sort((first, second) => first[0][3] - second[0][3])
    .forEach(([[offsetX, height, lean, width], i]) => {
      const culm = {
        x0: x + offsetX * scale,
        y0: y + (i % 2) * 3 * scale,
        h: height * scale,
        lean: lean * scale,
        w: width * scale,
        nodes: Math.max(4, Math.round(height / 30)),
      };
      const group = newGroup();
      const cutLeft = cut && edgeHit(culm, cut.line, -1),
        cutRight = cut && edgeHit(culm, cut.line, 1);
      if (
        cutLeft != null &&
        cutRight != null &&
        cutLeft > 0.04 &&
        cutRight > 0.04 &&
        Math.max(cutLeft, cutRight) < 0.96
      ) {
        const stump = culmPart(group, rand, culm, tones, 0, cutLeft, 0, cutRight - cutLeft);
        groups.push(group);
        const cutGroup = newGroup();
        cutFace(cutGroup, rand, stump.L[6], stump.R[6], culm.w, tones);
        groups.push(cutGroup);
        const toRight = i % 2 === 0,
          side = toRight ? 1 : -1,
          pivot = toRight ? stump.R[6] : stump.L[6],
          pair = Math.floor(i / 2);
        let tf,
          vars = "";
        if (cut.phase === "down") {
          const landX = x - side * (100 - pair * 22) * scale,
            landY = y + (10 + ((i * 5) % 7) * 7) * scale;
          vars = `--tx:${roundCoord(landX - pivot[0])}px;--ty:${roundCoord(landY - pivot[1])}px;--r:${roundCoord(side * (70 + fallRand() * 34))}deg;--d:${roundCoord(((i * 7) % 4) * 0.05)}s`;
          tf = "translate(var(--tx), var(--ty)) rotate(var(--r))";
        } else tf = `rotate(${side * (6 + fallRand() * 14)}deg)`;
        const fallGroup = newGroup({
          tf,
          vars,
          to: `${roundCoord(pivot[0])}px ${roundCoord(pivot[1])}px`,
          cls: "fall",
        });
        culmPart(fallGroup, rand, culm, tones, cutLeft, 1, cutRight - cutLeft, 0);
        culmTop(fallGroup, rand, culm, tones, scale);
        fallLater.push([cut.phase === "down" ? 0 : 1, fallGroup]);
      } else {
        culmPart(group, rand, culm, tones, 0, 1);
        culmTop(group, rand, culm, tones, scale);
        groups.push(group);
      }
    });
  fallLater.forEach(([, fallGroup]) => groups.push(fallGroup));
}

export {
  leafPath,
  leafSpray,
  culmGeometry,
  culmPart,
  cutFace,
  culmTop,
  CULMS,
  edgeHit,
  bambooClump,
};
