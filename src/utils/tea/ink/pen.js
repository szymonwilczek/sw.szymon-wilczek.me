// the hand: wobbly shapes, washes, brush strokes and the oblique projection

import { roundCoord, lerp, smooth } from "./core.js";

// ink kit
const TREMBLE_FILTER = "url(#bk-tremble)";
const WASH_FILTER = "url(#bk-wash)";
const jitter = (rand, amount) => (rand() - 0.5) * 2 * amount;

function wobblyPolygon(rand, points, wobble) {
  const shaken = points.map(([x, y]) => [
    x + jitter(rand, wobble * 0.5),
    y + jitter(rand, wobble * 0.5),
  ]);
  let path = `M${roundCoord(shaken[0][0])} ${roundCoord(shaken[0][1])}`;
  for (let i = 0; i < shaken.length; i++) {
    const current = shaken[i],
      next = shaken[(i + 1) % shaken.length];
    path += ` Q${roundCoord((current[0] + next[0]) / 2 + jitter(rand, wobble))} ${roundCoord((current[1] + next[1]) / 2 + jitter(rand, wobble))} ${roundCoord(next[0])} ${roundCoord(next[1])}`;
  }
  return path + " Z";
}

const wobblyBox = (rand, x0, y0, x1, y1, wobble) =>
  wobblyPolygon(
    rand,
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    wobble,
  );

const wobblyLine = (rand, points, wobble) =>
  smooth(
    points.map(([x, y]) => [x + jitter(rand, wobble), y + jitter(rand, wobble)]),
    false,
  );

const wobblySegment = (rand, from, to, wobble, steps) =>
  wobblyLine(
    rand,
    Array.from({ length: (steps || 3) + 1 }, (_, i) => [
      lerp(from[0], to[0], i / (steps || 3)),
      lerp(from[1], to[1], i / (steps || 3)),
    ]),
    wobble,
  );

const wobblyRing = (rand, cx, cy, rx, ry, wobble, steps) =>
  smooth(
    Array.from({ length: steps || 12 }, (_, i) => {
      const angle = (i / (steps || 12)) * Math.PI * 2;
      return [
        cx + Math.cos(angle) * (rx + jitter(rand, wobble)),
        cy + Math.sin(angle) * (ry + jitter(rand, wobble)),
      ];
    }),
    true,
  );

function newGroup(overrides) {
  return Object.assign(
    {
      tf: "none",
      tr: "none",
      to: "0px 0px",
      op: 1,
      anim: "none",
      vars: "",
      clip: "",
      washO: 0.58,
      wash: [],
      solid: [],
      line: [],
      text: [],
    },
    overrides || {},
  );
}

function addWash(group, rand, path, fill, opacity, filter) {
  group.wash.push({
    d: path,
    fill,
    o: opacity ?? 1,
    f: filter || WASH_FILTER,
    t: `translate(${roundCoord(1 + rand() * 2)} ${roundCoord(0.8 + rand() * 1.8)})`,
  });
}

function addLine(group, path, color, width, opacity, plain) {
  group.line.push({
    d: path,
    c: color,
    w: width ?? 1.3,
    o: opacity ?? 1,
    f: plain ? "" : TREMBLE_FILTER,
  });
}

function addSolid(group, path, fill, opacity, filter) {
  group.solid.push({ d: path, fill, o: opacity ?? 1, f: filter || "" });
}

function addText(group, props) {
  group.text.push(
    Object.assign(
      {
        tr: "",
        fs: 14,
        font: "Kalam, cursive",
        fill: "#000",
        o: 1,
        wm: "horizontal-tb",
        ls: "0",
        an: "middle",
      },
      props,
    ),
  );
}

function inked(group, rand, path, fill, ink, width) {
  addWash(group, rand, path, fill);
  addLine(group, path, ink, width ?? 1.3);
}

// brush stroke
function brushPath(rand, points, width, opts) {
  opts = opts || {};
  const samples = [];

  for (let i = 0; i < points.length - 1; i++)
    for (let step = 0; step < 4; step++)
      samples.push([
        lerp(points[i][0], points[i + 1][0], step / 4),
        lerp(points[i][1], points[i + 1][1], step / 4),
      ]);
  samples.push(points[points.length - 1]);

  const count = samples.length,
    leftEdge = [],
    rightEdge = [],
    tailStart = opts.tailAt ?? 0.7,
    tip = opts.tip ?? 0.1;

  for (let i = 0; i < count; i++) {
    const prev = samples[Math.max(0, i - 1)],
      next = samples[Math.min(count - 1, i + 1)],
      length = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
    const nx = -(next[1] - prev[1]) / length,
      ny = (next[0] - prev[0]) / length,
      progress = i / (count - 1);
    const head = opts.blunt ? 1 : Math.min(1, (opts.head ?? 0.4) + progress * 5);
    const tail = progress > tailStart ? lerp(1, tip, (progress - tailStart) / (1 - tailStart)) : 1;
    const halfWidth = (width * head * tail * (0.86 + 0.28 * rand())) / 2;

    leftEdge.push([samples[i][0] + nx * halfWidth, samples[i][1] + ny * halfWidth]);
    rightEdge.push([samples[i][0] - nx * halfWidth, samples[i][1] - ny * halfWidth]);
  }
  return smooth(leftEdge.concat(rightEdge.reverse()), true);
}

function brushStroke(group, rand, points, width, color, opacity, opts) {
  addSolid(group, brushPath(rand, points, width, opts), color, opacity ?? 0.92, TREMBLE_FILTER);
}

function brushWash(group, rand, points, width, color, opacity, opts) {
  addWash(
    group,
    rand,
    brushPath(rand, points, width, opts),
    color,
    opacity ?? 0.8,
    "url(#bk-bleed)",
  );
}

// band of mist
function mistPath(rand, x0, x1, y, height) {
  const steps = 22,
    points = [];
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2,
      cos = Math.cos(angle),
      sin = Math.sin(angle);
    points.push([
      (x0 + x1) / 2 + (cos * (x1 - x0)) / 2 + jitter(rand, 6),
      y + sin * (height / 2) * (0.7 + 0.3 * Math.abs(cos)) + jitter(rand, height * 0.12),
    ]);
  }
  return smooth(points, true);
}

function mist(group, rand, x0, x1, y, height, fill, opacity, edge) {
  addWash(group, rand, mistPath(rand, x0, x1, y, height), fill, opacity ?? 0.8, "url(#bk-bleed)");
  if (edge) addLine(group, mistPath(rand, x0 + 4, x1 - 4, y, height * 0.92), edge, 0.9, 0.55);
}

const oblique = (ox, oy, slantX, slantY) => (x, z, y) => [
  ox + x + z * (slantX ?? 0.6),
  oy - z * (slantY ?? 0.42) - (y || 0),
];
const projectAll = (project, points) => points.map(([x, z, y]) => project(x, z, y));

export {
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
  brushPath,
  brushStroke,
  brushWash,
  mistPath,
  mist,
  oblique,
  projectAll,
};
