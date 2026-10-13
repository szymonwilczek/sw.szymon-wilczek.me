// clay, glazes, pigments and the piece itself

import { mix, hash, rng, lerp } from "./core.js";
import {
  jitter,
  wobblyPolygon,
  wobblyLine,
  wobblyRing,
  addLine,
  addSolid,
  brushStroke,
} from "./pen.js";

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

const HANDLE_REACH = 0.55;
const HANDLE_THICKNESS = 7;

/** How far a piece reaches left and right of its centre once drawn */
function pieceSpan(spec, scale) {
  const widest = Math.max(...spec.prof.map(([radius]) => radius)) * scale,
    rimRadius = spec.prof[spec.prof.length - 1][0] * scale;
  return { left: widest, right: widest + (spec.handle ? rimRadius * HANDLE_REACH : 0) };
}

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

/** The clay, and the glaze as this firing left it (each firing shifts it a little) */
function firedColours(tones, spec, fireRand) {
  const clay = CLAYS(tones)[spec.clay || 0];
  let glaze = spec.glaze && !spec.glaze.none ? GLAZES(tones)[spec.glaze.c] : null;
  if (glaze) glaze = mix(glaze, fireRand() < 0.5 ? tones.ink : tones.paper, fireRand() * 0.12);
  return { clay, glaze };
}

function piece(group, rand, cx, cy, scale, tones, spec) {
  const profile = spec.prof,
    rimRadius = profile[profile.length - 1][0] * scale,
    height = spec.H * scale,
    rimY = cy - height,
    fireRand = rng(spec.fire || 1);
  const bodyRadius = (down) => radiusAt(profile, 1 - down) * scale,
    squash = 0.3,
    shallow = height < rimRadius * 0.45;
  const { clay, glaze } = firedColours(tones, spec, fireRand);
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
        // a dry brush: the bristles part and leave paper between them
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
      reach = rimRadius * HANDLE_REACH;
    const handle = [
      handleTop,
      [handleTop[0] + reach * 0.75, handleTop[1] - 3 * scale],
      [handleTop[0] + reach, lerp(handleTop[1], handleBottom[1], 0.45)],
      [handleBottom[0] + reach * 0.55, handleBottom[1] + 2 * scale],
      handleBottom,
    ];
    brushStroke(group, rand, handle, HANDLE_THICKNESS * scale, glaze || clay, 1, {
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

// the piece turned over, seen from straight below
const FOOT_RING_SHARE = 0.18;
const FOOT_SHADOW_OFFSET = 5;
const WALL_SAMPLES = 24;
const TRIM_MARKS = 3;
const KILN_GRIT = 6;
const SEAL_FILL = 0.55;
const HANDLE_ROOT_SHARE = 0.8;
const HANDLE_STEPS = 6;

/** The widest the wall gets between two depths, 0 at the rim and 1 at the foot */
function widestBetween(profile, from, to) {
  return Math.max(
    ...Array.from({ length: WALL_SAMPLES + 1 }, (_, i) =>
      radiusAt(profile, 1 - lerp(from, to, i / WALL_SAMPLES)),
    ),
  );
}

/** Side of the seal pressed inside the foot ring */
function footSealSize(spec, scale) {
  const innerRadius = spec.prof[0][0] * scale * (1 - FOOT_RING_SHARE);
  return innerRadius * Math.SQRT2 * SEAL_FILL;
}

function pieceFoot(group, rand, cx, cy, scale, tones, spec) {
  const profile = spec.prof,
    fireRand = rng(spec.fire || 1);
  const { clay, glaze } = firedColours(tones, spec, fireRand);
  const widest = widestBetween(profile, 0, 1) * scale,
    footRadius = profile[0][0] * scale,
    innerRadius = footRadius * (1 - FOOT_RING_SHARE),
    rimRadius = profile[profile.length - 1][0] * scale;
  const bareRadius = glaze ? widestBetween(profile, spec.glaze.dip, 1) * scale : widest;
  const disc = (radius, wobble = 0.3) => wobblyRing(rand, cx, cy, radius, radius, wobble, 18);

  addSolid(
    group,
    wobblyRing(
      rand,
      cx + FOOT_SHADOW_OFFSET * scale,
      cy + FOOT_SHADOW_OFFSET * scale,
      widest,
      widest,
      0.4,
      16,
    ),
    tones.ink,
    0.16,
  );
  if (spec.handle) {
    const root = cx + widest * HANDLE_ROOT_SHARE,
      end = cx + widest + rimRadius * HANDLE_REACH,
      halfThick = (HANDLE_THICKNESS / 2) * scale;
    const edge = (sign) =>
      Array.from({ length: HANDLE_STEPS + 1 }, (_, i) => [
        lerp(root, end - halfThick, i / HANDLE_STEPS),
        cy + sign * halfThick,
      ]);
    const tip = Array.from({ length: HANDLE_STEPS + 1 }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.PI * i) / HANDLE_STEPS;
      return [end - halfThick + Math.cos(angle) * halfThick, cy + Math.sin(angle) * halfThick];
    });
    const outline = [...edge(-1), ...tip.slice(1, -1), ...edge(1).reverse()];
    addSolid(group, wobblyPolygon(rand, outline, 0.2), glaze || clay, 1);
    addLine(group, wobblyLine(rand, outline, 0.2), tones.ink, 1, 0.85);
  }
  const wall = disc(widest);
  addSolid(group, wall, glaze || clay, 1);
  if (bareRadius < widest) addSolid(group, disc(bareRadius), clay, 1);
  addLine(group, wall, tones.ink, 1.2, 0.95);
  addSolid(group, disc(footRadius, 0.2), mix(clay, tones.ink, 0.15), 1);
  addLine(group, disc(footRadius, 0.2), tones.ink, 0.9, 0.85);
  const recess = disc(innerRadius, 0.2);
  addSolid(group, recess, mix(clay, tones.ink, 0.06), 1);
  addLine(group, recess, tones.ink, 0.8, 0.7);
  for (let mark = 0; mark < TRIM_MARKS; mark++) {
    const start = fireRand() * Math.PI * 2,
      from = innerRadius * (0.85 - mark * 0.22);
    const scrape = Array.from({ length: 9 }, (_, i) => {
      const angle = start + i * 0.35,
        radius = from - i * innerRadius * 0.02;
      return [cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius];
    });
    addLine(group, wobblyLine(rand, scrape, 0.2), tones.ink, 0.6, 0.25);
  }
  for (let speck = 0; speck < KILN_GRIT; speck++) {
    const angle = fireRand() * Math.PI * 2,
      radius = lerp(innerRadius, footRadius, 0.3 + fireRand() * 0.4);
    addSolid(
      group,
      wobblyRing(
        rand,
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
        0.5 + fireRand(),
        0.5 + fireRand(),
        0.1,
        5,
      ),
      mix(clay, tones.ink, 0.5),
      0.6,
    );
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
  };
}

export {
  obliqueScaled,
  CLAYS,
  GLAZES,
  GLAZE_NAMES,
  GLAZE_KANJI,
  PAINTS,
  radiusAt,
  PROFILES,
  piece,
  pieceFoot,
  footSealSize,
  pieceSpan,
  demoSpec,
};
