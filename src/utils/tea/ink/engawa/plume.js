// what rises off the porch: incense smoke and the steam off the tea. Curls of
// ink that rise, spread and thin out into the air, each one gone at both ends
// of its loop so the loop has no seam (keyframes `rising` in engawa.astro)

import { lerp, rng, hash } from "../core.js";
import { newGroup, addWash, addLine, wobblyLine, wobblyRing, brushWash } from "../pen.js";

// sizes in scene units, turns in degrees, times in seconds
const SMOKE = {
  seed: "koro/smoke", // the same curls at every redraw, so they never restart
  wisps: 8, // curls rising at once, spread evenly over one breath of smoke
  seconds: 12, // how long one curl takes to rise and thin out
  ease: "cubic-bezier(0.35, 0.4, 0.6, 1)", // fast off the ember, slowing as it cools
  spread: 0, // all from the one thread
  overlap: 8, // a curl is born a little way down the thread, so the two never part
  length: { min: 18, max: 30 },
  sway: { min: 2, max: 5 }, // how far a curl snakes from side to side
  waves: { min: 1, max: 2.2 }, // half-waves along one curl
  curl: { min: 2, max: 5 }, // radius of the eddy a curl ends in
  curlTurn: { min: 0.4, max: 1.5 }, // of a half turn
  pool: { spread: 1.6, ink: 0.14 }, // the ink bleeding out round a curl, by its sway
  width: 2.4,
  wash: 0.55,
  core: { width: 0.6, ink: 0.45 },
  // where a curl ends up: the garden air leans it right
  drift: { min: -4, max: 14 },
  rise: { min: 70, max: 95 },
  turn: { min: -14, max: 14 },
  grow: { from: 0.55, to: 2.1 },
  ink: { peak: 0.9, halfway: 0.45 },
};

// steam leaves the whole face of the tea at once and is gone sooner than smoke
const STEAM = {
  seed: "tea/steam",
  wisps: 4,
  seconds: 6,
  ease: "cubic-bezier(0.3, 0.45, 0.6, 1)",
  spread: 5, // across the face of the tea
  overlap: 0,
  length: { min: 8, max: 14 },
  sway: { min: 1.5, max: 3 },
  waves: { min: 0.8, max: 1.6 },
  curl: { min: 1.5, max: 3 },
  curlTurn: { min: 0.3, max: 1 },
  pool: { spread: 1.4, ink: 0.16 },
  width: 2.2,
  wash: 0.55,
  core: { width: 1, ink: 0.65 },
  drift: { min: -3, max: 6 },
  rise: { min: 22, max: 34 },
  turn: { min: -10, max: 10 },
  grow: { from: 0.6, to: 1.6 },
  ink: { peak: 1, halfway: 0.5 },
};

const PACE_SPREAD = 0.15; // curls rise at slightly different paces
const WISP_STEPS = 6;
const CURL_STEPS = 4;
const WIGGLE = 0.25;
const POOL_WOBBLE = 0.4;
const POOL_STEPS = 8;

// the incense thread: laminar, straight up off the ember until it breaks
const THREAD_RISE = 40;
const THREAD_STEPS = 6;
const THREAD_LEAN = 1.5; // the thread bends a little with the air at its top
const THREAD_WIDTH = 0.8;
const THREAD_INK = 0.7;
const THREAD_BLEED = { width: 2.6, ink: 0.22 }; // the soft halo around the thread
const THREAD_SWAY = "sway 7s ease-in-out infinite";

const RISE_FROM_BASE = "transform-box:fill-box;transform-origin:50% 100%";
const STILL_RISE_SHARE = 0.5; // on a card the plume is drawn still, and shorter, to fit

function between(rand, { min, max }) {
  return lerp(min, max, rand());
}

const either = (rand) => (rand() < 0.5 ? 1 : -1);

function wispPoints(rand, spec, [baseX, baseY], length, swayBy) {
  const points = [],
    side = either(rand),
    waves = between(rand, spec.waves);
  for (let step = 0; step <= WISP_STEPS; step++) {
    const along = step / WISP_STEPS,
      sway = side * swayBy * Math.sin(along * Math.PI * waves) * along;
    points.push([baseX + sway, baseY - length * along]);
  }
  // the end rolls over into a small eddy
  const [endX, endY] = points.at(-1),
    curl = between(rand, spec.curl),
    turn = between(rand, spec.curlTurn),
    centerX = endX - side * curl;
  for (let step = 1; step <= CURL_STEPS; step++) {
    const angle = (step / CURL_STEPS) * turn * Math.PI;
    points.push([centerX + side * curl * Math.cos(angle), endY - curl * Math.sin(angle)]);
  }
  return points;
}

// still: each curl set down where it would be at its share of the way up
function stillWisp(spec, wisp, drift, rise) {
  const share = wisp / spec.wisps;
  return {
    group: newGroup({ op: 1 - share }),
    shift: [drift * share, -rise * share * STILL_RISE_SHARE],
  };
}

function risingWisp(rand, spec, wisp, drift, rise) {
  const seconds = spec.seconds * (1 + PACE_SPREAD * (rand() * 2 - 1)),
    delay = (-wisp / spec.wisps) * seconds,
    turn = between(rand, spec.turn),
    vars = [
      RISE_FROM_BASE,
      `--drift:${drift.toFixed(1)}px`,
      `--rise:${rise.toFixed(1)}px`,
      `--turn:${turn.toFixed(1)}deg`,
      `--grow-from:${spec.grow.from}`,
      `--grow-to:${spec.grow.to}`,
      `--peak-ink:${spec.ink.peak}`,
      `--halfway-ink:${spec.ink.halfway}`,
    ];
  return {
    group: newGroup({
      cls: "rising",
      anim: `rising ${seconds.toFixed(2)}s ${spec.ease} ${delay.toFixed(2)}s infinite`,
      vars: vars.join(";"),
    }),
    shift: [0, 0],
  };
}

function plume(groups, spec, [x, y], tones, still) {
  const rand = rng(hash(spec.seed));
  for (let wisp = 0; wisp < spec.wisps; wisp++) {
    const drift = between(rand, spec.drift),
      rise = between(rand, spec.rise),
      { group, shift } = still
        ? stillWisp(spec, wisp, drift, rise)
        : risingWisp(rand, spec, wisp, drift, rise),
      baseX = x + shift[0] + spec.spread * (rand() * 2 - 1),
      baseY = y + spec.overlap + shift[1],
      length = between(rand, spec.length),
      swayBy = between(rand, spec.sway),
      points = wispPoints(rand, spec, [baseX, baseY], length, swayBy);
    addWash(
      group,
      rand,
      wobblyRing(
        rand,
        baseX,
        baseY - length / 2,
        swayBy * spec.pool.spread,
        length / 2,
        POOL_WOBBLE,
        POOL_STEPS,
      ),
      tones.inkSoft,
      spec.pool.ink,
      "url(#bk-pool)",
    );
    brushWash(group, rand, points, spec.width, tones.inkSoft, spec.wash);
    addLine(group, wobblyLine(rand, points, WIGGLE), tones.inkSoft, spec.core.width, spec.core.ink);
    groups.push(group);
  }
}

function smokeThread(groups, rand, [tipX, tipY], tones, still) {
  const points = [];
  for (let step = 0; step <= THREAD_STEPS; step++) {
    const along = step / THREAD_STEPS;
    points.push([tipX + THREAD_LEAN * along * along, tipY - THREAD_RISE * along]);
  }
  const thread = still ? newGroup() : newGroup({ anim: THREAD_SWAY, vars: RISE_FROM_BASE });
  brushWash(thread, rand, points, THREAD_BLEED.width, tones.inkSoft, THREAD_BLEED.ink);
  addLine(thread, wobblyLine(rand, points, WIGGLE), tones.inkSoft, THREAD_WIDTH, THREAD_INK);
  groups.push(thread);
  return points.at(-1);
}

// incense: a thin thread off the ember that breaks into curls
function smoke(groups, tip, tones, still) {
  const threadTop = smokeThread(groups, rng(hash(SMOKE.seed + "/thread")), tip, tones, still);
  plume(groups, SMOKE, threadTop, tones, still);
}

// tea: short curls straight off the face of the tea
function steam(groups, surface, tones) {
  plume(groups, STEAM, surface, tones, false);
}

export { smoke, steam };
