// the tea, the lamp, the koro and the weather on the eaves

import { mix, lerp, rng, hash } from "../core.js";
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
  brushWash,
} from "../pen.js";
import { steam } from "../garden.js";

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

  smoke(groups, tip, tones, mini);
}

// incense smoke
const SMOKE_SEED = "koro/smoke"; // the same curls at every redraw, so they never restart
const THREAD_RISE = 40; // how far the smoke climbs as one thread before it breaks
const THREAD_STEPS = 6;
const THREAD_LEAN = 1.5; // the thread bends a little with the air at its top
const THREAD_WIGGLE = 0.25;
const THREAD_WIDTH = 0.8;
const THREAD_INK = 0.7;
const THREAD_BLEED = { width: 2.6, ink: 0.22 }; // the soft halo around the thread
const THREAD_SWAY = "sway 7s ease-in-out infinite";

const WISPS = 8; // curls rising at once, spread evenly over one breath of smoke
const SMOKE_SECONDS = 12; // how long one curl takes to rise and thin out
const SMOKE_PACE_SPREAD = 0.15; // curls rise at slightly different paces
const SMOKE_EASE = "cubic-bezier(0.35, 0.4, 0.6, 1)"; // fast off the ember, slowing as it cools
const WISP_LENGTH = { min: 18, max: 30 };
const WISP_STEPS = 6;
const WISP_OVERLAP = 8; // a curl is born a little way down the thread, so the two never part
const WISP_SWAY = { min: 2, max: 5 }; // how far a curl snakes from side to side
const WISP_WAVES = { min: 1, max: 2.2 }; // half-waves along one curl
const WISP_CURL = { min: 2, max: 5 }; // radius of the eddy a curl ends in
const WISP_CURL_TURN = { min: 0.4, max: 1.5 }; // of a half turn
const WISP_CURL_STEPS = 4;
const WISP_POOL = { spread: 1.6, ink: 0.14 }; // the ink bleeding out round a curl, by its sway
const WISP_WIDTH = 2.4;
const WISP_WASH = 0.55;
const WISP_CORE = { width: 0.6, ink: 0.45 };
const WISP_DRIFT = { min: -4, max: 14 };
const WISP_RISE = { min: 70, max: 95 };
const WISP_TURN = { min: -14, max: 14 };

const RISE_FROM_BASE = "transform-box:fill-box;transform-origin:50% 100%";
const STILL_RISE_SHARE = 0.5;

function between(rand, { min, max }) {
  return lerp(min, max, rand());
}

function smokeThread(groups, rand, [tipX, tipY], tones, still) {
  const points = [];
  for (let step = 0; step <= THREAD_STEPS; step++) {
    const along = step / THREAD_STEPS;
    points.push([tipX + THREAD_LEAN * along * along, tipY - THREAD_RISE * along]);
  }
  const thread = still ? newGroup() : newGroup({ anim: THREAD_SWAY, vars: RISE_FROM_BASE });
  brushWash(thread, rand, points, THREAD_BLEED.width, tones.inkSoft, THREAD_BLEED.ink);
  addLine(thread, wobblyLine(rand, points, THREAD_WIGGLE), tones.inkSoft, THREAD_WIDTH, THREAD_INK);
  groups.push(thread);
  return points.at(-1);
}

function wispPoints(rand, [baseX, baseY], side, length, swayBy) {
  const points = [],
    waves = between(rand, WISP_WAVES);
  for (let step = 0; step <= WISP_STEPS; step++) {
    const along = step / WISP_STEPS,
      sway = side * swayBy * Math.sin(along * Math.PI * waves) * along;
    points.push([baseX + sway, baseY - length * along]);
  }

  // the end rolls over into a small eddy
  const [endX, endY] = points.at(-1),
    curl = between(rand, WISP_CURL),
    turn = between(rand, WISP_CURL_TURN),
    centerX = endX - side * curl;
  for (let step = 1; step <= WISP_CURL_STEPS; step++) {
    const angle = (step / WISP_CURL_STEPS) * turn * Math.PI;
    points.push([centerX + side * curl * Math.cos(angle), endY - curl * Math.sin(angle)]);
  }
  return points;
}

// still: each curl set down where it would be at its share of the way up
function stillWisp(wisp, drift, rise) {
  const share = wisp / WISPS;
  return {
    group: newGroup({ op: 1 - share }),
    shift: [drift * share, -rise * share * STILL_RISE_SHARE],
  };
}

function risingWisp(rand, wisp, drift, rise) {
  const seconds = SMOKE_SECONDS * (1 + SMOKE_PACE_SPREAD * (rand() * 2 - 1)),
    delay = (-wisp / WISPS) * seconds,
    turn = between(rand, WISP_TURN);
  return {
    group: newGroup({
      cls: "rising",
      anim: `koro-smoke ${seconds.toFixed(2)}s ${SMOKE_EASE} ${delay.toFixed(2)}s infinite`,
      vars: `${RISE_FROM_BASE};--drift:${drift.toFixed(1)}px;--rise:${rise.toFixed(1)}px;--turn:${turn.toFixed(1)}deg`,
    }),
    shift: [0, 0],
  };
}

function smoke(groups, tip, tones, still) {
  const rand = rng(hash(SMOKE_SEED)),
    [threadX, threadY] = smokeThread(groups, rand, tip, tones, still);
  for (let wisp = 0; wisp < WISPS; wisp++) {
    const drift = between(rand, WISP_DRIFT),
      rise = between(rand, WISP_RISE),
      { group, shift } = still ? stillWisp(wisp, drift, rise) : risingWisp(rand, wisp, drift, rise),
      [baseX, baseY] = [threadX + shift[0], threadY + WISP_OVERLAP + shift[1]],
      length = between(rand, WISP_LENGTH),
      swayBy = between(rand, WISP_SWAY),
      points = wispPoints(rand, [baseX, baseY], rand() < 0.5 ? 1 : -1, length, swayBy),
      poolRadius = swayBy * WISP_POOL.spread;
    addWash(
      group,
      rand,
      wobblyRing(rand, baseX, baseY - length / 2, poolRadius, length / 2, 0.4, 8),
      tones.inkSoft,
      WISP_POOL.ink,
      "url(#bk-pool)",
    );
    brushWash(group, rand, points, WISP_WIDTH, tones.inkSoft, WISP_WASH);
    addLine(
      group,
      wobblyLine(rand, points, THREAD_WIGGLE),
      tones.inkSoft,
      WISP_CORE.width,
      WISP_CORE.ink,
    );
    groups.push(group);
  }
}

export { teaCup, hangingLamp, seasonLook, SNOW, snowCap, arcTop, falling, koro };
