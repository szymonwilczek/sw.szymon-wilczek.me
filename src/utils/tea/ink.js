import {
  THEME_VARS,
  mix,
  toneVars,
  TONE_CSS,
  FILTERS,
  groupSvg,
  toSvg,
  hash,
  rng,
  setPrecision,
  roundCoord,
  lerp,
  smooth,
  polygonPath,
} from "./ink/core.js";
import {
  TREMBLE_FILTER,
  WASH_FILTER,
  jitter,
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
  quadMap,
  brushPath,
  brushStroke,
  brushWash,
  dryBrush,
  mistPath,
  mist,
  oblique,
  projectAll,
} from "./ink/pen.js";
import {
  stone,
  steppingStones,
  maple,
  lantern,
  thatchStrokes,
  cordTie,
  steam,
} from "./ink/garden.js";
import { face, post, gableRoof, plaque } from "./ink/architecture.js";

// flat stone on the path, a rope crossed over it, a small wooden box hanging at the front
function stoneBody(group, rand, x, y, scale, tones) {
  const points = [];
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2,
      sin = Math.sin(angle),
      cos = Math.cos(angle);
    const rx = 13 * scale * (1 + jitter(rand, 0.08)),
      rise = 9 * scale * (0.9 + 0.2 * rand());
    points.push([
      x + cos * rx + (sin < 0 ? -cos * cos * 1.2 * scale : 0),
      sin < 0 ? y + sin * rise * (1 - 0.15 * cos) : y + sin * 3.5 * scale,
    ]);
  }
  const outline = smooth(points, true);
  addSolid(
    group,
    wobblyRing(rand, x + 3 * scale, y + 2.5 * scale, 14 * scale, 3.4 * scale, 0.6, 10),
    tones.ink,
    0.22,
    "url(#bk-bleed)",
  );
  addSolid(group, outline, mix(tones.stone, tones.paper, 0.5), 1);
  addSolid(
    group,
    `M${roundCoord(x - 12 * scale)} ${roundCoord(y - 1 * scale)} Q${roundCoord(x)} ${roundCoord(y + 2 * scale)} ${roundCoord(x + 12 * scale)} ${roundCoord(y - 2 * scale)} Q${roundCoord(x + 10 * scale)} ${roundCoord(y + 3 * scale)} ${roundCoord(x)} ${roundCoord(y + 3.4 * scale)} Q${roundCoord(x - 10 * scale)} ${roundCoord(y + 3 * scale)} ${roundCoord(x - 12 * scale)} ${roundCoord(y - 1 * scale)} Z`,
    tones.stone,
    0.55,
  );
  addLine(group, outline, tones.ink, 1.3, 0.9);
  return outline;
}
function sekiStone(groups, rand, x, y, scale, tones, open) {
  const group = newGroup(),
    scaled = (v) => v * scale;
  if (!open) {
    stone(group, rand, x + scaled(2), y + scaled(3), scaled(24), scaled(9), tones);
    groups.push(group);
    const tied = newGroup();
    stoneBody(tied, rand, x, y, scale, tones);
    const rope = (points) => {
      addLine(tied, wobblyLine(rand, points, 0.2), tones.ink, scaled(2), 0.95, true);
      addLine(tied, wobblyLine(rand, points, 0.15), tones.cord, scaled(0.8), 0.9, true);
    };
    rope([
      [x - scaled(12.5), y + scaled(1)],
      [x - scaled(9), y - scaled(5.5)],
      [x - scaled(1), y - scaled(8.6)],
      [x + scaled(7), y - scaled(6.4)],
      [x + scaled(12.5), y],
    ]);
    rope([
      [x + scaled(1.6), y + scaled(3.4)],
      [x + scaled(1), y - scaled(3)],
      [x - scaled(1), y - scaled(8.6)],
    ]);
    [-1, 1].forEach((side) =>
      addLine(
        tied,
        wobblyLine(
          rand,
          [
            [x - scaled(1), y - scaled(9)],
            [x + side * scaled(4.5), y - scaled(13)],
            [x + side * scaled(7), y - scaled(11)],
            [x + side * scaled(3), y - scaled(9)],
          ],
          0.15,
        ),
        tones.ink,
        scaled(1.3),
        0.9,
        true,
      ),
    );
    addSolid(
      tied,
      wobblyRing(rand, x - scaled(1), y - scaled(9), scaled(1.8), scaled(1.5), 0.15, 6),
      tones.ink,
      0.95,
    );
    groups.push(tied);
    const box = newGroup(),
      boxX = x + scaled(2.4),
      boxY = y + scaled(2.4);
    addLine(
      box,
      wobblyLine(
        rand,
        [
          [x + scaled(1.6), y + scaled(2.6)],
          [boxX, boxY + scaled(2)],
        ],
        0.1,
      ),
      tones.ink,
      scaled(1.2),
      0.9,
      true,
    );
    addSolid(
      box,
      wobblyBox(
        rand,
        boxX - scaled(5.5),
        boxY + scaled(2),
        boxX + scaled(5.5),
        boxY + scaled(13),
        0.3,
      ),
      tones.wood,
      1,
    );
    addLine(
      box,
      wobblyBox(
        rand,
        boxX - scaled(5.5),
        boxY + scaled(2),
        boxX + scaled(5.5),
        boxY + scaled(13),
        0.3,
      ),
      tones.ink,
      1.1,
      0.95,
    );
    addLine(
      box,
      wobblySegment(
        rand,
        [boxX - scaled(5.5), boxY + scaled(4.6)],
        [boxX + scaled(5.5), boxY + scaled(4.6)],
        0.2,
        1,
      ),
      tones.ink,
      0.7,
      0.6,
    );
    addSolid(
      box,
      wobblyBox(
        rand,
        boxX - scaled(2.6),
        boxY + scaled(6.4),
        boxX + scaled(2.6),
        boxY + scaled(11.4),
        0.2,
      ),
      tones.brass,
      1,
    );
    addSolid(
      box,
      `${wobblyRing(rand, boxX, boxY + scaled(8.2), scaled(1), scaled(1), 0.1, 6)} ${wobblyBox(rand, boxX - scaled(0.4), boxY + scaled(8.2), boxX + scaled(0.4), boxY + scaled(10.6), 0.1)}`,
      tones.deep,
      0.95,
    );
    groups.push(box);
  } else {
    stone(group, rand, x + scaled(2), y + scaled(3), scaled(24), scaled(9), tones);
    const rope = [
      [x - scaled(18), y + scaled(4)],
      [x - scaled(9), y + scaled(8)],
      [x + scaled(3), y + scaled(7)],
      [x + scaled(10), y + scaled(2)],
      [x + scaled(4), y - scaled(1)],
      [x - scaled(8), y + scaled(1)],
    ];
    addLine(group, wobblyLine(rand, rope, 0.3), tones.ink, scaled(2.6), 0.9, true);
    addLine(group, wobblyLine(rand, rope, 0.2), tones.cord, scaled(1), 0.85, true);
    stoneBody(group, rand, x + scaled(30), y + scaled(9), scale, tones);
    groups.push(group);
    const box = newGroup(),
      boxX = x - scaled(14),
      boxY = y + scaled(10);
    addSolid(
      box,
      wobblyBox(rand, boxX - scaled(6), boxY - scaled(4), boxX + scaled(6), boxY + scaled(5), 0.3),
      tones.wood,
      1,
    );
    addSolid(
      box,
      wobblyBox(
        rand,
        boxX - scaled(4.6),
        boxY - scaled(3),
        boxX + scaled(4.6),
        boxY - scaled(0.5),
        0.2,
      ),
      tones.deep,
      0.9,
    );
    addLine(
      box,
      wobblyBox(rand, boxX - scaled(6), boxY - scaled(4), boxX + scaled(6), boxY + scaled(5), 0.3),
      tones.ink,
      1.1,
      0.95,
    );
    const lid = wobblyPolygon(
      rand,
      [
        [boxX - scaled(6), boxY - scaled(4)],
        [boxX + scaled(6), boxY - scaled(4)],
        [boxX + scaled(8), boxY - scaled(9)],
        [boxX - scaled(3), boxY - scaled(10)],
      ],
      0.3,
    );
    addSolid(box, lid, tones.woodLt, 1);
    addLine(box, lid, tones.ink, 1, 0.9);
    groups.push(box);
  }
}
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
// the toy
function sceneBamboo(tones) {
  const rand = rng(hash("tea/bamboo")),
    width = 1100,
    height = 560,
    groups = [],
    clips = [];
  const centers = [190, 560, 920],
    groundY = 470,
    scale = 1.45,
    swipe = (center) => [
      [center - 170, 362],
      [center + 170, 318],
    ];
  const frame = newGroup();
  [0, 1, 2].forEach((index) => {
    addText(frame, {
      t: ["一", "二", "三"][index],
      tr: `translate(${centers[index] - 150} 40)`,
      fs: 22,
      font: "'Yuji Syuku', serif",
      fill: tones.ink,
      o: 0.8,
    });
  });
  groups.push(frame);
  bambooClump(groups, rng(hash("bb")), centers[0], groundY, tones, scale);
  bambooClump(groups, rng(hash("bb")), centers[1], groundY, tones, scale, {
    phase: "fall",
    line: swipe(centers[1]),
  });
  bambooClump(groups, rng(hash("bb")), centers[2], groundY, tones, scale, {
    phase: "down",
    line: swipe(centers[2]),
  });
  // fingers trail
  const trail = newGroup(),
    [swipeFrom, swipeTo] = swipe(centers[1]);
  brushWash(
    trail,
    rand,
    [
      swipeFrom,
      [lerp(swipeFrom[0], swipeTo[0], 0.5), lerp(swipeFrom[1], swipeTo[1], 0.5) - 3],
      swipeTo,
    ],
    10,
    tones.gold,
    0.55,
  );
  brushStroke(
    trail,
    rand,
    [
      swipeFrom,
      [lerp(swipeFrom[0], swipeTo[0], 0.5), lerp(swipeFrom[1], swipeTo[1], 0.5) - 3],
      swipeTo,
    ],
    2.4,
    tones.ink,
    0.5,
    {
      tip: 0.05,
      head: 0.1,
    },
  );
  addLine(
    trail,
    wobblyRing(rand, swipeTo[0] + 14, swipeTo[1] - 2, 11, 11, 0.4, 12),
    tones.ink,
    1,
    0.55,
  );
  groups.push(trail);
  const fallen = newGroup();
  [
    [centers[2] - 150, groundY + 30, 0.2],
    [centers[2] - 70, groundY + 50, 2.9],
    [centers[2] + 130, groundY + 44, 0.5],
    [centers[2] + 20, groundY + 62, 2.6],
    [centers[2] - 110, groundY + 70, 0.9],
  ].forEach(([x, leafY, angle]) => {
    const path = leafPath(x, leafY, angle, 18, 3.4);
    addWash(fallen, rand, path, mix(tones.mossDk, tones.gold, 0.4), 0.9);
    addLine(fallen, path, tones.ink, 0.7, 0.7);
  });
  groups.push(fallen);
  return { W: width, H: height, groups, clips };
}
// the same oblique projection, zoomed in
const obliqueScaled = (ox, oy, scale) => (x, z, y) => [
  ox + (x + z * 0.6) * scale,
  oy - (z * 0.42 + (y || 0)) * scale,
];
const CLAYS = (tones) => [
  mix(tones.earth, tones.paper, 0.25),
  mix(tones.earth, tones.red, 0.3),
  mix(tones.earth, tones.ink, 0.45),
  mix(tones.paper, tones.plaster, 0.25),
];
const GLAZES = (tones) => [
  mix(tones.ink, tones.lacquer, 0.3),
  mix(tones.paper, tones.plaster, 0.35),
  mix(tones.gold, tones.earth, 0.5),
  mix(tones.moss, tones.paper, 0.45),
  mix(tones.water, tones.ink, 0.2),
  mix(tones.moss, tones.bamboo, 0.15),
  mix(tones.red, tones.earth, 0.35),
  mix(tones.maple, tones.earth, 0.45),
  mix(tones.water, tones.stone, 0.45),
  mix(tones.water, tones.red, 0.35),
  mix(tones.gold, tones.thatch, 0.35),
  mix(tones.mossDk, tones.stone, 0.5),
];
const GLAZE_NAMES = [
  "tenmoku",
  "shino",
  "ame",
  "seiji",
  "ruri",
  "oribe",
  "shu",
  "kaki",
  "namako",
  "kinyo",
  "kiseto",
  "haiyu",
];
const GLAZE_KANJI = [
  "天目",
  "志野",
  "飴",
  "青磁",
  "瑠璃",
  "織部",
  "朱",
  "柿",
  "海鼠",
  "鈞窯",
  "黄瀬戸",
  "灰釉",
];
const PAINTS = (tones) => [
  mix(tones.water, tones.ink, 0.45),
  mix(tones.earth, tones.ink, 0.55),
  tones.red,
  tones.paper,
  mix(mix(tones.mossDk, tones.water, 0.4), tones.ink, 0.25),
  mix(tones.gold, tones.maple, 0.2),
  mix(tones.red, tones.lacquer, 0.35),
  mix(tones.ink, tones.deep, 0.3),
  mix(tones.brass, tones.gold, 0.3),
];
function radiusAt(profile, y) {
  for (let i = 1; i < profile.length; i++)
    if (y <= profile[i][1])
      return lerp(
        profile[i - 1][0],
        profile[i][0],
        (y - profile[i - 1][1]) / Math.max(1e-6, profile[i][1] - profile[i - 1][1]),
      );
  return profile[profile.length - 1][0];
}
const PROFILES = {
  cup: {
    prof: [
      [22, 0],
      [25, 0.15],
      [27, 0.6],
      [26, 1],
    ],
    H: 62,
    handle: true,
  },
  yunomi: {
    prof: [
      [20, 0],
      [24, 0.2],
      [25, 0.7],
      [23, 1],
    ],
    H: 70,
  },
  bowl: {
    prof: [
      [22, 0],
      [36, 0.2],
      [48, 0.6],
      [52, 1],
    ],
    H: 44,
  },
  hira: {
    prof: [
      [26, 0],
      [50, 0.4],
      [64, 1],
    ],
    H: 28,
  },
  plate: {
    prof: [
      [40, 0],
      [62, 0.35],
      [80, 0.8],
      [84, 1],
    ],
    H: 12,
  },
};
function piece(group, rand, cx, cy, scale, tones, spec) {
  const profile = spec.prof,
    rimRadius = profile[profile.length - 1][0] * scale,
    height = spec.H * scale,
    rimY = cy - height,
    fireRand = rng(spec.fire || 1);
  const bodyRadius = (down) => radiusAt(profile, 1 - down) * scale,
    squash = 0.3,
    shallow = height < rimRadius * 0.45;
  const clay = CLAYS(tones)[spec.clay || 0];
  let glaze = spec.glaze && !spec.glaze.none ? GLAZES(tones)[spec.glaze.c] : null;
  if (glaze) glaze = mix(glaze, fireRand() < 0.5 ? tones.ink : tones.paper, fireRand() * 0.12);
  const side = (sign, from, to) =>
    Array.from({ length: 13 }, (_, i) => {
      const down = lerp(from, to, i / 12);
      return [cx + sign * bodyRadius(down), rimY + down * height];
    });
  const arc = (radius, y, steps, below) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const across = -1 + (2 * i) / steps;
      return [
        cx + across * radius,
        y + (below ? 1 : -1) * radius * squash * Math.sqrt(Math.max(0, 1 - across * across)),
      ];
    });
  const frontPoint = (across, down) => [
    cx + across * bodyRadius(down) * 0.97,
    rimY + down * height + bodyRadius(down) * squash * Math.sqrt(Math.max(0, 1 - across * across)),
  ];
  const footRadius = bodyRadius(1);
  const paint = () =>
    (spec.paint || []).forEach((stroke) => {
      const points = stroke.pts.map(([across, down]) =>
        shallow ? insidePoint(across, down) : frontPoint(across, down),
      );
      const color = PAINTS(tones)[stroke.c],
        width = stroke.w * scale;
      if (stroke.s === 1)
        brushStroke(group, rand, points, width, color, 0.88, { blunt: true, tip: 0.85 });
      else if (stroke.s === 2)
        // dry brush
        for (let bristle = 0; bristle < 4; bristle++) {
          const offset = (bristle / 3 - 0.5) * width * 0.8;
          const shifted = points.map(([x, y], i) => {
            const prev = points[Math.max(0, i - 1)],
              next = points[Math.min(points.length - 1, i + 1)],
              length = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
            return [
              x - ((next[1] - prev[1]) / length) * offset,
              y + ((next[0] - prev[0]) / length) * offset,
            ];
          });
          const kept = Math.max(2, Math.ceil(shifted.length * (0.6 + rand() * 0.4)));
          brushStroke(group, rand, shifted.slice(0, kept), width * 0.3, color, 0.75, {
            tip: 0.2,
            head: 0.5,
          });
        }
      else brushStroke(group, rand, points, width, color, 0.88, { tip: 0.25, head: 0.15 });
    });
  const insidePoint = (across, down) => {
    const y = down * 2 - 1,
      halfWidth = Math.sqrt(Math.max(0, 1 - y * y));
    return [cx + across * halfWidth * rimRadius * 0.82, rimY + y * rimRadius * squash * 0.78];
  };
  // shadow, foot ring, then the body
  addSolid(
    group,
    wobblyRing(
      rand,
      cx + 5 * scale,
      cy + footRadius * squash + 6 * scale,
      rimRadius * 0.95,
      rimRadius * squash * 0.6,
      0.4,
      12,
    ),
    tones.ink,
    0.16,
  );
  const footSteps = Array.from({ length: 11 }, (_, i) => -0.8 + i * 0.16),
    footY = (across) => cy + footRadius * squash * Math.sqrt(1 - across * across);
  const footTop = footSteps.map((across) => [cx + across * footRadius, footY(across) - 1]),
    footBot = footSteps.map((across) => [
      cx + across * footRadius * 0.97,
      footY(across) + 5 * scale,
    ]);
  addSolid(
    group,
    wobblyPolygon(rand, [...footTop, ...footBot.reverse()], 0.2),
    mix(clay, tones.ink, 0.15),
    1,
  );
  addLine(
    group,
    wobblyLine(rand, [footTop[0], ...footBot.slice().reverse(), footTop[footTop.length - 1]], 0.2),
    tones.ink,
    0.9,
    0.85,
  );
  const bodyPts = [
    ...side(-1, 0, 1),
    ...arc(footRadius, cy, 14, true).slice(1, -1),
    ...side(1, 0, 1).reverse(),
  ];
  const body = wobblyPolygon(rand, bodyPts, 0.2);
  addSolid(group, body, clay, 1);
  for (let k = 0; k < 7; k++) {
    const across = jitter(fireRand, 0.8),
      down = 0.75 + fireRand() * 0.2,
      spot = frontPoint(across, down);
    addSolid(
      group,
      wobblyRing(rand, spot[0], spot[1], 0.5 + fireRand(), 0.4 + fireRand() * 0.6, 0.1, 5),
      mix(clay, tones.ink, 0.5),
      0.6,
    );
  }
  if (glaze) {
    const dip = spec.glaze.dip,
      drips = spec.glaze.drips || [];
    const edge = Array.from({ length: 41 }, (_, i) => {
      const across = -1 + i / 20,
        spot = frontPoint(across, dip);
      let y = spot[1] + Math.sin(across * 8 + (spec.fire || 0)) * 1.2 * scale;
      drips.forEach(([dripAt, length, width]) => {
        const distance = (across - dripAt) / width;
        y += length * height * Math.exp(-distance * distance * 3);
      });
      return [
        cx + across * bodyRadius(dip) * 0.995,
        Math.min(
          y,
          cy + footRadius * squash * Math.sqrt(Math.max(0, 1 - across * across)) - 2 * scale,
        ),
      ];
    });
    const glazed = wobblyPolygon(
      rand,
      [...side(-1, 0, dip), ...edge, ...side(1, 0, dip).reverse()],
      0.2,
    );
    addSolid(group, glazed, glaze, 0.97);
    addLine(group, wobblyLine(rand, edge, 0.2), mix(glaze, tones.ink, 0.4), 0.8, 0.6);
    // what the kiln did
    for (let k = 0; k < 4 + Math.floor(fireRand() * 8); k++) {
      const spot = frontPoint(jitter(fireRand, 0.8), fireRand() * dip * 0.9);
      addSolid(
        group,
        wobblyRing(rand, spot[0], spot[1], 0.5 + fireRand() * 0.9, 0.5 + fireRand() * 0.7, 0.1, 5),
        mix(glaze, fireRand() < 0.5 ? tones.ink : tones.paper, 0.5),
        0.7,
      );
    }
  }
  if (!shallow) paint();
  if (spec.seal) {
    const spot = frontPoint(0.62, 0.8);
    addSolid(
      group,
      wobblyBox(
        rand,
        spot[0] - 3 * scale,
        spot[1] - 3 * scale,
        spot[0] + 3 * scale,
        spot[1] + 3 * scale,
        0.2,
      ),
      tones.red,
      0.85,
    );
  }
  const sheen = side(-1, 0.1, shallow ? 0.6 : 0.75).map(([x, y]) => [x + rimRadius * 0.16, y]);
  addLine(group, wobblyLine(rand, sheen, 0.2), tones.paper, 1.8 * scale, 0.3, true);
  addLine(group, wobblyLine(rand, bodyPts, 0.2), tones.ink, 1.2, 0.95);
  // mouth, inside wall and, if it is shallow enough, floor
  const mouth = wobblyRing(rand, cx, rimY, rimRadius, rimRadius * squash, 0.25, 22);
  const inner = glaze ? mix(glaze, tones.ink, 0.22) : mix(clay, tones.ink, 0.15);
  addSolid(group, mouth, inner, 1);
  if (shallow) {
    const floorRadius = bodyRadius(1) * 0.95;
    addSolid(
      group,
      wobblyRing(rand, cx, rimY + height * 0.85, floorRadius, floorRadius * squash, 0.2, 16),
      glaze ? mix(glaze, tones.paper, 0.06) : clay,
      1,
    );
  }
  addSolid(
    group,
    wobblyRing(
      rand,
      cx - rimRadius * 0.05,
      rimY - rimRadius * squash * 0.12,
      rimRadius * 0.9,
      rimRadius * squash * 0.8,
      0.2,
      18,
    ),
    glaze ? mix(glaze, tones.paper, 0.08) : mix(clay, tones.paper, 0.1),
    0.35,
  );
  if (shallow) paint();
  addLine(group, mouth, tones.ink, 1.2, 0.95);
  addLine(
    group,
    wobblyRing(rand, cx, rimY + 1.2 * scale, rimRadius * 0.94, rimRadius * squash * 0.88, 0.2, 18),
    tones.ink,
    0.5,
    0.35,
  );
  if (spec.handle) {
    const handleTop = [cx + bodyRadius(0.22), rimY + 0.22 * height],
      handleBottom = [cx + bodyRadius(0.72), rimY + 0.72 * height],
      reach = rimRadius * 0.55;
    const handle = [
      handleTop,
      [handleTop[0] + reach * 0.75, handleTop[1] - 3 * scale],
      [handleTop[0] + reach, lerp(handleTop[1], handleBottom[1], 0.45)],
      [handleBottom[0] + reach * 0.55, handleBottom[1] + 2 * scale],
      handleBottom,
    ];
    brushStroke(group, rand, handle, 7 * scale, glaze || clay, 1, {
      blunt: true,
      tip: 0.9,
      head: 0.9,
    });
    addLine(
      group,
      wobblyLine(
        rand,
        handle.map(([x, y], i) => [x + (i && i < 4 ? 3.2 * scale : 0), y]),
        0.2,
      ),
      tones.ink,
      1,
      0.85,
    );
    addLine(
      group,
      wobblyLine(
        rand,
        handle.map(([x, y], i) => [x - (i && i < 4 ? 3.2 * scale : 0), y]),
        0.2,
      ),
      tones.ink,
      1,
      0.85,
    );
  }
  if (spec.kin) {
    const points = spec.kin.map(([across, down]) => frontPoint(across, down));
    addLine(group, wobblyLine(rand, points, 0.3), tones.gold, 2.2 * scale, 0.95, true);
    addLine(group, wobblyLine(rand, points, 0.3), tones.ink, 0.5, 0.45);
  }
}
// guest's piece
function demoSpec(name, kind) {
  const rand = rng(hash("piece/" + name)),
    base = PROFILES[kind || ["cup", "yunomi", "bowl", "hira", "plate"][Math.floor(rand() * 5)]];
  const prof = base.prof.map(([radius, y], i) => [radius * (1 + jitter(rand, 0.08)), y]);
  const paint = [];
  if (rand() < 0.6) {
    const height = 0.2 + rand() * 0.3;
    paint.push({
      pts: [
        [-0.7, height + jitter(rand, 0.05)],
        [-0.2, height - 0.08],
        [0.3, height + 0.06],
        [0.7, height - 0.02],
      ],
      w: 2 + rand() * 3,
      c: Math.floor(rand() * 3),
    });
  }
  if (rand() < 0.4) {
    const across = jitter(rand, 0.5);
    paint.push({
      pts: [
        [across, 0.12],
        [across + 0.05, 0.3],
        [across - 0.02, 0.5],
      ],
      w: 3 + rand() * 2,
      c: Math.floor(rand() * 3),
    });
  }
  return {
    prof,
    H: base.H * (1 + jitter(rand, 0.1)),
    handle: base.handle,
    clay: Math.floor(rand() * 4),
    fire: Math.floor(rand() * 1e6),
    glaze: {
      c: Math.floor(rand() * 7),
      dip: 0.45 + rand() * 0.35,
      drips: Array.from({ length: Math.floor(rand() * 4) }, () => [
        jitter(rand, 0.8),
        0.1 + rand() * 0.2,
        0.06 + rand() * 0.06,
      ]),
    },
    kin:
      rand() < 0.2
        ? [
            [jitter(rand, 0.4), 0],
            [jitter(rand, 0.4), 0.2],
            [jitter(rand, 0.4), 0.45],
          ]
        : null,
    paint,
    seal: true,
  };
}
// kick wheel
function wheel(group, rand, cx, cy, scale, tones) {
  const scaled = (v) => v * scale;
  addSolid(
    group,
    wobblyRing(rand, cx + scaled(6), cy + scaled(74), scaled(78), scaled(14), 0.5, 14),
    tones.ink,
    0.14,
  );
  const arc = (centerY, radiusX, radiusY, from, to, wobble) =>
    wobblyLine(
      rand,
      Array.from({ length: 13 }, (_, i) => {
        const angle = lerp(from, to, i / 12);
        return [cx + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY];
      }),
      wobble * 0.4,
    );
  const sides = (halfWidth, top, bottom, wobble, steps) =>
    [-1, 1]
      .map((side) =>
        wobblySegment(
          rand,
          [cx + side * halfWidth, top],
          [cx + side * halfWidth, bottom],
          wobble,
          steps,
        ),
      )
      .join(" ");
  const disc = (top, radiusX, radiusY, thickness, wobble, fill) => {
    const bottom = top + thickness;
    addSolid(group, wobblyBox(rand, cx - radiusX, top, cx + radiusX, bottom, 0), tones.woodDk, 1);
    addSolid(group, wobblyRing(rand, cx, bottom, radiusX, radiusY, 0, 18), tones.woodDk, 1);
    addLine(group, arc(bottom, radiusX, radiusY, 0, Math.PI, wobble), tones.ink, 1, 0.8);
    addLine(group, sides(radiusX, top, bottom, 0.2, 1), tones.ink, 1, 0.8);
    const face = wobblyRing(rand, cx, top, radiusX, radiusY, wobble, 18);
    addSolid(group, face, fill, 1);
    return face;
  };
  const flywheelTop = cy + scaled(62);
  disc(flywheelTop, scaled(70), scaled(18), scaled(8), 0.5, tones.wood);
  const behindShaft = Math.asin(6 / 70);
  for (const [from, to] of [
    [0, Math.PI],
    [Math.PI, 1.5 * Math.PI - behindShaft],
    [1.5 * Math.PI + behindShaft, 2 * Math.PI],
  ])
    addLine(group, arc(flywheelTop, scaled(70), scaled(18), from, to, 0.5), tones.ink, 1.2, 0.9);
  // shaft stands on the flywheel and runs up under the head
  addSolid(
    group,
    wobblyBox(rand, cx - scaled(5), cy + scaled(4), cx + scaled(5), cy + scaled(62), 0),
    tones.woodDk,
    1,
  );
  addLine(group, sides(scaled(5), cy + scaled(19), cy + scaled(62), 0.3, 3), tones.ink, 1, 0.85);
  const head = disc(cy, scaled(46), scaled(13), scaled(7), 0.3, tones.woodLt);
  addLine(group, head, tones.ink, 1.2, 0.95);
  addLine(group, wobblyRing(rand, cx, cy, scaled(30), scaled(8.5), 0.3, 16), tones.ink, 0.6, 0.4);
}
// spin mark round the wheel head
function spin(group, rand, cx, cy, rx, ry, tones) {
  const points = Array.from({ length: 12 }, (_, i) => {
    const angle = Math.PI * (0.15 + (i / 11) * 0.7);
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
  addLine(group, wobblyLine(rand, points, 0.3), tones.ink, 1, 0.45);
  const start = points[0];
  addLine(
    group,
    `M${roundCoord(start[0] + 6)} ${roundCoord(start[1] - 6)} L${roundCoord(start[0])} ${roundCoord(start[1])} L${roundCoord(start[0] + 9)} ${roundCoord(start[1] + 2)}`,
    tones.ink,
    1,
    0.5,
  );
}
// lump of clay at some stage of the throw
function wetClay(group, rand, cx, cy, s, tones, profile, height) {
  piece(group, rand, cx, cy, s, tones, {
    prof: profile,
    H: height,
    clay: 0,
    glaze: { none: true },
    fire: 3,
  });
}
function fingertip(group, rand, x, y, tones, label) {
  addLine(group, wobblyRing(rand, x, y, 11, 11, 0.4, 12), tones.ink, 1, 0.6);
  addWash(group, rand, wobblyRing(rand, x, y, 14, 14, 1, 12), tones.gold, 0.35, "url(#bk-bleed)");
  if (label)
    addText(group, {
      t: label,
      tr: `translate(${roundCoord(x)} ${roundCoord(y - 20)})`,
      fs: 13,
      font: "Kalam, cursive",
      fill: tones.ink,
      o: 0.6,
    });
}
function arrowLine(group, rand, points, tones, opacity) {
  brushStroke(group, rand, points, 2, tones.ink, opacity ?? 0.55, { tip: 0.05, head: 0.1 });
  const prev = points[points.length - 2],
    tip = points[points.length - 1],
    angle = Math.atan2(tip[1] - prev[1], tip[0] - prev[0]);
  const barb = (splay) => [
    tip[0] - 9 * Math.cos(angle + splay),
    tip[1] - 9 * Math.sin(angle + splay),
  ];
  addLine(
    group,
    `M${roundCoord(barb(0.5)[0])} ${roundCoord(barb(0.5)[1])} L${roundCoord(tip[0])} ${roundCoord(tip[1])} L${roundCoord(barb(-0.5)[0])} ${roundCoord(barb(-0.5)[1])}`,
    tones.ink,
    1.3,
    opacity ?? 0.55,
  );
}
// glaze bucket, seen a little from above
function bucket(group, rand, cx, cy, scale, tones, glaze, label) {
  const scaled = (v) => v * scale;
  addSolid(
    group,
    wobblyRing(rand, cx + scaled(3), cy + scaled(4), scaled(30), scaled(8), 0.3, 10),
    tones.ink,
    0.15,
  );
  const outline = wobblyPolygon(
    rand,
    [
      [cx - scaled(30), cy - scaled(36)],
      [cx - scaled(26), cy],
      [cx + scaled(26), cy],
      [cx + scaled(30), cy - scaled(36)],
    ],
    0.4,
  );
  addSolid(group, outline, tones.wood, 1);
  addLine(group, outline.slice(0, outline.lastIndexOf(" Q")), tones.ink, 1.1, 0.9);
  [0.3, 0.75].forEach((band) =>
    addLine(
      group,
      wobblyLine(
        rand,
        [
          [cx - scaled(30 - 4 * band), cy - scaled(36 * (1 - band))],
          [cx, cy - scaled(36 * (1 - band)) + scaled(4)],
          [cx + scaled(30 - 4 * band), cy - scaled(36 * (1 - band))],
        ],
        0.2,
      ),
      tones.rope,
      2,
      0.9,
      true,
    ),
  );
  const rim = wobblyRing(rand, cx, cy - scaled(36), scaled(30), scaled(8), 0.2, 14);
  addSolid(group, rim, tones.woodDk, 1);
  addSolid(
    group,
    wobblyRing(rand, cx, cy - scaled(35), scaled(27), scaled(6.5), 0.2, 14),
    glaze,
    1,
  );
  addLine(group, rim, tones.ink, 1.1, 0.9);
  if (label)
    addText(group, {
      t: label,
      tr: `translate(${roundCoord(cx)} ${roundCoord(cy + scaled(20))})`,
      fs: 12,
      font: "Kalam, cursive",
      fill: tones.ink,
      o: 0.6,
    });
}
// brush, held at an angle
function brushTool(group, rand, x, y, angle, length, tones, ink) {
  const dirX = Math.cos(angle),
    dirY = Math.sin(angle),
    end = [x + dirX * length, y + dirY * length],
    ferrule = [x + dirX * length * 0.18, y + dirY * length * 0.18];
  brushStroke(group, rand, [ferrule, end], length / 30, tones.bamboo, 0.95, {
    blunt: true,
    tip: 0.9,
  });
  addLine(group, wobblyLine(rand, [ferrule, end], 0.2), tones.ink, 0.7, 0.5);
  brushStroke(group, rand, [[x, y], ferrule], length / 21, ink || tones.ink, 0.95, {
    tip: 0.05,
    head: 0.9,
  });
}
// pottery workshop, its climbing kiln, and the shelf in the waiting room
const WORKSHOP_WIDTH = 300,
  WORKSHOP_DEPTH = 140,
  WORKSHOP_HEIGHT = 100;
// short indigo curtain in the doorway, split in three
function noren(group, rand, project, x0, x1, topY, drop, tones, text) {
  const indigo = mix(tones.water, tones.ink, 0.45),
    panels = 3,
    panelWidth = (x1 - x0) / panels;
  for (let panel = 0; panel < panels; panel++) {
    const left = x0 + panel * panelWidth + 0.6,
      right = x0 + (panel + 1) * panelWidth - 0.6;
    const outline = wobblyPolygon(
      rand,
      projectAll(project, [
        [left, 0, topY],
        [right, 0, topY],
        [right, 0, topY - drop - jitter(rand, 1)],
        [left, 0, topY - drop - jitter(rand, 1)],
      ]),
      0.5,
    );
    addSolid(group, outline, indigo, 0.95);
    addLine(group, outline, tones.ink, 0.9, 0.85);
  }
  addLine(
    group,
    wobblySegment(rand, project(x0 - 4, 0, topY + 1), project(x1 + 4, 0, topY + 1), 0.3, 2),
    tones.woodDk,
    2.4,
    0.95,
    true,
  );
  const center = project((x0 + x1) / 2, 0, topY - drop * 0.45),
    size = Math.abs(project(0, 0, 0)[1] - project(0, 0, drop)[1]) * 0.42;
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(center[0])} ${roundCoord(center[1])})`,
    fs: size,
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
    o: 0.9,
  });
}
function workshopWalls(group, rand, project, tones) {
  face(
    group,
    rand,
    project,
    [
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
      [WORKSHOP_WIDTH, 0, WORKSHOP_HEIGHT],
    ],
    tones.plasterDk,
    tones,
  );
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, 0, WORKSHOP_HEIGHT],
      [0, 0, WORKSHOP_HEIGHT],
    ],
    tones.plaster,
    tones,
  );
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, 0, 46],
      [0, 0, 46],
    ],
    tones.wood,
    tones,
    1.1,
  );
  face(
    group,
    rand,
    project,
    [
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 46],
      [WORKSHOP_WIDTH, 0, 46],
    ],
    mix(tones.wood, tones.ink, 0.15),
    tones,
    1.1,
  );
  for (let x = 7; x < WORKSHOP_WIDTH; x += 9)
    addLine(
      group,
      wobblySegment(rand, project(x, 0, 1), project(x, 0, 45), 0.3, 2),
      tones.woodDk,
      0.8,
      0.55,
      true,
    );
  for (let z = 7; z < WORKSHOP_DEPTH; z += 9)
    addLine(
      group,
      wobblySegment(rand, project(WORKSHOP_WIDTH, z, 1), project(WORKSHOP_WIDTH, z, 45), 0.3, 2),
      tones.woodDk,
      0.8,
      0.5,
      true,
    );
  // the doorway, open, with the noren
  face(
    group,
    rand,
    project,
    [
      [118, 0, 0],
      [186, 0, 0],
      [186, 0, 76],
      [118, 0, 76],
    ],
    tones.deep,
    tones,
    1,
  );
  noren(group, rand, project, 118, 186, 76, 34, tones, "陶");
  [
    [32, 84],
    [222, 272],
  ].forEach(([left, right]) => {
    face(
      group,
      rand,
      project,
      [
        [left, 0, 54],
        [right, 0, 54],
        [right, 0, 82],
        [left, 0, 82],
      ],
      tones.deep,
      tones,
      0.9,
    );
    for (let x = left + 6; x < right; x += 7)
      addLine(
        group,
        wobblySegment(rand, project(x, 0, 55), project(x, 0, 81), 0.2, 1),
        tones.bamboo,
        1.6,
        0.9,
        true,
      );
  });
  [0, 118, 186, WORKSHOP_WIDTH].forEach((x) =>
    post(group, rand, project, x, 0, 0, WORKSHOP_HEIGHT, tones, 5),
  );
  post(group, rand, project, WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0, WORKSHOP_HEIGHT, tones, 5);
  addLine(
    group,
    wobblySegment(rand, project(0, 0, 46), project(WORKSHOP_WIDTH, 0, 46), 0.3, 2),
    tones.woodDk,
    3,
    0.9,
    true,
  );
}
// a long plank on two blocks, with bisque drying in the sun
function dryingBench(group, rand, project, x0, x1, z, tones, scale) {
  face(
    group,
    rand,
    project,
    [
      [x0, z, 12],
      [x1, z, 12],
      [x1, z + 10, 12],
      [x0, z + 10, 12],
    ],
    tones.woodLt,
    tones,
    1,
  );
  face(
    group,
    rand,
    project,
    [
      [x0, z, 9],
      [x1, z, 9],
      [x1, z, 12],
      [x0, z, 12],
    ],
    tones.wood,
    tones,
    0.9,
  );
  [x0 + 6, x1 - 10].forEach((x) =>
    face(
      group,
      rand,
      project,
      [
        [x, z, 0],
        [x + 5, z, 0],
        [x + 5, z, 9],
        [x, z, 9],
      ],
      tones.woodDk,
      tones,
      0.8,
    ),
  );
  ["cup", "bowl", "yunomi", "hira", "bowl"].forEach((kind, i) => {
    const spot = project(lerp(x0 + 10, x1 - 10, i / 4), z + 5, 12);
    piece(
      group,
      rand,
      spot[0],
      spot[1] - 1,
      scale,
      tones,
      Object.assign(
        { clay: [0, 3, 0, 1, 3][i], glaze: { none: true }, fire: 11 + i },
        PROFILES[kind],
      ),
    );
  });
}
// climbing kiln
function noborigama(groups, rand, baseX, baseY, tones, lit) {
  const chambers = 4,
    chamberWidth = 92,
    archHeight = 46,
    chamberDepth = 46,
    rise = 17,
    brick = mix(tones.earth, tones.kura, 0.35);
  const project = (x, z, y) => [baseX + x + z * 0.6, baseY - z * 0.42 - y];
  const group = newGroup();
  addWash(
    group,
    rand,
    wobblyPolygon(
      rand,
      projectAll(project, [
        [-30, -30, 0],
        [chamberWidth + 30, -30, 0],
        [chamberWidth + 30, chambers * chamberDepth + 40, chambers * rise],
        [-30, chambers * chamberDepth + 40, chambers * rise],
      ]),
      4,
    ),
    tones.earth,
    0.3,
    "url(#bk-pool)",
  );
  groups.push(group);
  // chimney at the top end of the slope
  const chimney = newGroup(),
    chimneyZ = chambers * chamberDepth + 4,
    chimneyY = chambers * rise,
    chimneyX = chamberWidth / 2 - 10;
  face(
    chimney,
    rand,
    project,
    [
      [chimneyX, chimneyZ, chimneyY],
      [chimneyX + 20, chimneyZ, chimneyY],
      [chimneyX + 20, chimneyZ, chimneyY + 140],
      [chimneyX, chimneyZ, chimneyY + 140],
    ],
    brick,
    tones,
    1.1,
  );
  face(
    chimney,
    rand,
    project,
    [
      [chimneyX + 20, chimneyZ, chimneyY],
      [chimneyX + 20, chimneyZ + 20, chimneyY],
      [chimneyX + 20, chimneyZ + 20, chimneyY + 140],
      [chimneyX + 20, chimneyZ, chimneyY + 140],
    ],
    mix(brick, tones.ink, 0.2),
    tones,
    1.1,
  );
  for (let y = 10; y < 140; y += 10)
    addLine(
      chimney,
      wobblySegment(
        rand,
        project(chimneyX, chimneyZ, chimneyY + y),
        project(chimneyX + 20, chimneyZ, chimneyY + y),
        0.2,
        1,
      ),
      tones.ink,
      0.5,
      0.35,
    );
  groups.push(chimney);
  const smoke = newGroup({ washO: 0.5 }),
    smokeFrom = project(chimneyX + 12, chimneyZ + 8, chimneyY + 146);
  const smokePath = [
    smokeFrom,
    [smokeFrom[0] - 12, smokeFrom[1] - 40],
    [smokeFrom[0] + 10, smokeFrom[1] - 80],
    [smokeFrom[0] - 6, smokeFrom[1] - 120],
    [smokeFrom[0] - 40, smokeFrom[1] - 160],
  ];
  brushWash(
    smoke,
    rand,
    smokePath,
    lit ? 24 : 12,
    mix(tones.inkSoft, tones.paper, 0.5),
    lit ? 0.55 : 0.3,
  );
  brushStroke(smoke, rand, smokePath, 1.4, tones.inkSoft, 0.35, { tip: 0.1, head: 0.05 });
  groups.push(smoke);
  for (let i = chambers - 1; i >= 0; i--) {
    const chamberZ = i * chamberDepth,
      chamberY = i * rise,
      chamberGroup = newGroup();
    const arch = (z, steps) =>
      Array.from({ length: (steps || 12) + 1 }, (_, step) => {
        const angle = Math.PI * (step / (steps || 12));
        return project(
          (chamberWidth / 2) * (1 - Math.cos(angle)),
          z,
          chamberY + Math.sin(angle) * archHeight,
        );
      });
    const frontArch = arch(chamberZ),
      backArch = arch(chamberZ + chamberDepth);
    // barrel roof, then the front face of this chamber
    addSolid(
      chamberGroup,
      wobblyPolygon(rand, [...frontArch.slice(3), ...backArch.slice(3).reverse()], 0.4),
      mix(brick, tones.paper, 0.18),
      1,
    );
    for (let rib = 1; rib < 4; rib++)
      addLine(
        chamberGroup,
        wobblyLine(rand, arch(chamberZ + (chamberDepth * rib) / 4).slice(4), 0.3),
        tones.ink,
        0.6,
        0.4,
      );
    addLine(chamberGroup, wobblyLine(rand, backArch.slice(4), 0.4), tones.ink, 1, 0.8);
    addLine(chamberGroup, wobblyLine(rand, [frontArch[12], backArch[12]], 0.3), tones.ink, 1, 0.85);
    const frontFace = wobblyPolygon(rand, [...frontArch, project(0, chamberZ, chamberY)], 0.4);
    addSolid(chamberGroup, frontFace, mix(brick, tones.ink, 0.1), 1);
    addLine(chamberGroup, wobblyLine(rand, frontArch, 0.4), tones.ink, 1.3, 0.95);
    addLine(chamberGroup, wobblyLine(rand, [frontArch[0], frontArch[12]], 0.3), tones.ink, 1, 0.9);
    // bricked-up door in the face, with a stoking hole in it
    const glowing = lit && i < 3,
      stokeHole = project(
        chamberWidth * 0.93,
        chamberZ + chamberDepth * 0.5,
        chamberY + archHeight * 0.42,
      );
    if (glowing)
      addWash(
        chamberGroup,
        rand,
        wobblyRing(rand, stokeHole[0], stokeHole[1], 16, 12, 2, 10),
        tones.gold,
        0.6,
        "url(#bk-bleed)",
      );
    addSolid(
      chamberGroup,
      wobblyRing(rand, stokeHole[0], stokeHole[1], 4, 5.5, 0.3, 9),
      glowing ? mix(tones.gold, tones.red, 0.4) : tones.deep,
      1,
    );
    addLine(
      chamberGroup,
      wobblyRing(rand, stokeHole[0], stokeHole[1], 4, 5.5, 0.3, 9),
      tones.ink,
      0.9,
      0.9,
    );
    groups.push(chamberGroup);
  }
  // the firebox at the foot
  const firebox = newGroup(),
    mouth = project(chamberWidth / 2, -10, 0);
  if (lit)
    addWash(
      firebox,
      rand,
      wobblyRing(rand, mouth[0], mouth[1] - 10, 30, 20, 3, 10),
      tones.gold,
      0.65,
      "url(#bk-bleed)",
    );
  inked(
    firebox,
    rand,
    wobblyPolygon(
      rand,
      [
        [mouth[0] - 32, mouth[1] + 4],
        [mouth[0] - 26, mouth[1] - 24],
        [mouth[0] + 26, mouth[1] - 24],
        [mouth[0] + 32, mouth[1] + 4],
      ],
      0.6,
    ),
    mix(brick, tones.ink, 0.1),
    tones.ink,
    1.2,
  );
  addSolid(
    firebox,
    wobblyPolygon(
      rand,
      [
        [mouth[0] - 12, mouth[1] + 2],
        [mouth[0] - 10, mouth[1] - 15],
        [mouth[0] + 10, mouth[1] - 15],
        [mouth[0] + 12, mouth[1] + 2],
      ],
      0.4,
    ),
    lit ? mix(tones.gold, tones.red, 0.35) : tones.deep,
    1,
  );
  groups.push(firebox);
}
// what you see from above when the workshop roof is lifted
function workshopInside(groups, rand, project, tones, scale) {
  scale = scale || 1;
  const group = newGroup();
  groups.push(group);
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [0, WORKSHOP_DEPTH, 0],
    ],
    mix(tones.earth, tones.paper, 0.35),
    tones,
    1,
    1,
  );
  for (let k = 0; k < 60; k++) {
    const spot = project(rand() * WORKSHOP_WIDTH, rand() * WORKSHOP_DEPTH, 0);
    addSolid(
      group,
      wobblyRing(rand, spot[0], spot[1], 0.6 * scale, 0.4 * scale, 0.1, 5),
      tones.earth,
      0.4,
    );
  }
  face(
    group,
    rand,
    project,
    [
      [0, 0, 0],
      [0, WORKSHOP_DEPTH, 0],
      [0, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
      [0, 0, WORKSHOP_HEIGHT],
    ],
    tones.plasterDk,
    tones,
  );
  face(
    group,
    rand,
    project,
    [
      [0, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
      [0, WORKSHOP_DEPTH, WORKSHOP_HEIGHT],
    ],
    tones.plaster,
    tones,
  );
  const wallCount = groups.length;
  // shelves of bisque along the back wall
  [30, 58].forEach((y, row) => {
    const plank = newGroup();
    groups.push(plank);
    face(
      plank,
      rand,
      project,
      [
        [14, WORKSHOP_DEPTH, y],
        [150, WORKSHOP_DEPTH, y],
        [150, WORKSHOP_DEPTH - 12, y],
        [14, WORKSHOP_DEPTH - 12, y],
      ],
      tones.woodLt,
      tones,
      0.9,
    );
    for (let i = 0; i < 6; i++) {
      const spot = project(24 + i * 22, WORKSHOP_DEPTH - 6, y);
      const pot = newGroup();
      groups.push(pot);
      const profile = PROFILES[["cup", "bowl", "yunomi", "hira", "bowl", "cup"][(i + row) % 6]],
        potScale = 0.28 * scale;
      piece(
        pot,
        rand,
        spot[0],
        spot[1] - (radiusAt(profile.prof, 0) * 0.3 + 5) * potScale,
        potScale,
        tones,
        Object.assign(
          { clay: (i + row) % 2 ? 0 : 3, glaze: { none: true }, fire: i + row * 7 },
          profile,
        ),
      );
    }
  });
  // glaze buckets on the right
  GLAZES(tones)
    .slice(0, 5)
    .forEach((glazeColor, i) => {
      const spot = project(196 + i * 20, WORKSHOP_DEPTH - 18 - (i % 2) * 12, 0);
      const bucketGroup = newGroup();
      groups.push(bucketGroup);
      bucket(bucketGroup, rand, spot[0], spot[1], 0.36 * scale, tones, glazeColor);
    });
  // the kick wheel in the middle, with a lump of clay
  const wheelGroup = newGroup();
  groups.push(wheelGroup);
  const wheelAt = project(84, 62, 0);
  wheel(wheelGroup, rand, wheelAt[0], wheelAt[1] - 18 * scale, 0.42 * scale, tones);
  const clayGroup = newGroup();
  groups.push(clayGroup);
  wetClay(
    clayGroup,
    rand,
    wheelAt[0],
    wheelAt[1] - 20 * scale,
    0.3 * scale,
    tones,
    [
      [18, 0],
      [22, 0.4],
      [16, 1],
    ],
    30,
  );
  addSolid(
    wheelGroup,
    wobblyRing(rand, wheelAt[0] - 34 * scale, wheelAt[1] + 6 * scale, 9 * scale, 4 * scale, 0.3, 8),
    tones.woodDk,
    0.95,
  );
  // the painting table by the right window
  const table = newGroup();
  groups.push(table);
  face(
    table,
    rand,
    project,
    [
      [280, 30, 0],
      [280, 70, 0],
      [280, 70, 18],
      [280, 30, 18],
    ],
    tones.wood,
    tones,
    1,
  );
  face(
    table,
    rand,
    project,
    [
      [200, 30, 18],
      [280, 30, 18],
      [280, 70, 18],
      [200, 70, 18],
    ],
    tones.woodLt,
    tones,
    1,
  );
  [
    [200, 30],
    [280, 30],
  ].forEach(([x, z]) => post(table, rand, project, x, z, 0, 18, tones, 3));
  const tableTop = project(226, 50, 18);
  const tableItems = newGroup();
  groups.push(tableItems);
  piece(
    tableItems,
    rand,
    tableTop[0],
    tableTop[1],
    0.3 * scale,
    tones,
    Object.assign({ clay: 3, glaze: { c: 1, dip: 0.7 }, fire: 4 }, PROFILES.bowl),
  );
  const brushTip = project(246, 60, 18),
    brushEnd = project(274, 60, 18),
    brushLength = Math.hypot(brushEnd[0] - brushTip[0], brushEnd[1] - brushTip[1]),
    lift = brushLength / 50;
  addLine(
    tableItems,
    wobblySegment(rand, brushTip, brushEnd, 0.2, 2),
    tones.ink,
    brushLength / 25,
    0.15,
  );
  brushTool(
    tableItems,
    rand,
    brushTip[0],
    brushTip[1] - lift,
    Math.atan2(brushEnd[1] - brushTip[1], brushEnd[0] - brushTip[0]),
    brushLength,
    tones,
    PAINTS(tones)[0],
  );
  [0, 1, 2].forEach((i) => {
    const spot = project(256 + i * 7, 42, 18);
    addSolid(
      tableItems,
      wobblyRing(rand, spot[0], spot[1], 3 * scale, 1.5 * scale, 0.2, 8),
      PAINTS(tones)[i],
      0.95,
    );
  });
  return wallCount;
}
function sceneGarden16(tones, stage, opt = {}) {
  const open = stage === "open";
  const rand = rng(hash("tea/garden16")),
    width = 1100,
    height = 690,
    groups = [],
    clips = [];
  const ground = newGroup({ washO: 0.35 });
  [
    [240, 470, 220, 50],
    [700, 640, 240, 34],
    [900, 470, 140, 40],
  ].forEach(([x, y, rx, ry]) =>
    addWash(
      ground,
      rand,
      wobblyRing(rand, x, y, rx, ry, ry * 0.3, 12),
      tones.moss,
      0.22,
      "url(#bk-pool)",
    ),
  );
  for (let i = 0; i < 120; i++) {
    const x = rand() * width,
      y = 120 + rand() * (height - 130);
    addSolid(
      ground,
      wobblyRing(rand, x, y, 0.9 + rand() * 1.2, 0.7 + rand() * 0.8, 0.3, 6),
      tones.mossDk,
      0.1 + rand() * 0.15,
    );
  }
  groups.push(ground);
  const path = newGroup();
  steppingStones(
    path,
    rand,
    [
      [420, 686],
      [446, 648],
      [476, 612],
      [512, 580],
      [550, 552],
      [590, 528],
      [628, 506],
      [380, 664],
      [330, 668],
      [280, 676],
    ],
    tones,
    0.9,
  );
  groups.push(path);

  // workshop
  const workshopProject = oblique(470, 452),
    workshopShadow = newGroup();
  addWash(
    workshopShadow,
    rand,
    wobblyPolygon(
      rand,
      projectAll(workshopProject, [
        [-14, -16, 0],
        [WORKSHOP_WIDTH + 16, -16, 0],
        [WORKSHOP_WIDTH + 16, WORKSHOP_DEPTH + 12, 0],
        [-14, WORKSHOP_DEPTH + 12, 0],
      ]),
      3,
    ),
    tones.pool,
    0.6,
    "url(#bk-pool)",
  );
  groups.push(workshopShadow);
  if (!open) {
    const walls = newGroup();
    workshopWalls(walls, rand, workshopProject, tones);
    groups.push(walls);
    const roof = newGroup({ cls: "roji-roof" });
    gableRoof(
      roof,
      rand,
      workshopProject,
      WORKSHOP_WIDTH,
      WORKSHOP_DEPTH,
      WORKSHOP_HEIGHT,
      72,
      20,
      tones,
      "thatch",
    );
    plaque(
      roof,
      rand,
      ...workshopProject(152, -20, WORKSHOP_HEIGHT - 14),
      40,
      16,
      "工房",
      "'Yuji Syuku', serif",
      11,
      tones,
    );
    groups.push(roof);
  } else {
    workshopInside(groups, rand, workshopProject, tones);
    const lowWalls = newGroup();
    face(
      lowWalls,
      rand,
      workshopProject,
      [
        [WORKSHOP_WIDTH, 0, 0],
        [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
        [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 26],
        [WORKSHOP_WIDTH, 0, 26],
      ],
      mix(tones.wood, tones.ink, 0.15),
      tones,
      1.1,
    );
    face(
      lowWalls,
      rand,
      workshopProject,
      [
        [0, 0, 0],
        [118, 0, 0],
        [118, 0, 22],
        [0, 0, 22],
      ],
      tones.wood,
      tones,
      1.1,
    );
    face(
      lowWalls,
      rand,
      workshopProject,
      [
        [186, 0, 0],
        [WORKSHOP_WIDTH, 0, 0],
        [WORKSHOP_WIDTH, 0, 22],
        [186, 0, 22],
      ],
      tones.wood,
      tones,
      1.1,
    );
    [0, 118, 186, WORKSHOP_WIDTH].forEach((x) =>
      post(lowWalls, rand, workshopProject, x, 0, 0, 22, tones, 5),
    );
    [
      [0, WORKSHOP_DEPTH],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH],
    ].forEach(([x, z]) =>
      post(lowWalls, rand, workshopProject, x, z, 0, WORKSHOP_HEIGHT, tones, 5),
    );
    plaque(
      lowWalls,
      rand,
      ...workshopProject(152, -6, 14),
      36,
      14,
      "工房",
      "'Yuji Syuku', serif",
      10,
      tones,
    );
    groups.push(lowWalls);
  }
  const bench = newGroup();
  dryingBench(bench, rand, workshopProject, 8, 104, -26, tones, 0.3);
  groups.push(bench);
  noborigama(groups, rand, 870, 612, tones, open);
  const bamboo = [];
  bambooClump(bamboo, rng(hash("bb")), 250, 404, tones, 1, opt.cut);
  groups.push({ cls: "roji-bamboo", groups: bamboo });

  // waiting room
  const waitingProject = oblique(36, 664),
    waitingRoom = newGroup({ cls: "roji-machiai" }),
    waitingHeight = 178;
  addWash(
    waitingRoom,
    rand,
    wobblyPolygon(
      rand,
      projectAll(waitingProject, [
        [-10, -10, 0],
        [224, -10, 0],
        [224, 90, 0],
        [-10, 90, 0],
      ]),
      3,
    ),
    tones.pool,
    0.6,
    "url(#bk-pool)",
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 0, 0],
      [0, 80, 0],
      [0, 80, waitingHeight],
      [0, 0, waitingHeight],
    ],
    tones.plasterDk,
    tones,
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 80, 0],
      [214, 80, 0],
      [214, 80, waitingHeight],
      [0, 80, waitingHeight],
    ],
    tones.plaster,
    tones,
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 0, 0],
      [214, 0, 0],
      [214, 80, 0],
      [0, 80, 0],
    ],
    tones.earth,
    tones,
    1,
    1.2,
  );
  post(waitingRoom, rand, waitingProject, 0, 0, 0, waitingHeight, tones);
  post(waitingRoom, rand, waitingProject, 0, 80, 0, waitingHeight, tones);
  post(waitingRoom, rand, waitingProject, 214, 80, 0, waitingHeight, tones);
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [0, 80, waitingHeight],
      [214, 80, waitingHeight],
      [214, 84, waitingHeight],
      [0, 84, waitingHeight],
    ],
    tones.wood,
    tones,
    1,
  );
  face(
    waitingRoom,
    rand,
    waitingProject,
    [
      [156, 80, 66],
      [202, 80, 66],
      [202, 80, 116],
      [156, 80, 116],
    ],
    tones.glowSoft,
    tones,
    0.9,
  );
  for (let x = 162; x < 202; x += 8)
    addLine(
      waitingRoom,
      wobblySegment(rand, waitingProject(x, 80, 67), waitingProject(x, 80, 115), 0.2, 1),
      tones.bamboo,
      1.2,
      0.8,
      true,
    );
  groups.push(waitingRoom);
  const shelf = newGroup();
  addWash(
    shelf,
    rand,
    wobblyPolygon(
      rand,
      projectAll(waitingProject, [
        [14, 80, 24],
        [144, 80, 24],
        [144, 80, 168],
        [14, 80, 168],
      ]),
      3,
    ),
    tones.glowSoft,
    0.45,
    "url(#bk-bleed)",
  );
  [36, 82, 128].forEach((y, row) => {
    face(
      shelf,
      rand,
      waitingProject,
      [
        [16, 80, y],
        [142, 80, y],
        [142, 70, y],
        [16, 70, y],
      ],
      tones.woodLt,
      tones,
      0.9,
    );
    for (let i = 0; i < 5; i++) {
      const spot = waitingProject(28 + i * 26, 75, y);
      const spec = opt.shelf ? opt.shelf(row * 5 + i) : demoSpec("g" + row + i);
      if (spec) piece(shelf, rand, spot[0], spot[1] - 1, 0.24, tones, spec);
    }
  });
  groups.push(shelf);
  const waitingBench = newGroup();
  face(
    waitingBench,
    rand,
    waitingProject,
    [
      [10, 26, 0],
      [204, 26, 0],
      [204, 26, 18],
      [10, 26, 18],
    ],
    tones.woodDk,
    tones,
    1.1,
  );
  face(
    waitingBench,
    rand,
    waitingProject,
    [
      [10, 26, 18],
      [204, 26, 18],
      [204, 56, 18],
      [10, 56, 18],
    ],
    tones.wood,
    tones,
    1.1,
  );
  groups.push(waitingBench);

  // one stone, before the workshop door
  if (open) {
    const doorStone = newGroup();
    stone(doorStone, rand, 664, 506, 30, 11, tones);
    groups.push(doorStone);
  } else {
    const seki = [];
    sekiStone(seki, rand, 640, 504, 1.15, tones, false);
    groups.push({ cls: "roji-stone", groups: seki });
  }
  const clouds = newGroup({ washO: 0.5 }),
    grey = mix(tones.inkSoft, tones.paper, 0.55);
  mist(clouds, rand, 760, 1110, 128, 34, grey, 0.7, mix(grey, tones.ink, 0.25));
  groups.push(clouds);
  return { W: width, H: height, groups, clips };
}
// workshop, step by step
const note = (group, x, y, text, tones, fontSize, opacity) =>
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: fontSize || 15,
    font: "Kalam, cursive",
    fill: tones.ink,
    o: opacity ?? 0.65,
  });
const kanji = (group, x, y, text, tones, fontSize) =>
  addText(group, {
    t: text,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: fontSize || 24,
    font: "'Yuji Syuku', serif",
    fill: tones.ink,
    o: 0.85,
  });
function frames(group, rand, labels, tones, H) {
  const count = labels.length,
    width = 1100 / count;
  labels.forEach(([glyph, caption], i) => {
    kanji(group, i * width + 26, 44, glyph, tones);
    note(group, i * width + 26 + 30 + caption.length * 3.6, 44, caption, tones, 17, 0.75);
    if (i)
      addLine(
        group,
        wobblySegment(rand, [i * width, 80], [i * width, H - 30], 0.6, 3),
        tones.ink,
        0.8,
        0.18,
      );
  });
  return (i) => i * width + width / 2;
}
// hotspot in the workshop
function hotspot(group, rand, x, y, glyph, caption, tones) {
  addWash(group, rand, wobblyRing(rand, x, y, 40, 26, 3, 12), tones.gold, 0.32, "url(#bk-bleed)");
  inked(group, rand, wobblyRing(rand, x, y - 64, 15, 15, 0.4, 12), tones.paper, tones.ink, 1);
  kanji(group, x, y - 63, glyph, tones, 16);
  note(group, x, y - 38, caption, tones, 13, 0.7);
}
// inside the workshop, once the roof has lifted
function sceneWorkshop(tones) {
  const rand = rng(hash("tea/workshop")),
    width = 1100,
    height = 560,
    groups = [];
  const project = obliqueScaled(40, 500, 2.55),
    scale = 2.55;
  const backLink = newGroup({ cls: "kobo-back" });
  note(backLink, 110, 34, "← back to the garden", tones, 17, 0.75);
  groups.push(backLink);
  const wallCount = workshopInside(groups, rand, project, tones, scale);
  const door = newGroup();
  face(
    door,
    rand,
    project,
    [
      [160, WORKSHOP_DEPTH, 0],
      [190, WORKSHOP_DEPTH, 0],
      [190, WORKSHOP_DEPTH, 72],
      [160, WORKSHOP_DEPTH, 72],
    ],
    tones.glowSoft,
    tones,
    1,
  );
  const doorAt = project(175, WORKSHOP_DEPTH, 30);
  addWash(
    door,
    rand,
    wobblyRing(rand, doorAt[0], doorAt[1], 30, 70, 3, 10),
    tones.gold,
    0.4,
    "url(#bk-bleed)",
  );
  groups.splice(wallCount, 0, door);
  const front = newGroup();
  face(
    front,
    rand,
    project,
    [
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 0],
      [WORKSHOP_WIDTH, WORKSHOP_DEPTH, 16],
      [WORKSHOP_WIDTH, 0, 16],
    ],
    mix(tones.wood, tones.ink, 0.15),
    tones,
    1.1,
  );
  face(
    front,
    rand,
    project,
    [
      [0, 0, 0],
      [WORKSHOP_WIDTH, 0, 0],
      [WORKSHOP_WIDTH, 0, 12],
      [0, 0, 12],
    ],
    tones.wood,
    tones,
    1.1,
  );
  [0, WORKSHOP_WIDTH].forEach((x) => post(front, rand, project, x, 0, 0, 12, tones, 9));
  [
    [0, WORKSHOP_DEPTH],
    [WORKSHOP_WIDTH, WORKSHOP_DEPTH],
  ].forEach(([x, z]) => post(front, rand, project, x, z, 0, WORKSHOP_HEIGHT, tones, 9));
  groups.push(front);

  const spots = [
    ["wheel", 60, 40, 6, "轆", "the wheel"],
    ["shelf", 84, WORKSHOP_DEPTH - 12, 72, "棚", "drying shelf"],
    ["glaze", 236, WORKSHOP_DEPTH - 24, 14, "釉", "glazes"],
    ["brush", 196, 14, 14, "筆", "brush & seal"],
    ["kiln", 175, WORKSHOP_DEPTH, 65, "窯", "out to the kiln"],
  ].map(([id, x, z, y, glyph, caption]) => {
    const [spotX, spotY] = project(x, z, y),
      hotspotGroup = newGroup({ cls: "kobo-" + id });
    hotspot(hotspotGroup, rand, spotX, spotY, glyph, caption, tones);
    groups.push(hotspotGroup);
    return { id, x: Math.round(spotX), y: Math.round(spotY) };
  });
  return { W: width, H: height, groups, clips: [], spots };
}
// throwing
function sceneWheel(tones) {
  const rand = rng(hash("tea/wheel")),
    width = 1100,
    height = 470,
    groups = [],
    y = 330,
    scale = 1.25;
  const labels = newGroup(),
    centerOf = frames(
      labels,
      rand,
      [
        ["一", "centre"],
        ["二", "open"],
        ["三", "pull up"],
        ["四", "shape"],
      ],
      tones,
      height,
    );
  groups.push(labels);
  const panels = [0, 1, 2, 3].map(() => newGroup());
  panels.forEach((group, i) => {
    wheel(group, rand, centerOf(i), y, scale, tones);
  });
  // wobbly lump
  wetClay(
    panels[0],
    rand,
    centerOf(0) + 3,
    y - 2,
    scale,
    tones,
    [
      [30, 0],
      [36, 0.35],
      [28, 0.8],
      [14, 1],
    ],
    40,
  );
  fingertip(panels[0], rand, centerOf(0) - 66, y - 34, tones);
  fingertip(panels[0], rand, centerOf(0) + 66, y - 34, tones);
  arrowLine(
    panels[0],
    rand,
    [
      [centerOf(0) - 100, y - 34],
      [centerOf(0) - 80, y - 34],
    ],
    tones,
  );
  arrowLine(
    panels[0],
    rand,
    [
      [centerOf(0) + 100, y - 34],
      [centerOf(0) + 80, y - 34],
    ],
    tones,
  );
  spin(panels[0], rand, centerOf(0), y + 8, 74, 20, tones);
  note(panels[0], centerOf(0), y + 124, "hold both sides still while it spins", tones);
  // press a thumb into the middle
  wetClay(
    panels[1],
    rand,
    centerOf(1),
    y - 2,
    scale,
    tones,
    [
      [30, 0],
      [33, 0.4],
      [32, 0.9],
      [26, 1],
    ],
    34,
  );
  fingertip(panels[1], rand, centerOf(1), y - 64, tones);
  arrowLine(
    panels[1],
    rand,
    [
      [centerOf(1), y - 120],
      [centerOf(1), y - 80],
    ],
    tones,
  );
  spin(panels[1], rand, centerOf(1), y + 8, 74, 20, tones);
  note(panels[1], centerOf(1), y + 124, "press down, not too deep", tones);
  // pull the wall up between two fingers
  addLine(
    panels[2],
    wobblyLine(
      rand,
      [
        [centerOf(2) - 40, y - 2],
        [centerOf(2) - 42, y - 42],
      ],
      0.4,
    ),
    tones.ink,
    1,
    0.25,
  );
  wetClay(
    panels[2],
    rand,
    centerOf(2),
    y - 2,
    scale,
    tones,
    [
      [26, 0],
      [27, 0.4],
      [25, 0.9],
      [23, 1],
    ],
    70,
  );
  fingertip(panels[2], rand, centerOf(2) + 38, y - 70, tones);
  arrowLine(
    panels[2],
    rand,
    [
      [centerOf(2) + 60, y - 30],
      [centerOf(2) + 60, y - 110],
    ],
    tones,
  );
  spin(panels[2], rand, centerOf(2), y + 8, 74, 20, tones);
  note(panels[2], centerOf(2), y + 124, "drag upward along the wall", tones);
  // drag the profile out or in; dots show where your finger can catch it
  const profile = [
    [24, 0],
    [38, 0.25],
    [50, 0.65],
    [54, 1],
  ];
  wetClay(panels[3], rand, centerOf(3), y - 2, scale, tones, profile, 46);
  const lumpHeight = 46 * scale,
    lumpTop = y - 2 - lumpHeight;
  profile.forEach(([radius, level]) => {
    const dot = [centerOf(3) + radius * scale, lumpTop + (1 - level) * lumpHeight];
    inked(
      panels[3],
      rand,
      wobblyRing(rand, dot[0], dot[1], 3.5, 3.5, 0.2, 8),
      tones.paper,
      tones.ink,
      1,
    );
  });
  fingertip(panels[3], rand, centerOf(3) + 50 * scale + 10, lumpTop + 0.35 * lumpHeight, tones);
  arrowLine(
    panels[3],
    rand,
    [
      [centerOf(3) + 40, lumpTop + 20],
      [centerOf(3) + 92, lumpTop + 6],
    ],
    tones,
  );
  spin(panels[3], rand, centerOf(3), y + 8, 74, 20, tones);
  note(panels[3], centerOf(3), y + 124, "pull out for a bowl, in for a cup", tones);
  panels.forEach((group) => groups.push(group));
  return { W: width, H: height, groups, clips: [] };
}
// what the same lump can become
function sceneShapes(tones) {
  const rand = rng(hash("tea/shapes")),
    width = 1100,
    height = 420,
    group = newGroup(),
    y = 300;
  [
    ["plate", "press down and out", 0.95],
    ["hira", "a wide shallow bowl", 1.2],
    ["bowl", "a tea bowl", 1.4],
    ["yunomi", "a tall cup", 1.5],
    ["cup", "a cup, with a handle", 1.5],
  ].forEach(([kind, caption, scale], i) => {
    const x = 110 + i * 220;
    wetClay(group, rand, x, y, scale, tones, PROFILES[kind].prof, PROFILES[kind].H);
    note(group, x, y + 80, caption, tones);
  });
  // handle
  const handleX = 990,
    handleY = 150;
  brushStroke(
    group,
    rand,
    [
      [handleX - 60, handleY - 60],
      [handleX - 40, handleY - 40],
      [handleX - 30, handleY - 12],
    ],
    7,
    CLAYS(tones)[0],
    1,
    { blunt: true, tip: 0.6 },
  );
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [handleX - 60, handleY - 60],
        [handleX - 40, handleY - 40],
        [handleX - 30, handleY - 12],
      ],
      0.3,
    ),
    tones.ink,
    0.8,
    0.6,
  );
  fingertip(group, rand, handleX - 66, handleY - 66, tones);
  arrowLine(
    group,
    rand,
    [
      [handleX - 20, handleY - 10],
      [handleX - 8, y - 70],
    ],
    tones,
    0.45,
  );
  note(group, handleX - 40, handleY - 92, "pull a handle", tones, 13);
  return { W: width, H: height, groups: [group], clips: [] };
}
// inside one chamber of the kiln
function chamber(group, rand, cx, cy, width, height, tones, heat) {
  const flame = [
    mix(tones.red, tones.ink, 0.2),
    mix(tones.red, tones.gold, 0.4),
    tones.gold,
    mix(tones.gold, tones.paper, 0.6),
  ][heat];
  const arch = Array.from({ length: 17 }, (_, i) => {
    const angle = Math.PI * (i / 16);
    return [cx - (Math.cos(angle) * width) / 2, cy - Math.sin(angle) * height];
  });
  addSolid(
    group,
    wobblyPolygon(
      rand,
      [...arch, [cx + width / 2 + 14, cy + 12], [cx - width / 2 - 14, cy + 12]],
      0.5,
    ),
    mix(tones.earth, tones.kura, 0.35),
    1,
  );
  addSolid(group, wobblyPolygon(rand, arch, 0.4), mix(tones.deep, flame, 0.35), 1);
  addWash(
    group,
    rand,
    wobblyRing(rand, cx, cy - height * 0.35, width * 0.45, height * 0.6, 3, 12),
    flame,
    0.75,
    "url(#bk-bleed)",
  );
  addLine(group, wobblyLine(rand, arch, 0.4), tones.ink, 1.4, 0.95);
  for (let ring = 1; ring < 4; ring++)
    addLine(
      group,
      wobblyLine(
        rand,
        arch
          .map(([x, y]) => [cx + (x - cx) * (1 + ring * 0.07), cy + (y - cy) * (1 + ring * 0.08)])
          .slice(1, 16),
        0.3,
      ),
      tones.ink,
      0.6,
      0.4,
    );
  addLine(
    group,
    wobblySegment(rand, [cx - width / 2, cy], [cx + width / 2, cy], 0.4, 2),
    tones.ink,
    1.2,
    0.9,
  );
  [cy - height * 0.48].forEach((shelfY) => {
    inked(
      group,
      rand,
      wobblyBox(rand, cx - width * 0.4, shelfY, cx + width * 0.4, shelfY + 5, 0.3),
      mix(tones.earth, tones.paper, 0.2),
      tones.ink,
      0.9,
    );
    [cx - width * 0.3, cx + width * 0.3].forEach((x) =>
      addLine(
        group,
        wobblySegment(rand, [x, shelfY + 5], [x, cy], 0.3, 2),
        tones.ink,
        3,
        0.6,
        true,
      ),
    );
  });
}
function heatBar(group, rand, x, y, width, tones, current, bandFrom, bandTo) {
  const colors = [
    mix(tones.red, tones.ink, 0.2),
    mix(tones.red, tones.gold, 0.4),
    tones.gold,
    mix(tones.gold, tones.paper, 0.6),
  ];
  colors.forEach((color, i) =>
    addSolid(
      group,
      wobblyBox(rand, x + (i * width) / 4, y, x + ((i + 1) * width) / 4, y + 10, 0.2),
      color,
      0.85,
    ),
  );
  addLine(group, wobblyBox(rand, x, y, x + width, y + 10, 0.3), tones.ink, 1, 0.8);
  addLine(
    group,
    wobblyBox(rand, x + bandFrom * width, y - 4, x + bandTo * width, y + 14, 0.3),
    tones.ink,
    1.4,
    0.9,
  );
  addLine(
    group,
    `M${roundCoord(x + current * width)} ${roundCoord(y - 10)} L${roundCoord(x + current * width - 5)} ${roundCoord(y - 18)} L${roundCoord(x + current * width + 5)} ${roundCoord(y - 18)} Z`,
    tones.ink,
    1.2,
    0.9,
  );
}
// tongs holding a piece upside down by its foot
function tongs(group, rand, x, y, tones) {
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x - 6, y - 8],
        [x - 18, y - 70],
        [x - 4, y - 120],
      ],
      0.3,
    ),
    tones.iron,
    3,
    0.95,
    true,
  );
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x + 6, y - 8],
        [x + 18, y - 70],
        [x + 4, y - 120],
      ],
      0.3,
    ),
    tones.iron,
    3,
    0.95,
    true,
  );
}
function sceneKiln(tones) {
  const rand = rng(hash("tea/kiln")),
    width = 1100,
    height = 460,
    groups = [],
    y = 330;
  const labels = newGroup(),
    centerOf = frames(
      labels,
      rand,
      [
        ["一", "first firing"],
        ["二", "dip"],
        ["三", "drip"],
        ["四", "glaze firing"],
      ],
      tones,
      height,
    );
  groups.push(labels);
  const spec = Object.assign({ clay: 0, fire: 21 }, PROFILES.bowl);
  // bisque
  const bisque = newGroup();
  chamber(bisque, rand, centerOf(0), y, 190, 150, tones, 2);
  piece(
    bisque,
    rand,
    centerOf(0) - 34,
    y - 78,
    0.5,
    tones,
    Object.assign({}, spec, { glaze: { none: true } }),
  );
  piece(
    bisque,
    rand,
    centerOf(0) + 34,
    y - 78,
    0.5,
    tones,
    Object.assign({ clay: 3, glaze: { none: true }, fire: 2 }, PROFILES.cup),
  );
  piece(
    bisque,
    rand,
    centerOf(0),
    y - 2,
    0.62,
    tones,
    Object.assign({}, spec, { glaze: { none: true }, clay: 1 }),
  );
  heatBar(bisque, rand, centerOf(0) - 90, y + 50, 180, tones, 0.64, 0.5, 0.75);
  note(bisque, centerOf(0), y + 92, "tap to stoke · keep it in the band", tones);
  groups.push(bisque);
  // dip it upside down
  const dip = newGroup();
  bucket(dip, rand, centerOf(1), y + 30, 2.4, tones, GLAZES(tones)[3]);
  const flip = newGroup({
    tf: "rotate(180deg)",
    to: `${roundCoord(centerOf(1))}px ${roundCoord(y - 54)}px`,
  });
  piece(
    flip,
    rand,
    centerOf(1),
    y - 54,
    0.85,
    tones,
    Object.assign({}, spec, { glaze: { c: 3, dip: 0.55 } }),
  );
  groups.push(dip, flip);
  const tongsGroup = newGroup();
  tongs(tongsGroup, rand, centerOf(1), y - 112, tones);
  arrowLine(
    tongsGroup,
    rand,
    [
      [centerOf(1) + 86, y - 120],
      [centerOf(1) + 86, y - 64],
    ],
    tones,
  );
  note(tongsGroup, centerOf(1), y + 92, "drag down · let go to lift", tones);
  groups.push(tongsGroup);
  // hold it tilted and the glaze runs in drips
  const tilted = newGroup();
  piece(
    tilted,
    rand,
    centerOf(2),
    y,
    1.25,
    tones,
    Object.assign({}, spec, {
      glaze: {
        c: 2,
        dip: 0.42,
        drips: [
          [-0.4, 0.24, 0.07],
          [0.05, 0.36, 0.06],
          [0.5, 0.18, 0.08],
        ],
      },
    }),
  );
  fingertip(tilted, rand, centerOf(2) + 30, y - 120, tones);
  arrowLine(
    tilted,
    rand,
    [
      [centerOf(2) + 30, y - 100],
      [centerOf(2) + 30, y - 66],
    ],
    tones,
  );
  note(tilted, centerOf(2), y + 92, "hold where you want it to run", tones);
  groups.push(tilted);
  // same glaze, three firings
  const firings = newGroup();
  [
    [-70, 31],
    [0, 32],
    [70, 33],
  ].forEach(([offsetX, fire], i) =>
    piece(
      firings,
      rand,
      centerOf(3) + offsetX,
      y - (i === 1 ? 26 : 0),
      0.55,
      tones,
      Object.assign({}, spec, {
        fire: fire,
        glaze: { c: 0, dip: 0.6, drips: [[jitter(rng(fire), 0.6), 0.2, 0.08]] },
        kin:
          i === 2
            ? [
                [0.1, 0],
                [0.18, 0.25],
                [0.05, 0.5],
              ]
            : null,
      }),
    ),
  );
  note(firings, centerOf(3), y + 72, "the kiln decides the rest", tones);
  note(firings, centerOf(3), y + 92, "a crack is mended in gold", tones, 13, 0.55);
  groups.push(firings);
  return { W: width, H: height, groups, clips: [] };
}
// glaze shelf
function sceneGlazes(tones) {
  const rand = rng(hash("tea/glazes")),
    width = 1100,
    height = 300,
    group = newGroup();
  GLAZES(tones)
    .slice(0, 7)
    .forEach((color, i) => {
      const x = 110 + i * 147;
      bucket(group, rand, x, 170, 1.7, tones, color);
      note(group, x, 222, GLAZE_NAMES[i], tones, 16, 0.75);
    });
  GLAZE_KANJI.slice(0, 7).forEach((glyph, i) => kanji(group, 110 + i * 147, 250, glyph, tones, 15));
  return { W: width, H: height, groups: [group], clips: [] };
}
// painting on the banding wheel
function scenePaint(tones) {
  const rand = rng(hash("tea/paint")),
    width = 1100,
    height = 620,
    groups = [],
    group = newGroup();
  const wheelX = 380,
    wheelY = 470;
  // banding wheel
  addSolid(group, wobblyRing(rand, wheelX + 6, wheelY + 38, 150, 22, 0.5, 14), tones.ink, 0.14);
  inked(
    group,
    rand,
    wobblyBox(rand, wheelX - 24, wheelY + 8, wheelX + 24, wheelY + 34, 0.4),
    tones.iron,
    tones.ink,
    1,
  );
  addSolid(
    group,
    wobblyBox(rand, wheelX - 130, wheelY, wheelX + 130, wheelY + 8, 0.4),
    mix(tones.iron, tones.ink, 0.25),
    1,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, wheelX, wheelY, 130, 26, 0.4, 18),
    mix(tones.iron, tones.paper, 0.2),
    tones.ink,
    1.2,
  );
  spin(group, rand, wheelX, wheelY + 6, 150, 34, tones);
  groups.push(group);
  const bowl = newGroup();
  piece(
    bowl,
    rand,
    wheelX,
    wheelY - 12,
    3.4,
    tones,
    Object.assign(
      {
        clay: 3,
        fire: 41,
        glaze: { c: 1, dip: 0.72 },
        paint: [
          {
            pts: [
              [-0.85, 0.32],
              [-0.45, 0.22],
              [-0.05, 0.36],
              [0.35, 0.24],
              [0.7, 0.34],
            ],
            w: 3.4,
            c: 0,
          },
          {
            pts: [
              [-0.3, 0.46],
              [-0.2, 0.56],
              [-0.28, 0.66],
            ],
            w: 2.2,
            c: 0,
          },
          {
            pts: [
              [0.18, 0.44],
              [0.28, 0.54],
              [0.2, 0.66],
            ],
            w: 2.2,
            c: 0,
          },
        ],
      },
      PROFILES.bowl,
    ),
  );
  groups.push(bowl);
  const brush = newGroup();
  brushTool(brush, rand, wheelX + 134, wheelY - 128, -0.95, 150, tones, PAINTS(tones)[0]);
  note(brush, wheelX + 160, wheelY - 270, "slow is thick, fast is thin", tones);
  groups.push(brush);
  // palette: four dishes, each with its name
  const palette = newGroup(),
    names = [
      ["呉須", "gosu blue"],
      ["鬼板", "iron brown"],
      ["弁柄", "bengara red"],
      ["白化粧", "white slip"],
    ];
  PAINTS(tones)
    .slice(0, 4)
    .forEach((color, i) => {
      const x = 760 + (i % 2) * 150,
        y = 120 + Math.floor(i / 2) * 130;
      inked(palette, rand, wobblyRing(rand, x, y, 44, 14, 0.3, 14), tones.paper, tones.ink, 1.1);
      addSolid(palette, wobblyRing(rand, x - 2, y + 1, 30, 8, 0.6, 12), color, 0.95);
      kanji(palette, x, y + 40, names[i][0], tones, 15);
      note(palette, x, y + 60, names[i][1], tones, 13, 0.6);
    });
  groups.push(palette);
  // the seal for the foot, and name in hand
  const seal = newGroup(),
    sealX = 830,
    sealY = 450;
  inked(
    seal,
    rand,
    wobblyBox(rand, sealX - 18, sealY - 90, sealX + 18, sealY - 20, 0.4),
    tones.woodLt,
    tones.ink,
    1.1,
  );
  addSolid(seal, wobblyBox(rand, sealX - 22, sealY - 20, sealX + 22, sealY, 0.4), tones.red, 0.9);
  addSolid(
    seal,
    wobblyBox(rand, sealX + 60, sealY - 34, sealX + 104, sealY + 10, 0.6),
    tones.red,
    0.88,
  );
  kanji(seal, sealX + 82, sealY - 10, "空", tones, 30);
  addText(seal, {
    t: "空",
    tr: `translate(${sealX + 82} ${sealY - 10})`,
    fs: 30,
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
  });
  note(seal, sealX + 40, sealY + 46, "a seal from your name", tones);
  addText(seal, {
    t: "Sora",
    tr: `translate(${sealX + 40} ${sealY + 96})`,
    fs: 30,
    font: "Kalam, cursive",
    fill: tones.ink,
    o: 0.85,
  });
  addLine(
    seal,
    wobblySegment(rand, [sealX - 30, sealY + 106], [sealX + 110, sealY + 106], 0.6, 3),
    tones.ink,
    0.8,
    0.4,
  );
  note(seal, sealX + 40, sealY + 128, "and your name, written by hand", tones, 13, 0.55);
  groups.push(seal);
  return { W: width, H: height, groups, clips: [] };
}

// frame of short dashes, for what is not quite there yet
function dashed(group, rand, x0, y0, x1, y1, tones) {
  const edge = (from, to) => {
    const dashes = Math.max(2, Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 12));
    for (let dash = 0; dash < dashes; dash += 2) {
      const dashFrom = dash / dashes,
        dashTo = Math.min(1, (dash + 1) / dashes);
      const pointAt = (along) => [
        roundCoord(from[0] + (to[0] - from[0]) * along + (rand() - 0.5)),
        roundCoord(from[1] + (to[1] - from[1]) * along + (rand() - 0.5)),
      ];
      const [start, end] = [pointAt(dashFrom), pointAt(dashTo)];
      addLine(group, `M${start[0]} ${start[1]}L${end[0]} ${end[1]}`, tones.ink, 1, 0.5, true);
    }
  };
  edge([x0, y0], [x1, y0]);
  edge([x1, y0], [x1, y1]);
  edge([x1, y1], [x0, y1]);
  edge([x0, y1], [x0, y0]);
}

// shelf in the waiting room
function sceneShelf(tones, opt = {}) {
  const rand = rng(hash("tea/shelf")),
    width = 1100,
    height = 700,
    groups = [],
    group = newGroup(),
    spots = [];
  note(group, 110, 34, "← back to the garden", tones, 17, 0.75);
  inked(group, rand, wobblyBox(rand, 40, 70, 1060, 680, 1), tones.plaster, tones.ink, 1.2);
  for (let slot = 0; slot < 40; slot++)
    addSolid(
      group,
      wobblyRing(rand, 60 + rand() * 980, 90 + rand() * 570, 1 + rand() * 2, 0.6 + rand(), 0.3, 6),
      tones.plasterDk,
      0.3,
    );
  inked(group, rand, wobblyBox(rand, 900, 110, 1020, 290, 1), tones.glowSoft, tones.ink, 1);
  for (let x = 914; x < 1020; x += 16)
    addLine(group, wobblySegment(rand, [x, 112], [x, 288], 0.3, 2), tones.bamboo, 2.4, 0.85, true);
  groups.push(group);
  const rows = [220, 410, 600];
  const pieces =
    opt.pieces ||
    rows.flatMap((_, row) => [0, 1, 2, 3, 4, 5].map((i) => demoSpec("shelf" + row + i)));
  const guestPieces = opt.pieces
    ? opt.own || []
    : [Object.assign(demoSpec("Sora", "bowl"), { kin: null })];
  // the newest of the guest's own sits apart by the window
  const newest = guestPieces.length ? guestPieces[guestPieces.length - 1] : null;
  const placed = [
    ...pieces.map((spec) => ({ spec })),
    ...guestPieces.slice(0, -1).map((spec) => ({ spec, own: true })),
  ].slice(-18);
  rows.forEach((y, row) => {
    const shelf = newGroup();
    inked(
      shelf,
      rand,
      wobblyPolygon(
        rand,
        [
          [70, y],
          [860, y],
          [880, y - 16],
          [90, y - 16],
        ],
        0.5,
      ),
      tones.woodLt,
      tones.ink,
      1.1,
    );
    inked(shelf, rand, wobblyBox(rand, 70, y, 860, y + 9, 0.4), tones.wood, tones.ink, 1);
    [100, 830].forEach((x) =>
      inked(
        shelf,
        rand,
        wobblyBox(rand, x - 6, y + 9, x + 6, y + 30, 0.3),
        tones.woodDk,
        tones.ink,
        0.9,
      ),
    );
    groups.push(shelf);
    const piecesGroup = newGroup();
    for (let i = 0; i < 6; i++) {
      const slot = row * 6 + i,
        entry = placed[slot];
      if (!entry) continue;
      const x = 140 + i * 130,
        spec = entry.spec,
        scale = spec.H < 20 ? 0.62 : 0.75;
      if (opt.sel === slot)
        addWash(
          piecesGroup,
          rand,
          wobblyRing(rand, x, y - 40, 70, 60, 3, 12),
          tones.gold,
          0.45,
          "url(#bk-bleed)",
        );
      if (entry.own) {
        dashed(piecesGroup, rand, x - 60, y - 120, x + 60, y + 4, tones);
        kanji(piecesGroup, x - 44, y - 104, "仮", tones, 14);
      }
      piece(piecesGroup, rand, x, y - 14, scale, tones, spec);
      spots.push({ i: slot, x, y: y - 50, own: !!entry.own });
    }
    groups.push(piecesGroup);
  });

  if (!pieces.length && !guestPieces.length)
    note(group, 465, 400, "nothing on the shelf yet", tones, 18, 0.5);

  // author's own piece, waiting for me :)
  if (newest) {
    const newestGroup = newGroup(),
      newestX = 970,
      newestY = 600;
    dashed(newestGroup, rand, newestX - 66, newestY - 130, newestX + 66, newestY + 40, tones);
    piece(newestGroup, rand, newestX, newestY - 14, newest.H < 20 ? 0.62 : 0.75, tones, newest);
    kanji(newestGroup, newestX - 46, newestY - 110, "仮", tones, 16);
    note(newestGroup, newestX, newestY + 62, "yours · waiting for the host", tones, 13, 0.6);
    groups.push(newestGroup);
    spots.push({ i: placed.length, x: newestX, y: newestY - 50, own: true });
  }
  return { W: width, H: height, groups, clips: [], spots };
}
// one piece taken off the shelf
function scenePieceCard(tones) {
  const rand = rng(hash("tea/card")),
    width = 1100,
    height = 460,
    group = newGroup();
  const spec = Object.assign(demoSpec("shelf13"), PROFILES.bowl);
  const views = [-0.6, 0, 0.6];
  views.forEach((turn, i) => {
    const turned = Object.assign({}, spec, {
      paint: (spec.paint || [])
        .map((stroke) => ({
          ...stroke,
          pts: stroke.pts.map(([u, v]) => [u + turn, v]).filter(([u]) => u > -1 && u < 1),
        }))
        .filter((stroke) => stroke.pts.length > 1),
    });
    piece(group, rand, 170 + i * 230, 330, i === 1 ? 2.1 : 1.5, tones, turned);
  });
  arrowLine(
    group,
    rand,
    [
      [210, 410],
      [270, 420],
      [330, 410],
    ],
    tones,
    0.45,
  );
  arrowLine(
    group,
    rand,
    [
      [590, 410],
      [530, 420],
      [470, 410],
    ],
    tones,
    0.45,
  );
  note(group, 400, 445, "drag to turn it in your hands", tones, 13, 0.55);
  inked(group, rand, wobblyBox(rand, 780, 110, 1040, 380, 0.8), tones.paper, tones.ink, 1.1);
  addText(group, {
    t: "Hana",
    tr: "translate(910 160)",
    fs: 30,
    font: "Kalam, cursive",
    fill: tones.ink,
    o: 0.85,
  });
  addSolid(group, wobblyBox(rand, 990, 128, 1022, 160, 0.4), tones.red, 0.88);
  addText(group, {
    t: "花",
    tr: "translate(1006 145)",
    fs: 20,
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
  });
  [
    [
      `${spec.H < 20 ? "plate" : spec.handle ? "cup" : "bowl"} · ${["buff", "red", "dark", "white"][spec.clay]} clay`,
      210,
    ],
    [`${GLAZE_NAMES[spec.glaze.c]} glaze, dipped`, 240],
    ["fired twice in the climbing kiln", 270],
    ["12 October 2026", 320],
  ].forEach(([text, y]) => note(group, 910, y, text, tones, 16, 0.7));
  return { W: width, H: height, groups: [group], clips: [] };
}

// the terrace the enso leads to
const SKY = [
  [0, "#1c2132", "#262c40"],
  [4.5, "#262b40", "#4a4560"],
  [5.8, "#6f7896", "#e6b48f"],
  [7, "#a9b8c8", "#f3d9b6"],
  [10, "#bfd0db", "#eeeee4"],
  [14, "#b6ccda", "#f1eee2"],
  [17, "#c3c3c8", "#f0d5a6"],
  [18.8, "#77708c", "#e8956a"],
  [19.8, "#3e4060", "#a8686e"],
  [21, "#22283a", "#3a3a52"],
  [24, "#1c2132", "#262c40"],
];
const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const clockLabel = (hour) =>
  `${Math.floor(hour)}:${String(Math.round((hour % 1) * 60)).padStart(2, "0")}`;
const STARLIGHT = "#f3eedf";
const SEASONS = {
  haru: { jp: "春", en: "spring", rise: 5.9, set: 19.3 },
  natsu: { jp: "夏", en: "summer", rise: 4.3, set: 21.0 },
  aki: { jp: "秋", en: "autumn", rise: 7.0, set: 18.0 },
  fuyu: { jp: "冬", en: "winter", rise: 7.7, set: 15.5 },
};
function solarHour(hour, season) {
  if (!season) return hour;
  if (hour < season.rise) return (hour * 5.6) / season.rise;
  if (hour < season.set) return 5.6 + ((hour - season.rise) * 14) / (season.set - season.rise);
  return 19.6 + ((hour - season.set) * 4.4) / (24 - season.set);
}
function hourLight(tones, hour, seasonKey, sunTimes) {
  hour = ((hour % 24) + 24) % 24;
  const season =
      sunTimes && SEASONS[seasonKey] ? { ...SEASONS[seasonKey], ...sunTimes } : SEASONS[seasonKey],
    solarTime = solarHour(hour, season);
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1][0] <= solarTime) i++;
  const [fromHour, fromTop, fromLow] = SKY[i],
    [toHour, toTop, toLow] = SKY[i + 1],
    blend = (solarTime - fromHour) / (toHour - fromHour);
  const baseTop = mix(mix(fromTop, toTop, blend), tones.paper, 0.15),
    baseLow = mix(mix(fromLow, toLow, blend), tones.paper, 0.15);
  const dayProgress = (solarTime - 5.6) / (19.6 - 5.6),
    sunUp = dayProgress > 0 && dayProgress < 1,
    altitude = sunUp ? Math.sin(Math.PI * dayProgress) : 0;
  const night =
    solarTime < 12 ? 1 - smoothstep(4.8, 6.6, solarTime) : smoothstep(18.6, 20.8, solarTime);
  const gold = Math.min(
    1,
    Math.max(0, 1 - Math.abs(solarTime - 18.5) / 1.4) +
      0.6 * Math.max(0, 1 - Math.abs(solarTime - 6.4) / 1.1),
  );
  const moonProgress = ((((solarTime - 18.5) % 24) + 24) % 24) / 12,
    moonUp = moonProgress < 1;
  const overcast = seasonKey === "fuyu" ? 0.22 : 0,
    top = mix(baseTop, "#c4c8cf", overcast),
    low = mix(baseLow, "#d8d8d4", overcast);
  return {
    h: hour,
    hc: solarTime,
    sk: seasonKey,
    S: season,
    top,
    low,
    st: dayProgress,
    up: sunUp,
    alt: altitude,
    night,
    gold,
    mt: moonProgress,
    mUp: moonUp,
    malt: moonUp ? Math.sin(Math.PI * moonProgress) : 0,
    lamp: Math.max(night, solarTime > 12 ? smoothstep(17.8, 19.2, solarTime) : 0),
    sunC: mix(mix("#f7e7b8", "#e0603a", gold), tones.paper, 0.1),
    far: mix(mix(tones.mount, tones.paper, 0.35), top, 0.45),
    mid: mix(tones.mount, low, 0.25),
    cloud: mix(mix(mix(low, tones.paper, 0.5), "#e9967a", 0.55 * gold), top, 0.5 * night),
  };
}
function skyWash(group, rand, width, bottom, light) {
  for (let band = 0; band < 10; band++)
    addSolid(
      group,
      wobblyBox(rand, -20, (bottom * band) / 10 - 8, width + 20, (bottom * (band + 1)) / 10 + 8, 2),
      mix(light.top, light.low, Math.pow(band / 9, 1.4)),
      1,
    );
}
const arcAt = (progress, altitude, x0, x1, horizonY, peakY) => [
  lerp(x0, x1, progress),
  horizonY - altitude * (horizonY - peakY),
];

function sunDisc(group, rand, x, y, radius, light) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, radius * 2.8, radius * 2.8, 2, 12),
    mix(light.sunC, light.low, 0.3),
    0.4,
    "url(#bk-pool)",
  );
  addSolid(
    group,
    wobblyRing(rand, x, y, radius, radius, radius * 0.05, 14),
    light.sunC,
    0.95,
    TREMBLE_FILTER,
  );
}

function moonDisc(group, rand, x, y, radius, bite, light, opacity) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, radius * 2, radius * 2, 2, 12),
    STARLIGHT,
    0.1 * opacity,
    "url(#bk-pool)",
  );
  addSolid(
    group,
    wobblyRing(rand, x, y, radius, radius, 0.6, 14),
    mix(STARLIGHT, "#f6e2a8", 0.25),
    opacity,
    TREMBLE_FILTER,
  );
  addSolid(
    group,
    wobblyRing(rand, x - radius * 0.3, y - radius * 0.15, radius * 0.28, radius * 0.22, 0.4, 8),
    mix(STARLIGHT, light.top, 0.25),
    0.45 * opacity,
  );
  if (bite)
    addSolid(
      group,
      wobblyRing(rand, x + radius * bite, y - radius * 0.08, radius * 1.02, radius * 1.04, 0.4, 14),
      light.top,
      0.92 * opacity,
    );
}
function stars(group, rand, width, horizonY, count, opacity) {
  for (let k = 0; k < count; k++) {
    const size = 0.7 + rand() * 1.3;
    addSolid(
      group,
      wobblyRing(rand, rand() * width, rand() * horizonY, size, size, 0, 5),
      STARLIGHT,
      opacity * (0.35 + rand() * 0.65),
    );
  }
}
function ridge(group, rand, x0, x1, y, amplitude, fill, opacity, ink) {
  const phase1 = rand() * 6,
    phase2 = rand() * 6,
    crest = [];
  for (let i = 0; i <= 16; i++) {
    const along = i / 16;
    crest.push([
      lerp(x0, x1, along),
      y -
        amplitude *
          (0.55 + 0.3 * Math.sin(along * 5.3 + phase1) + 0.2 * Math.sin(along * 11.7 + phase2)),
    ]);
  }
  const outline =
    smooth(crest, false) +
    ` L${roundCoord(x1)} ${roundCoord(y + 80)} L${roundCoord(x0)} ${roundCoord(y + 80)} Z`;
  addSolid(group, outline, fill, (opacity ?? 0.9) * 0.8);
  addWash(group, rand, outline, fill, opacity ?? 0.9, "url(#bk-bleed)");
  if (ink) addLine(group, wobblyLine(rand, crest, 0.8), ink, 1, 0.45);
}

function skyLayer(groups, tones, light, key, width, horizonY, moonRadius) {
  const group = newGroup({ washO: 1 }),
    rand = rng(hash("terrace/sky/" + key));
  groups.push(group);
  skyWash(group, rand, width, horizonY + 30, light);
  if (light.night > 0.05)
    stars(group, rng(hash("stars/" + key)), width, horizonY * 0.85, 70, light.night);
  const sunAt = arcAt(light.st, light.alt, -80, width + 80, horizonY + 10, 70);
  if (light.up) sunDisc(group, rand, sunAt[0], sunAt[1], 22 + 8 * (1 - light.alt), light);
  const moonAt = arcAt(light.mt, light.malt, width + 60, -60, horizonY + 10, 90);
  if (light.mUp)
    moonDisc(
      group,
      rand,
      moonAt[0],
      moonAt[1],
      moonRadius || 17,
      0.55,
      light,
      Math.max(0.25, light.night),
    );
  const cloudRand = rng(hash("clouds/" + key));
  [
    [0.08, 0.42, 120, 14],
    [0.55, 0.9, 175, 10],
    [0.3, 0.52, 60, 8],
  ].forEach(([from, to, y, height]) =>
    mist(group, cloudRand, from * width, to * width, y, height, light.cloud, 0.75),
  );
  return { sp: sunAt, mp: moonAt };
}
function veil(groups, width, height, light) {
  const group = newGroup({ washO: 1 }),
    fullFrame = polygonPath([
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ]);
  if (light.night > 0) addSolid(group, fullFrame, "#141a2c", 0.5 * light.night);
  if (light.gold > 0) addSolid(group, fullFrame, "#e8904c", 0.12 * light.gold);
  if (light.hc > 5 && light.hc < 9 && light.night < 0.5)
    addSolid(group, fullFrame, "#9fb4d8", 0.07);
  groups.push(group);
}

function ensoDial(groups, tones, light, cx, cy, radius) {
  const group = newGroup(),
    rand = rng(hash("enso-dial")),
    inkColor = mix(tones.ink, STARLIGHT, light.night);
  groups.push(group);
  const points = [];
  for (let i = 0; i <= 28; i++) {
    const angle = -Math.PI / 2 + 0.3 + (i / 28) * (Math.PI * 2 - 0.55);
    points.push([
      cx + Math.cos(angle) * radius * (1 + jitter(rand, 0.025)),
      cy + Math.sin(angle) * radius * (1 + jitter(rand, 0.025)),
    ]);
  }
  brushStroke(group, rand, points, radius * 0.17, inkColor, 0.8, {
    head: 0.7,
    tailAt: 0.72,
    tip: 0.15,
  });
  const handAngle = -Math.PI / 2 + (light.h / 24) * Math.PI * 2;
  inked(
    group,
    rand,
    wobblyRing(
      rand,
      cx + Math.cos(handAngle) * radius,
      cy + Math.sin(handAngle) * radius,
      6,
      6,
      0.5,
      8,
    ),
    tones.red,
    inkColor,
    1,
  );
  addText(group, {
    t: clockLabel(light.h),
    tr: `translate(${roundCoord(cx)} ${roundCoord(cy)})`,
    fs: 17,
    fill: inkColor,
    o: 0.8,
  });
  if (light.S)
    addText(group, {
      t: light.S.jp,
      tr: `translate(${roundCoord(cx)} ${roundCoord(cy + radius + 24)})`,
      fs: 20,
      font: "'Yuji Syuku', serif",
      fill: tones.red,
      o: 0.9,
    });
}

function slab(group, rand, path, fill, tones, width) {
  addSolid(group, path, mix(fill, tones.paper, 0.3), 1);
  addWash(group, rand, path, fill, 0.7);
  addLine(group, path, tones.ink, width ?? 1.5);
}
function lampGlow(group, rand, x, y, rx, ry, tones, opacity) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, rx, ry, 2, 12),
    tones.glow,
    0.5 * opacity,
    "url(#bk-pool)",
  );
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, rx * 0.5, ry * 0.5, 1, 10),
    tones.glowSoft,
    0.6 * opacity,
    "url(#bk-pool)",
  );
}
function fireflies(group, rand, x0, x1, y0, y1, count, opacity) {
  for (let k = 0; k < count; k++) {
    const x = lerp(x0, x1, rand()),
      y = lerp(y0, y1, rand());
    addWash(
      group,
      rand,
      wobblyRing(rand, x, y, 7, 7, 1, 8),
      "#e9f2a0",
      0.35 * opacity,
      "url(#bk-pool)",
    );
    addSolid(group, wobblyRing(rand, x, y, 1.6, 1.6, 0, 5), "#f4f8c8", opacity);
  }
}

function recordPlayer(group, rand, x, y, scale, tones, light, disc = 0) {
  const scaled = (v) => v * scale,
    at = (dx, dy) => [x + scaled(dx), y + scaled(dy)];
  addWash(
    group,
    rand,
    wobblyRing(rand, x + scaled(10), y + scaled(22), scaled(98), scaled(14), 1, 10),
    tones.pool,
    0.8,
    "url(#bk-pool)",
  );
  inked(
    group,
    rand,
    wobblyPolygon(rand, [at(-78, -60), at(66, -80), at(70, -10), at(-74, 8)], 0.8),
    tones.cloth,
    tones.ink,
    1.3,
  );
  addLine(
    group,
    wobblyPolygon(rand, [at(-68, -50), at(58, -68), at(61, -14), at(-65, 0)], 0.6),
    tones.ink,
    0.8,
    0.5,
  );
  inked(
    group,
    rand,
    wobblyPolygon(rand, [at(-86, 4), at(74, -14), at(96, 6), at(-66, 28)], 0.8),
    tones.woodLt,
    tones.ink,
    1.3,
  );
  inked(
    group,
    rand,
    wobblyPolygon(rand, [at(-66, 28), at(96, 6), at(96, 18), at(-66, 41)], 0.6),
    tones.woodDk,
    tones.ink,
    1.2,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, x - scaled(4), y + scaled(9), scaled(56), scaled(13), 0.6, 16),
    tones.iron,
    tones.ink,
    1.1,
  );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(4), y + scaled(8), scaled(51), scaled(11.5), 0.4, 16),
    mix(tones.ink, "#000000", 0.3),
    0.95,
  );
  for (let k = 1; k < 4; k++)
    addLine(
      group,
      wobblyRing(
        rand,
        x - scaled(4),
        y + scaled(8),
        scaled(51 - k * 9),
        scaled(11.5 - k * 2),
        0.2,
        14,
      ),
      mix(tones.ink, STARLIGHT, 0.35),
      0.5,
      0.45,
      true,
    );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(4), y + scaled(8), scaled(13), scaled(3.2), 0.2, 10),
    tones[DISC_LOOK[disc][1]],
    0.95,
  );
  addSolid(
    group,
    wobblyRing(rand, x - scaled(4), y + scaled(8), scaled(1.4), scaled(0.6), 0.1, 6),
    tones.ink,
    1,
  );
  addLine(
    group,
    wobblyLine(rand, [at(70, -2), at(66, 6), at(40, 9), at(16, 10)], 0.3),
    tones.ink,
    scaled(2.4),
    0.95,
    true,
  );
  inked(
    group,
    rand,
    wobblyRing(rand, x + scaled(70), y - scaled(2), scaled(6), scaled(3), 0.2, 8),
    tones.iron,
    tones.ink,
    1,
  );
  inked(
    group,
    rand,
    wobblyBox(rand, x + scaled(10), y + scaled(7), x + scaled(18), y + scaled(12), 0.2),
    tones.iron,
    tones.ink,
    0.8,
  );
}
// records in the crate, in the order the house radio keeps them (discs.ts)
const DISC_LOOK = [
  ["cloth", "gold"],
  ["red", "red"],
  ["paper", "paper"],
  ["glowSoft", "glowSoft"],
  ["fusuma", "fusuma"],
];

// a sleeve, standing or lying; each record has a face of its own
function sleeve(group, rand, points, tones, disc) {
  const mapQuad = quadMap(...points),
    outline = wobblyPolygon(rand, points, 0.6),
    fill = tones[DISC_LOOK[disc][0]],
    at = (u, v) => mapQuad(u, v);
  addSolid(group, outline, mix(fill, tones.paper, 0.15), 1);
  addWash(group, rand, outline, fill, 0.5);
  if (disc === 0) {
    addSolid(group, wobblyRing(rand, ...at(0.62, 0.36), 9, 9, 0.5, 10), tones.gold, 0.95);
    addLine(
      group,
      wobblyLine(rand, [at(0.12, 0.78), at(0.5, 0.74), at(0.88, 0.79)], 0.5),
      tones.paper,
      0.9,
      0.6,
    );
  } else if (disc === 1) {
    for (let k = 0; k < 4; k++)
      addLine(
        group,
        wobblyLine(rand, [at(0.1, 0.2 + k * 0.17), at(0.9, 0.18 + k * 0.17)], 0.5),
        tones.paper,
        1.4,
        0.55,
        true,
      );
  } else if (disc === 2) {
    addLine(
      group,
      wobblyLine(rand, [at(0.2, 0.75), at(0.4, 0.3), at(0.55, 0.62), at(0.8, 0.22)], 0.8),
      tones.ink,
      2.4,
      0.85,
    );
  } else if (disc === 3) {
    addSolid(
      group,
      wobblyPolygon(rand, [at(0, 0.5), at(1, 0.5), at(1, 1), at(0, 1)], 0.3),
      tones.cloth,
      0.55,
    );
    addSolid(group, wobblyRing(rand, ...at(0.5, 0.48), 10, 10, 0.4, 12), tones.red, 0.85);
    for (let k = 0; k < 3; k++)
      addLine(
        group,
        wobblyLine(rand, [at(0.08, 0.6 + k * 0.1), at(0.92, 0.6 + k * 0.1)], 0.3),
        tones.paper,
        0.9,
        0.6,
        true,
      );
    addLine(
      group,
      wobblyLine(rand, [at(0.12, 1), at(0.2, 0.55), at(0.26, 0.25)], 0.4),
      tones.ink,
      1.4,
      0.9,
    );
    addLine(
      group,
      `M${at(0.26, 0.25)} Q${at(0.4, 0.15)} ${at(0.5, 0.28)} M${at(0.26, 0.25)} Q${at(0.12, 0.12)} ${at(0.02, 0.3)}`,
      tones.ink,
      1.2,
      0.9,
      true,
    );
  } else {
    addLine(
      group,
      wobblyPolygon(rand, [at(0.12, 0.14), at(0.88, 0.14), at(0.88, 0.5), at(0.12, 0.5)], 0.4),
      tones.ink,
      0.8,
      0.7,
    );
    for (let k = 0; k < 3; k++)
      addLine(
        group,
        wobblyLine(rand, [at(0.2, 0.24 + k * 0.08), at(0.8 - k * 0.1, 0.24 + k * 0.08)], 0.2),
        tones.ink,
        1.1,
        0.75,
        true,
      );
    addLine(
      group,
      wobblyLine(rand, [at(0.15, 0.85), at(0.6, 0.85)], 0.2),
      tones.ink,
      0.8,
      0.6,
      true,
    );
    addSolid(group, wobblyRing(rand, ...at(0.75, 0.75), 5, 5, 0.3, 8), tones.red, 0.85);
  }
  addLine(group, outline, tones.ink, 1.1);
}

// wooden crate of records at the far left of the boards
const inCrate = (slot) => {
  const x = 28 + slot * 5,
    y = 552 - slot * 13;
  return [
    [x, y],
    [x + 78, y - 4],
    [x + 80, y + 58],
    [x + 2, y + 62],
  ];
};

function crateSleeve(tones, slot) {
  const group = newGroup();
  const rand = rng(hash("terrace/engawa/crate/" + slot));
  sleeve(group, rand, inCrate(slot), tones, slot);
  const [[x, y]] = inCrate(slot);
  return { W: 1100, H: 640, groups: [group], clips: [], from: [x + 40, y + 30] };
}
function crate(groups, rand, tones, disc, lifted) {
  const back = newGroup(),
    x0 = 18,
    x1 = 118,
    y0 = 566,
    y1 = 628;
  groups.push(back);
  addWash(back, rand, wobblyRing(rand, 72, 634, 70, 10, 1, 10), tones.pool, 0.8, "url(#bk-pool)");
  slab(
    back,
    rand,
    wobblyPolygon(
      rand,
      [
        [x0 + 10, y0 - 12],
        [x1 + 8, y0 - 18],
        [x1 + 4, y0 + 6],
        [x0 + 6, y0 + 10],
      ],
      0.5,
    ),
    tones.woodDk,
    tones,
    1.1,
  );
  for (let slot = DISC_LOOK.length - 1; slot >= 0; slot--) {
    const group = newGroup({ op: slot === disc || slot === lifted ? 0.18 : 1 });
    groups.push(group);
    sleeve(group, rand, inCrate(slot), tones, slot);
  }
  const crateGroup = newGroup();
  groups.push(crateGroup);
  const front = wobblyPolygon(
    rand,
    [
      [x0, y0 + 4],
      [x1, y0 - 2],
      [x1 + 2, y1 - 4],
      [x0 + 2, y1],
    ],
    0.5,
  );
  slab(crateGroup, rand, front, tones.wood, tones, 1.3);
  slab(
    crateGroup,
    rand,
    wobblyPolygon(
      rand,
      [
        [x1, y0 - 2],
        [x1 + 8, y0 - 18],
        [x1 + 10, y1 - 20],
        [x1 + 2, y1 - 4],
      ],
      0.5,
    ),
    tones.woodDk,
    tones,
    1.1,
  );
  addLine(
    crateGroup,
    wobblyLine(
      rand,
      [
        [x0 + 1, y0 + 24],
        [x1 + 1, y0 + 19],
      ],
      0.4,
    ),
    tones.woodDk,
    0.9,
    0.6,
  );
  addLine(
    crateGroup,
    wobblyLine(
      rand,
      [
        [x0 + 1, y0 + 44],
        [x1 + 2, y0 + 39],
      ],
      0.4,
    ),
    tones.woodDk,
    0.9,
    0.6,
  );
  addSolid(crateGroup, wobblyRing(rand, (x0 + x1) / 2, y0 + 12, 12, 3.2, 0.3, 10), tones.ink, 0.8);
  addText(crateGroup, {
    t: "盤",
    tr: `translate(${x0 + 14} ${y1 - 12}) rotate(-3)`,
    fs: 10,
    font: "'Yuji Syuku', serif",
    fill: tones.red,
  });
}
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
  if (!mini) steam(groups, rand, x, y - 28, tones, 2);
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

  // one ribbon of smoke
  const [tipX, tipY] = tip,
    spine = [];
  for (let i = 0; i <= 9; i++)
    spine.push([tipX + Math.sin(i * 0.75) * (2 + i * 1.9), tipY - i * 15]);
  const widthAt = (i) => 0.6 + i * 0.55,
    left = spine.map(([spineX, spineY], i) => [spineX - widthAt(i), spineY]),
    right = spine.map(([spineX, spineY], i) => [spineX + widthAt(i) * 0.6, spineY]).reverse(),
    ribbon = (shift) =>
      `${wobblyLine(rand, left.map(shift), 0.3)} L${wobblyLine(rand, right.map(shift), 0.3).slice(1)} Z`,
    id = `koro-smoke-${Math.round(tipX)}-${Math.round(tipY)}`,
    fill = `url(#${id})`,
    defs = `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${roundCoord(tipY)}" x2="0" y2="${roundCoord(tipY - 135)}"><stop offset="0" style="stop-color:${tones.inkSoft}" stop-opacity="0.8"/><stop offset="1" style="stop-color:${tones.inkSoft}" stop-opacity="0"/></linearGradient></defs>`;
  [
    ["9s 0s", 0.8, ([px, py]) => [px, py]],
    ["12s -5s", 0.45, ([px, py]) => [px + 3, tipY + (py - tipY) * 1.05 - 6]],
  ].forEach(([timing, opacity, shift], layer) => {
    const [dur, delay] = timing.split(" "),
      smoke = newGroup({
        anim: mini ? "none" : `rib ${dur} ease-in-out ${delay} infinite`,
        to: `${roundCoord(tipX)}px ${roundCoord(tipY)}px`,
        defs: layer ? "" : defs,
      });
    groups.push(smoke);
    addSolid(smoke, ribbon(shift), fill, opacity);
  });
}
// veranda of old house
function sceneEngawa(tones, hour, mini, seasonKey, opts = {}) {
  const width = 1100,
    height = 640,
    light = hourLight(tones, hour, seasonKey, opts.sun),
    look = seasonLook(tones, seasonKey),
    groups = [],
    clips = [],
    randFor = (name) => rng(hash("terrace/engawa/" + name));
  const { mp: moonAt } = skyLayer(groups, tones, light, "engawa", width, 360);
  const far = newGroup(),
    rand = randFor("far");
  groups.push(far);
  ridge(
    far,
    rand,
    -20,
    width + 20,
    330,
    90,
    look.snow ? mix(light.far, SNOW, 0.35) : light.far,
    0.85,
  );
  ridge(
    far,
    rand,
    300,
    width + 20,
    365,
    55,
    look.snow ? mix(light.mid, SNOW, 0.3) : light.mid,
    0.9,
    tones.inkSoft,
  );
  mist(
    far,
    rand,
    260,
    1000,
    352,
    22,
    mix(light.low, tones.paper, 0.4),
    0.35 + 0.4 * (light.hc < 9 ? 1 : 0),
  );

  const gardenWash = newGroup({ still: true }),
    gardenGround = newGroup(),
    garden = newGroup({ still: true }),
    gardenRand = randFor("garden");
  groups.push(gardenWash, gardenGround, garden);
  addSolid(
    gardenGround,
    wobblyBox(gardenRand, -20, 362, width + 20, height + 20, 3),
    mix(look.ground, light.low, 0.08),
    1,
  );
  const mounds = [
    [880, 398, 64, 24],
    [1070, 432, 80, 30],
    [640, 468, 56, 22],
    [700, 452, 40, 18],
  ];
  mounds.forEach(([x, y, rx, ry]) => {
    inked(
      garden,
      gardenRand,
      smooth(
        [
          [x - rx, y + 4],
          [x - rx * 0.7, y - ry * 0.8],
          [x, y - ry],
          [x + rx * 0.75, y - ry * 0.7],
          [x + rx, y + 4],
        ],
        false,
      ) + " Z",
      look.mound,
      tones.ink,
      1.1,
    );
    for (let k = 0; k < 8; k++)
      addLine(
        garden,
        wobblySegment(
          gardenRand,
          [x + jitter(gardenRand, rx * 0.7), y - ry * 0.4 + jitter(gardenRand, ry * 0.3)],
          [x + jitter(gardenRand, rx * 0.7) + 4, y - ry * 0.4 + jitter(gardenRand, ry * 0.3) - 2],
          0.2,
          1,
        ),
        tones.ink,
        0.9,
        0.45,
        true,
      );
  });
  addWash(
    garden,
    gardenRand,
    mistPath(gardenRand, 560, 1120, 420, 60),
    look.snow ? tones.stone : tones.mossDk,
    look.snow ? 0.25 : 0.5,
    "url(#bk-bleed)",
  );
  addWash(
    garden,
    gardenRand,
    mistPath(gardenRand, 820, 1120, 520, 140),
    look.snow ? tones.stone : tones.mossDk,
    look.snow ? 0.2 : 0.45,
    "url(#bk-bleed)",
  );
  addLine(
    garden,
    wobblyLine(
      gardenRand,
      [
        [860, 395],
        [950, 430],
        [1010, 470],
        [1100, 520],
      ],
      1.5,
    ),
    tones.ink,
    1,
    0.35,
  );
  const steps = [
    [900, 440, 26, 10],
    [960, 474, 30, 11],
    [1030, 510, 34, 12],
  ];
  steps.forEach(([x, y, rx, ry]) => stone(garden, gardenRand, x, y, rx, ry, tones));

  // tree
  brushStroke(
    garden,
    gardenRand,
    [
      [985, 420],
      [978, 360],
      [990, 300],
      [970, 250],
    ],
    10,
    tones.ink,
    0.9,
    { head: 0.9, tip: 0.5 },
  );
  brushStroke(
    garden,
    gardenRand,
    [
      [982, 330],
      [1030, 300],
      [1070, 300],
    ],
    5,
    tones.ink,
    0.85,
    { tip: 0.3 },
  );
  brushStroke(
    garden,
    gardenRand,
    [
      [985, 290],
      [940, 262],
      [900, 262],
    ],
    4.5,
    tones.ink,
    0.85,
    { tip: 0.3 },
  );
  if (look.crown)
    maple(
      garden,
      gardenRand,
      985,
      270,
      look.s === "natsu" ? 125 : 115,
      look.s === "natsu" ? 260 : look.s === "haru" ? 210 : 170,
      Object.assign({}, tones, look.crown),
    );
  else {
    const ends = [
      [1070, 300],
      [900, 262],
      [970, 250],
      [1030, 302],
      [945, 264],
    ];
    ends.forEach(([x, y], i) => {
      for (let k = 0; k < 3; k++) {
        const angle = -Math.PI / 2 + (i % 2 ? 0.9 : -0.9) * (0.3 + gardenRand()),
          length = 26 + gardenRand() * 30;
        const end = [x + Math.cos(angle) * length, y + Math.sin(angle) * length];
        brushStroke(
          garden,
          gardenRand,
          [[x, y], [lerp(x, end[0], 0.5) + jitter(gardenRand, 4), lerp(y, end[1], 0.5)], end],
          2.2,
          tones.ink,
          0.85,
          { tip: 0.2 },
        );
        if (k === 0)
          snowCap(
            garden,
            gardenRand,
            [
              [lerp(x, end[0], 0.15), lerp(y, end[1], 0.15) - 2],
              [lerp(x, end[0], 0.6), lerp(y, end[1], 0.6) - 2],
            ],
            2.6,
          );
      }
    });
    snowCap(
      garden,
      gardenRand,
      [
        [990, 327],
        [1030, 297],
        [1068, 296],
      ],
      3.4,
    );
    snowCap(
      garden,
      gardenRand,
      [
        [978, 287],
        [940, 259],
        [904, 258],
      ],
      3.2,
    );
  }
  const lights = newGroup({ washO: 1 }),
    lightsRand = randFor("lights");
  lantern(garden, gardenRand, 820, 452, 0.62, tones, light.lamp > 0.5);
  if (look.snow) {
    mounds.forEach(([x, y, rx, ry]) =>
      snowCap(
        garden,
        gardenRand,
        [
          [x - rx * 0.8, y - ry * 0.35],
          [x - rx * 0.5, y - ry * 0.85],
          [x, y - ry - 1],
          [x + rx * 0.55, y - ry * 0.78],
          [x + rx * 0.8, y - ry * 0.3],
        ],
        ry * 0.5,
      ),
    );
    steps.forEach(([x, y, rx, ry]) =>
      snowCap(garden, gardenRand, arcTop(x, y - 1, rx * 0.85, ry * 0.9), ry * 0.55),
    );
    snowCap(
      garden,
      gardenRand,
      [
        [802, 404],
        [811, 399],
        [820, 391],
        [829, 399],
        [838, 404],
      ],
      5,
    );
  }
  [gardenWash.wash, garden.wash] = [garden.wash, []];
  const house = newGroup({ still: true }),
    houseRand = randFor("house");
  groups.push(house);
  const eaveY = (x) => lerp(70, 22, (x + 10) / 1120),
    beamY = (x) => lerp(108, 74, (x + 10) / 820);
  inked(
    house,
    houseRand,
    wobblyPolygon(
      houseRand,
      [
        [-10, -10],
        [width + 10, -10],
        [width + 10, eaveY(width + 10)],
        [-10, eaveY(-10)],
      ],
      1,
    ),
    mix(tones.woodDk, tones.ink, 0.25),
    tones.ink,
    1.4,
  );
  for (let x = 20; x < width; x += 38) {
    addLine(
      house,
      wobblySegment(houseRand, [x, eaveY(x) - 2], [x - 34, -10], 0.6, 2),
      tones.ink,
      2.2,
      0.6,
      true,
    );
    inked(
      house,
      houseRand,
      wobblyBox(houseRand, x - 4, eaveY(x) - 7, x + 4, eaveY(x) + 1, 0.4),
      tones.woodLt,
      tones.ink,
      0.8,
    );
  }
  if (look.snow) {
    snowCap(
      house,
      houseRand,
      [
        [-10, eaveY(-10) + 1],
        [360, eaveY(360) + 2],
        [740, eaveY(740) + 1],
        [width + 10, eaveY(width + 10) + 2],
      ],
      7,
    );
    for (let x = 40; x < width; x += 52 + houseRand() * 40) {
      const y = eaveY(x) + 3,
        length = 8 + houseRand() * 22;
      addSolid(
        house,
        wobblyPolygon(
          houseRand,
          [
            [x - 2.5, y],
            [x + 2.5, y],
            [x + 0.3, y + length],
          ],
          0.2,
        ),
        mix(SNOW, "#bcd0e2", 0.4),
        0.95,
      );
      addLine(
        house,
        wobblySegment(houseRand, [x - 2, y], [x, y + length], 0.1, 1),
        "#8fa3ba",
        0.6,
        0.6,
        true,
      );
    }
  }
  const floor = { A: [-10, 548], B: [835, 490], C: [912, height + 10], D: [-10, height + 10] },
    edgeY = (x) => lerp(548, 490, (x + 10) / 845);
  inked(
    house,
    houseRand,
    wobblyBox(houseRand, -10, beamY(-10) - 22, 140, 548, 0.8),
    tones.fusuma,
    tones.ink,
    1.2,
  );
  for (let y = beamY(-10); y < 548; y += 46)
    addLine(
      house,
      wobblySegment(houseRand, [-10, y], [140, y - 6], 0.4, 2),
      tones.woodDk,
      0.9,
      0.7,
      true,
    );
  for (let x = 18; x < 140; x += 34)
    addLine(
      house,
      wobblySegment(houseRand, [x, beamY(x) - 18], [x, 546], 0.4, 3),
      tones.woodDk,
      0.9,
      0.7,
      true,
    );
  if (light.lamp > 0.05)
    addSolid(
      lights,
      wobblyBox(lightsRand, -8, beamY(-10) - 18, 136, 544, 0.6),
      tones.glow,
      0.5 * light.lamp,
    );
  inked(
    house,
    houseRand,
    wobblyPolygon(
      houseRand,
      [
        [-10, beamY(-10) - 14],
        [840, beamY(840) - 12],
        [840, beamY(840) + 4],
        [-10, beamY(-10) + 6],
      ],
      0.6,
    ),
    tones.wood,
    tones.ink,
    1.3,
  );
  [
    [150, 26],
    [790, 16],
  ].forEach(([x, span]) =>
    inked(
      house,
      houseRand,
      wobblyBox(houseRand, x - span / 2, beamY(x) - 10, x + span / 2, edgeY(x) + 4, 0.6),
      x < 400 ? tones.wood : mix(tones.wood, tones.ink, 0.1),
      tones.ink,
      1.4,
    ),
  );
  // reed blind
  const blindLeft = 168,
    blindRight = 470,
    blindBottom = look.blind || beamY(blindLeft) + 20;
  if (look.blind) {
    addWash(
      house,
      houseRand,
      wobblyPolygon(
        houseRand,
        [
          [blindLeft, beamY(blindLeft) + 4],
          [blindRight, beamY(blindRight) + 4],
          [blindRight, blindBottom - 6],
          [blindLeft, blindBottom - 2],
        ],
        0.6,
      ),
      tones.bamboo,
      0.55,
    );
    for (let y = 0; y < blindBottom - beamY(blindLeft) - 6; y += 4.5)
      addLine(
        house,
        wobblySegment(
          houseRand,
          [blindLeft, beamY(blindLeft) + 6 + y],
          [blindRight, beamY(blindRight) + 6 + y],
          0.3,
          3,
        ),
        mix(tones.bamboo, tones.ink, 0.35),
        0.6,
        0.5,
        true,
      );
  }
  inked(
    house,
    houseRand,
    wobblyPolygon(
      houseRand,
      [
        [blindLeft - 4, blindBottom - 8],
        [blindRight + 4, blindBottom - 12],
        [blindRight + 4, blindBottom + 6],
        [blindLeft - 4, blindBottom + 10],
      ],
      0.8,
    ),
    tones.bamboo,
    tones.ink,
    1.2,
  );
  [240, 400].forEach((x) => cordTie(house, houseRand, x, blindBottom - 1, 0.6, tones));
  // wind chime
  const chimeX = 610,
    chimeY = beamY(chimeX);
  if (look.chime) {
    const chime = newGroup({
        anim: mini ? "none" : "sway 4.5s ease-in-out infinite",
        to: `${chimeX}px ${chimeY}px`,
      }),
      chimeRand = randFor("chime");
    groups.push(chime);
    addLine(
      chime,
      wobblySegment(chimeRand, [chimeX, chimeY], [chimeX, chimeY + 52], 0.3, 2),
      tones.ink,
      0.8,
      0.8,
      true,
    );
    inked(
      chime,
      chimeRand,
      smooth(
        [
          [chimeX - 15, chimeY + 70],
          [chimeX - 13, chimeY + 56],
          [chimeX, chimeY + 50],
          [chimeX + 13, chimeY + 56],
          [chimeX + 15, chimeY + 70],
        ],
        false,
      ) + " Z",
      mix(tones.mountLt, tones.paper, 0.4),
      tones.ink,
      1.1,
    );
    addLine(
      chime,
      wobblySegment(chimeRand, [chimeX, chimeY + 62], [chimeX, chimeY + 92], 0.3, 2),
      tones.ink,
      0.7,
      0.8,
      true,
    );
    inked(
      chime,
      chimeRand,
      wobblyBox(chimeRand, chimeX - 7, chimeY + 92, chimeX + 7, chimeY + 140, 0.4),
      tones.paper,
      tones.ink,
      0.9,
    );
    addText(chime, {
      t: look.chime,
      tr: `translate(${chimeX} ${chimeY + 114})`,
      fs: 12,
      font: "'Yuji Syuku', serif",
      fill: tones.red,
      o: 0.9,
    });
  } else
    inked(
      house,
      houseRand,
      wobblyBox(houseRand, chimeX - 3, chimeY - 2, chimeX + 3, chimeY + 5, 0.2),
      tones.iron,
      tones.ink,
      0.8,
    );
  // floor
  const floorGroup = newGroup(),
    floorRand = randFor("floor");
  groups.push(floorGroup);
  const boardMap = quadMap(floor.A, floor.B, floor.C, floor.D);
  slab(
    floorGroup,
    floorRand,
    wobblyPolygon(floorRand, [floor.A, floor.B, floor.C, floor.D], 1),
    tones.woodLt,
    tones,
  );
  for (let k = 1; k < 9; k++) {
    const depth = Math.pow(k / 9, 1.3);
    addLine(
      floorGroup,
      wobblyLine(floorRand, [boardMap(0, depth), boardMap(0.5, depth), boardMap(1, depth)], 0.6),
      tones.woodDk,
      0.9,
      0.6,
      true,
    );
  }
  for (let k = 0; k < 7; k++) {
    const across = floorRand(),
      band = Math.floor(floorRand() * 8) / 9;
    const from = boardMap(across, Math.pow(band, 1.3)),
      to = boardMap(across + 0.01, Math.pow(band + 1 / 9, 1.3));
    addLine(floorGroup, wobblySegment(floorRand, from, to, 0.3, 1), tones.woodDk, 0.8, 0.55, true);
  }
  addLine(
    floorGroup,
    wobblyLine(floorRand, [floor.A, boardMap(0.5, 0), floor.B], 0.6),
    tones.ink,
    2.4,
    0.9,
  );
  const reach = light.up ? lerp(0.85, 0.15, light.alt) : 0;
  addSolid(
    floorGroup,
    wobblyPolygon(
      floorRand,
      [boardMap(0, reach), boardMap(1, reach), boardMap(1, 1.02), boardMap(0, 1.02)],
      1,
    ),
    tones.ink,
    0.13 * (1 - light.night),
  );
  if (light.up)
    addWash(
      floorGroup,
      floorRand,
      wobblyPolygon(
        floorRand,
        [boardMap(0, 0.01), boardMap(1, 0.01), boardMap(1, reach), boardMap(0, reach)],
        1,
      ),
      mix(light.sunC, tones.paper, 0.4),
      0.35 * (0.4 + light.gold),
      "url(#bk-bleed)",
    );
  if (look.snow)
    snowCap(
      floorGroup,
      floorRand,
      [boardMap(0.62, 0.02), boardMap(0.8, 0.01), boardMap(0.99, 0.015), boardMap(1, 0.12)],
      4,
    );
  inked(
    floorGroup,
    floorRand,
    wobblyRing(floorRand, 960, 600, 46, 16, 2, 10),
    tones.stone,
    tones.ink,
    1.3,
  );
  if (look.snow) snowCap(floorGroup, floorRand, arcTop(960, 599, 40, 14), 6);
  [
    [940, 594],
    [968, 602],
  ].forEach(([x, y]) => {
    inked(
      floorGroup,
      floorRand,
      wobblyPolygon(
        floorRand,
        [
          [x - 9, y - 4],
          [x + 9, y - 6],
          [x + 11, y + 2],
          [x - 7, y + 4],
        ],
        0.4,
      ),
      tones.wood,
      tones.ink,
      1,
    );
    addLine(
      floorGroup,
      wobblyLine(
        floorRand,
        [
          [x - 5, y - 2],
          [x + 1, y - 5],
          [x + 6, y - 2],
        ],
        0.2,
      ),
      tones.red,
      1.4,
      0.95,
      true,
    );
  });
  // things on the boards
  const things = newGroup(),
    thingsRand = randFor("things");
  groups.push(things);
  if (light.up) {
    const shadowShift = Math.max(
      -260,
      Math.min(260, (150 - lerp(-80, width + 80, light.st)) * 0.5 * (1.2 - light.alt)),
    );
    addWash(
      things,
      thingsRand,
      wobblyPolygon(
        thingsRand,
        [
          [137, edgeY(137) + 2],
          [163, edgeY(163) + 2],
          [163 + shadowShift, edgeY(163) + 70 * (1 - light.alt) + 12],
          [137 + shadowShift, edgeY(137) + 70 * (1 - light.alt) + 16],
        ],
        1,
      ),
      tones.ink,
      0.22 * (1 - light.night),
      "url(#bk-bleed)",
    );
  }

  if (opts.lifted == null)
    sleeve(
      things,
      thingsRand,
      [
        [400, 600],
        [462, 592],
        [470, 630],
        [404, 638],
      ],
      tones,
      opts.disc ?? 0,
    );
  teaCup(groups, things, thingsRand, 360, 586, tones, mini);
  koro(groups, things, thingsRand, 424, 566, tones, mini, opts.burnt, opts.unlit);
  recordPlayer(things, thingsRand, 548, 548, 1, tones, light, opts.disc ?? 0);
  crate(groups, randFor("crate"), tones, opts.disc ?? 0, opts.lifted);

  // hung from the beam right of the player
  const lampX = 700,
    under = [lampX, edgeY(lampX)],
    cast = ([px, py], scale) => [px + (px - under[0]) * scale, py + (py - under[1]) * scale],
    shade = [
      cast([470, 550], 0.42),
      cast([482, 589], 0.1),
      cast([644, 566], 0.1),
      [644, 566],
      [616, 540],
      [470, 550],
    ],
    lampPool = newGroup({ washO: 1, clip: "url(#engawa-lamp-shade)" });
  clips.push({
    id: "engawa-lamp-shade",
    d: polygonPath([
      [-20, -20],
      [width + 20, -20],
      [width + 20, height + 20],
      [-20, height + 20],
      [-20, shade[0][1]],
      ...shade,
      shade[0],
      [-20, shade[0][1] + 0.5],
    ]),
  });
  hangingLamp(
    things,
    lights,
    lampPool,
    thingsRand,
    lampX,
    beamY(lampX),
    tones,
    opts.lamp ?? light.lamp,
    0.35 + 0.65 * light.night,
    boardMap,
    edgeY,
  );

  // what the season puts in the air, and what has come down on the boards
  if (look.fall) {
    const air = newGroup(),
      airRand = randFor("air/" + look.s);
    groups.push(air);
    const count = look.snow ? (mini ? 90 : 160) : mini ? 14 : 24;
    falling(
      air,
      airRand,
      look.s,
      look.fall,
      count,
      look.snow ? 0 : 560,
      width,
      look.snow ? 60 : 200,
      look.snow ? height : 560,
    );
    if (!look.snow) {
      falling(air, airRand, look.s, look.fall, 9, 560, 1100, 380, 560);
      for (let k = 0; k < 5; k++) {
        const [x, y] = boardMap(0.55 + airRand() * 0.4, 0.05 + airRand() * 0.35);
        falling(air, airRand, look.s, look.fall, 1, x, x + 2, y, y + 2);
      }
    }
  }
  if (light.lamp > 0.5) lampGlow(lights, lightsRand, 820, 410, 34, 26, tones, light.lamp);
  if (light.night > 0.4 && look.s === "natsu")
    fireflies(lights, lightsRand, 860, 1090, 380, 500, 9, light.night);
  veil(groups, width, height, light);
  groups.push(lampPool, lights);
  if (light.mUp && light.night > 0.3 && moonAt[0] > 860) {
    const moonGroup = newGroup({ washO: 1 });
    moonDisc(moonGroup, lightsRand, moonAt[0], moonAt[1], 17, 0.55, light, light.night * 0.9);
    groups.push(moonGroup);
  }
  if (!mini) ensoDial(groups, tones, light, 1050, 98, 32);
  return { W: width, H: height, groups, clips };
}

// cards
function washi(group, rand, x, y, width, height, tones, tilt) {
  const points = [],
    slant = tilt || 0,
    at = (px, py) => [x + px + py * slant, y + py - px * slant];
  for (let i = 0; i <= 10; i++)
    points.push(at((width * i) / 10 + jitter(rand, 1.5), jitter(rand, 1.2)));
  for (let i = 1; i <= 8; i++) points.push(at(width + jitter(rand, 1.6), (height * i) / 9));
  for (let i = 0; i <= 22; i++)
    points.push(at(width - (width * i) / 22, height + jitter(rand, 5) + Math.sin(i * 1.7) * 2.5));
  for (let i = 8; i >= 1; i--) points.push(at(jitter(rand, 1.6), (height * i) / 9));
  const outline = polygonPath(points);
  addWash(
    group,
    rand,
    polygonPath(points.map(([dx, dy]) => [dx + 7, dy + 9])),
    tones.pool,
    0.9,
    "url(#bk-pool)",
  );
  addSolid(group, outline, mix(tones.paper, tones.gold, 0.08), 1, TREMBLE_FILTER);
  addWash(
    group,
    rand,
    outline,
    mix(tones.paper, tones.tape || tones.gold, 0.25),
    0.35,
    "url(#bk-bleed)",
  );
  for (let k = 0; k < Math.round((width * height) / 9000); k++) {
    const speck = at(rand() * width, rand() * height);
    addLine(
      group,
      wobblyLine(
        rand,
        [
          speck,
          [speck[0] + 6 + rand() * 10, speck[1] + jitter(rand, 4)],
          [speck[0] + 12 + rand() * 12, speck[1] + jitter(rand, 5)],
        ],
        0.5,
      ),
      tones.inkSoft,
      0.5,
      0.18,
      true,
    );
  }
  addLine(group, outline, tones.ink, 0.9, 0.55);
  return at;
}
function hanko(group, rand, x, y, size, glyphs, tones) {
  addSolid(
    group,
    wobblyBox(rand, x - size / 2, y - size / 2, x + size / 2, y + size / 2, size * 0.04),
    tones.red,
    0.88,
    TREMBLE_FILTER,
  );
  addText(group, {
    t: glyphs,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: size * (glyphs.length > 1 ? 0.42 : 0.66),
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
    wm: glyphs.length > 1 ? "vertical-rl" : "horizontal-tb",
  });
}
// left-aligned lines
function paragraph(group, text, x, y, width, fontSize, tones, props) {
  const maxChars = Math.floor(width / (fontSize * 0.47)),
    lines = [""];
  text.split(" ").forEach((word) => {
    if ((lines[lines.length - 1] + " " + word).trim().length > maxChars) lines.push(word);
    else lines[lines.length - 1] = (lines[lines.length - 1] + " " + word).trim();
  });
  lines.forEach((line, i) =>
    addText(
      group,
      Object.assign(
        {
          t: line,
          tr: `translate(${roundCoord(x)} ${roundCoord(y + i * fontSize * 1.45)})`,
          fs: fontSize,
          fill: tones.ink,
          o: 0.85,
          an: "start",
        },
        props || {},
      ),
    ),
  );
  return y + lines.length * fontSize * 1.45;
}
// object drawn by its own scene code
function vignette(groups, x, y, scale, draw) {
  const layers = [],
    group = newGroup();
  layers.push(group);
  draw(layers, group);
  layers.forEach((layer) => {
    layer.tf = `translate(${roundCoord(x)}px, ${roundCoord(y)}px) scale(${scale})`;
    layer.to = "0px 0px";
    layer.anim = "none";
    groups.push(layer);
  });
}
// frame every card shares
function cardFrame(groups, tones, key, x, y, width, height, jp, en, seal) {
  const group = newGroup(),
    rand = rng(hash("card/" + key));
  groups.push(group);
  washi(group, rand, x, y, width, height, tones, 0);
  const points = [];
  for (let i = 0; i <= 22; i++) {
    const angle = -2.2 + (i / 22) * 5.6;
    points.push([x + 200 + Math.cos(angle) * 118, y + 150 + Math.sin(angle) * 104]);
  }
  brushWash(group, rand, points, 20, tones.inkSoft, 0.22, { tip: 0.2 });
  addText(group, {
    t: jp,
    tr: `translate(${roundCoord(x + width - 46)} ${roundCoord(y + 40 + jp.length * 22)})`,
    fs: 40,
    font: "'Yuji Syuku', serif",
    fill: tones.ink,
    wm: "vertical-rl",
    o: 0.92,
  });
  brushStroke(
    group,
    rand,
    [
      [x + width - 28, y + 26],
      [x + width - 18, y + 36],
    ],
    2.6,
    tones.ink,
    0.7,
  );
  brushStroke(
    group,
    rand,
    [
      [x + width - 18, y + 26],
      [x + width - 28, y + 36],
    ],
    2.6,
    tones.ink,
    0.7,
  );
  addText(group, {
    t: en,
    tr: `translate(${roundCoord(x + 36)} ${roundCoord(y + 296)})`,
    fs: 30,
    fill: tones.ink,
    an: "start",
  });
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x + 36, y + 318],
        [x + 200, y + 316],
        [x + width - 120, y + 319],
      ],
      0.8,
    ),
    tones.ink,
    1,
    0.35,
  );
  if (seal) hanko(group, rand, x + width - 50, y + height - 56, 38, seal, tones);
  const textGroup = newGroup();
  groups.push(textGroup);
  return {
    g: textGroup,
    r: rng(hash("card/" + key + "/t")),
    x0: x + 36,
    w: width - 72,
    y0: y + 352,
  };
}
function knob(group, rand, x, y, jp, en, tones, active) {
  inked(
    group,
    rand,
    wobblyRing(rand, x, y, 21, 21, 1, 10),
    active ? mix(tones.red, tones.paper, 0.75) : mix(tones.paper, tones.stone, 0.25),
    tones.ink,
    1.1,
  );
  addText(group, {
    t: jp,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: 20,
    font: "'Yuji Syuku', serif",
    fill: active ? tones.red : tones.ink,
  });
  addText(group, {
    t: en,
    tr: `translate(${roundCoord(x)} ${roundCoord(y + 36)})`,
    fs: 14,
    fill: tones.ink,
    o: 0.7,
  });
}
// one card for the site
const CARD = {
  record: [
    "蓄音機",
    "the record player",
    null,
    (layers, group, tones) => {
      const rand = rng(hash("vig/rec"));
      recordPlayer(group, rand, 0, 0, 1, tones, hourLight(tones, 17.6, "aki"));
      sleeve(
        group,
        rand,
        [
          [-118, -26],
          [-80, -36],
          [-76, 2],
          [-114, 10],
        ],
        tones,
        0,
      );
    },
    200,
    168,
    1.45,
  ],
  incense: [
    "香炉",
    "incense",
    "香",
    (layers, group, tones, opts) =>
      koro(layers, group, rng(hash("vig/koro")), 0, 0, tones, true, opts.burnt ?? 0, !opts.lit),
    200,
    268,
    1.25,
  ],
  tree: [
    "七十二候",
    "the season, small",
    "候",
    (layers, group, tones, opts) => {
      const rand = rng(hash("vig/maple")),
        look = seasonLook(tones, opts.season);
      brushStroke(
        group,
        rand,
        [
          [20, 210],
          [110, 160],
          [210, 140],
          [300, 96],
        ],
        7,
        tones.ink,
        0.9,
        { head: 0.9, tip: 0.3 },
      );
      brushStroke(
        group,
        rand,
        [
          [150, 152],
          [190, 190],
          [240, 200],
        ],
        3.5,
        tones.ink,
        0.85,
        { tip: 0.3 },
      );
      if (look.crown) {
        const crownTones = Object.assign({}, tones, look.crown);
        maple(group, rand, 230, 120, 70, 70, crownTones);
        maple(group, rand, 210, 196, 40, 30, crownTones);
      } else {
        snowCap(
          group,
          rand,
          [
            [40, 196],
            [110, 156],
            [210, 136],
            [296, 92],
          ],
          4,
        );
      }
      if (look.s === "aki")
        [
          [110, 60],
          [140, 44],
          [170, 32],
          [126, 76],
          [150, 90],
        ].forEach(([gooseX, gooseY]) =>
          addLine(
            group,
            wobblyLine(
              rand,
              [
                [gooseX - 8, gooseY + 3],
                [gooseX, gooseY],
                [gooseX + 9, gooseY + 4],
              ],
              0.4,
            ),
            tones.ink,
            1.6,
            0.85,
            true,
          ),
        );
    },
    40,
    60,
    1,
  ],
  crate: [
    "音盤",
    "the record crate",
    "箱",
    (layers, group, tones, opts) => {
      const rand = rng(hash("vig/crate"));
      addWash(
        group,
        rand,
        wobblyRing(rand, 0, 74, 170, 14, 1, 12),
        tones.pool,
        0.7,
        "url(#bk-pool)",
      );
      DISC_LOOK.forEach((_, slot) => {
        const tilt = ((slot - 2) * 9 * Math.PI) / 180,
          lift = slot === (opts.disc ?? 0) ? 16 : 0,
          cx = (slot - 2) * 46,
          toDisc = ([u, v]) => [
            cx + u * Math.cos(tilt) - v * Math.sin(tilt),
            70 - lift + u * Math.sin(tilt) + v * Math.cos(tilt),
          ],
          sleeveGroup = newGroup();
        layers.push(sleeveGroup);
        sleeve(
          sleeveGroup,
          rand,
          [
            [-36, -96],
            [36, -98],
            [37, -24],
            [-35, -22],
          ].map(toDisc),
          tones,
          slot,
        );
      });
    },
    222,
    214,
    1.15,
  ],
  sky: [
    "灯籠",
    "today's sky",
    "空",
    (layers, group, tones) => lantern(group, rng(hash("vig/lantern")), 0, 0, 1, tones, true),
    200,
    262,
    2,
  ],
  tea: [
    "茶",
    "the tea",
    "茶",
    (layers, group, tones) => teaCup(layers, group, rng(hash("vig/tea")), 0, 0, tones, false),
    210,
    280,
    2,
  ],
};
function cardShell(tones, key, height, opts) {
  const [jp, en, seal, draw, vignetteX, vignetteY, vignetteScale] = CARD[key],
    groups = [];
  cardFrame(groups, tones, key, 6, 6, 520, height, jp, en, seal);
  vignette(groups, 6 + vignetteX, 6 + vignetteY, vignetteScale, (layers, group) =>
    draw(layers, group, tones, opts || {}),
  );
  return { W: 540, H: height + 22, groups, clips: [], y0: 358 };
}

export {
  THEME_VARS,
  mix,
  toneVars,
  setPrecision,
  TONE_CSS,
  FILTERS,
  groupSvg,
  toSvg,
  leafPath,
  roundCoord,
  leafSpray,
  jitter,
  addSolid,
  addLine,
  TREMBLE_FILTER,
  culmGeometry,
  culmPart,
  lerp,
  wobblyPolygon,
  addWash,
  WASH_FILTER,
  wobblyLine,
  smooth,
  cutFace,
  culmTop,
  CULMS,
  edgeHit,
  bambooClump,
  newGroup,
  wobblyRing,
  rng,
  hash,
  sceneBamboo,
  addText,
  dryBrush,
  fingertip,
  brushWash,
  brushPath,
  brushStroke,
  CLAYS,
  piece,
  radiusAt,
  GLAZES,
  PAINTS,
  hotspot,
  inked,
  kanji,
  note,
  wheel,
  wobblyBox,
  GLAZE_NAMES,
  GLAZE_KANJI,
  PROFILES,
  demoSpec,
  spin,
  wetClay,
  arrowLine,
  bucket,
  brushTool,
  WORKSHOP_WIDTH,
  noren,
  projectAll,
  wobblySegment,
  workshopWalls,
  face,
  post,
  dryingBench,
  noborigama,
  chamber,
  workshopInside,
  sceneGarden16,
  steppingStones,
  stone,
  oblique,
  gableRoof,
  thatchStrokes,
  ridge,
  plaque,
  sekiStone,
  stoneBody,
  mist,
  mistPath,
  frames,
  sceneWorkshop,
  obliqueScaled,
  sceneWheel,
  sceneShapes,
  heatBar,
  tongs,
  sceneKiln,
  sceneGlazes,
  scenePaint,
  dashed,
  sceneShelf,
  scenePieceCard,
  sceneEngawa,
  hourLight,
  SEASONS,
  solarHour,
  SKY,
  smoothstep,
  seasonLook,
  maple,
  skyLayer,
  stars,
  STARLIGHT,
  skyWash,
  arcAt,
  sunDisc,
  moonDisc,
  SNOW,
  snowCap,
  lantern,
  arcTop,
  cordTie,
  quadMap,
  slab,
  sleeve,
  crateSleeve,
  teaCup,
  steam,
  koro,
  recordPlayer,
  hangingLamp,
  lampGlow,
  falling,
  fireflies,
  veil,
  polygonPath,
  ensoDial,
  clockLabel,
  washi,
  hanko,
  paragraph,
  vignette,
  cardFrame,
  knob,
  cardShell,
  CARD,
};
