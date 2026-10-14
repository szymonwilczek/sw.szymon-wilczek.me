// Phone menu

type Point = [number, number];
type Curve = Point[];

const sheet = document.querySelector<HTMLDialogElement>("#menu-sheet");
const paper = sheet?.querySelector<HTMLElement>(".menu-paper");
const ink = sheet?.querySelector<SVGSVGElement>(".menu-ink");
const openButton = document.querySelector<HTMLButtonElement>("#menu-open");
const closeButton = document.querySelector<HTMLButtonElement>("#menu-close");
const iconLines = [...(closeButton?.querySelectorAll<SVGPathElement>("path") ?? [])];

const OPEN_MS = 1100;
const CLOSE_MS = 700;
const SOAK = 0.75;

// the blot
const EDGE_POINTS = 300;
const SEED = 4711;
const WOBBLE = 0.13; // largest bend of the edge, a share of the radius
const WOBBLE_KINDS = 18; // how many waves, from slow bends to quick small ones
const WOBBLE_DRIFT = 0.0012; // the bends shift as it grows, so it never just scales
const FINGERS = 6;
const FINGER_WIDTH = [0.04, 0.07]; // radians, least and the most added to it
const FINGER_LENGTH = [0.12, 0.22]; // share of the radius
const FINGER_GROWN = 120; // px of spread before the fingers are full length
const COVER_STEP = 20; // px between the points that must all be inked
const COVER_GROWTH = 1.04;
const COVER_MOST = 6;

// pooled pigment along the edge
const POOL_SEED = SEED + 13;
const POOL_VARIES = 0.5;
const POOL_KINDS = 8;
const TIDE_LEAST = 0.7;
const TIDE_EXTRA = 1.6;
const TIDE_INNER = 0.4; // the band starts just inside the edge
const TIDE_OPACITY = 0.62;
const WET_DEPTH = 11; // px of still wet ink inside the edge

// lines that follow the edge
const EDGE_LINES = {
  halo: { offset: 7, width: 14, opacity: 0.06 },
  wash: { offset: 2.5, width: 5, opacity: 0.07 },
  pooled: { offset: -2.2, width: 3.4, opacity: 0.13 },
  wet: { offset: -WET_DEPTH, width: WET_DEPTH * 2, opacity: 0.08 },
};

// the icon, in its 28 × 20 box
const HAMBURGER: Curve[] = [
  [
    [2, 3],
    [9, 2],
    [18, 4],
    [26, 2.5],
  ],
  [
    [3, 10],
    [10, 9],
    [17, 11],
    [24, 9.5],
  ],
  [
    [2, 17],
    [8, 16],
    [14, 18],
    [19, 16.5],
  ],
];
const CROSS: Curve[] = [
  [
    [6, 2],
    [11, 7],
    [16, 12],
    [22, 18.5],
  ],
  [
    [5.5, 18],
    [12, 12],
    [17, 7],
    [22, 1.5],
  ],
];
const ICON_MIDDLE: Point = [14, 10];
const OPEN_MIDDLE_GOES: Point = [0, 0.4];
const OPEN_TOP_TURNS: Point = [0.1, 0.75];
const OPEN_BOTTOM_TURNS: Point = [0.16, 0.79];
const CLOSE_TOP_TURNS: Point = [0, 0.7];
const CLOSE_BOTTOM_TURNS: Point = [0.05, 0.75];
const CLOSE_MIDDLE_COMES: Point = [0.35, 1];

const clamp = (value: number, least = 0, most = 1) => Math.min(most, Math.max(least, value));
const share = (t: number, [from, to]: Point) => clamp((t - from) / (to - from));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (p: Point, q: Point, t: number): Point => [
  lerp(p[0], q[0], t),
  lerp(p[1], q[1], t),
];
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const fixed = (value: number) => Math.round(value * 10) / 10;

function random(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function wobble(seed: number, most: number, kinds: number, drift: number) {
  const next = random(seed);
  const waves: number[][] = [];
  for (let k = 2; k < 2 + kinds; k++)
    waves.push([
      k,
      (most / Math.pow(k - 1, 0.9)) * (0.4 + next()),
      next() * Math.PI * 2,
      (next() - 0.5) * drift,
    ]);
  return (angle: number, grow: number) =>
    waves.reduce(
      (sum, [k, size, phase, shift]) => sum + size * Math.sin(k * angle + phase + shift * grow * k),
      0,
    );
}

const edgeWobble = wobble(SEED, WOBBLE, WOBBLE_KINDS, WOBBLE_DRIFT);
const poolWobble = wobble(POOL_SEED, POOL_VARIES, POOL_KINDS, 0);
const fingerRandom = random(SEED + 7);
const fingers = Array.from({ length: FINGERS }, () => ({
  angle: fingerRandom() * Math.PI * 2,
  width: FINGER_WIDTH[0] + fingerRandom() * FINGER_WIDTH[1],
  length: FINGER_LENGTH[0] + fingerRandom() * FINGER_LENGTH[1],
}));
const angles = Array.from({ length: EDGE_POINTS }, (_, i) => (i / EDGE_POINTS) * Math.PI * 2);
const tides = angles.map((angle) => TIDE_LEAST + TIDE_EXTRA * clamp(0.5 + poolWobble(angle, 0)));

function reach(angle: number, grow: number) {
  let k = 1 + edgeWobble(angle, grow);
  for (const finger of fingers) {
    const apart = Math.atan2(Math.sin(angle - finger.angle), Math.cos(angle - finger.angle));
    k +=
      finger.length * Math.exp(-((apart / finger.width) ** 2)) * Math.min(1, grow / FINGER_GROWN);
  }
  return Math.max(0, grow * k);
}

// how far the drop must grow before it covers every corner of the sheet
function coverFrom([x0, y0]: Point, width: number, height: number) {
  let grow = Math.hypot(width, height) / 2;
  const covered = () => {
    for (let x = 0; x <= width + COVER_STEP; x += COVER_STEP)
      for (let y = 0; y <= height + COVER_STEP; y += COVER_STEP)
        if (Math.hypot(x - x0, y - y0) >= reach(Math.atan2(y - y0, x - x0), grow)) return false;
    return true;
  };
  for (let tries = 0; !covered() && tries < Math.log(COVER_MOST) / Math.log(COVER_GROWTH); tries++)
    grow *= COVER_GROWTH;
  return grow;
}

const loop = (points: Point[]) =>
  "M" + points.map(([x, y]) => `${fixed(x)} ${fixed(y)}`).join(" L") + " Z";

function pivot(from: Curve, to: Curve, s: number): Curve {
  const middle = (c: Curve) => between(c[0], c[3], 0.5);
  const angle = (c: Curve) => Math.atan2(c[3][1] - c[0][1], c[3][0] - c[0][0]);
  const span = (c: Curve) => Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]);
  const turn = (angle(to) - angle(from)) * s;
  const stretch = lerp(1, span(to) / span(from), s);
  const [cx, cy] = middle(from);
  const [mx, my] = between(middle(from), middle(to), s);
  return from.map(([x, y], i) => {
    const dx = (x - cx) * stretch,
      dy = (y - cy) * stretch;
    const turned: Point = [
      mx + dx * Math.cos(turn) - dy * Math.sin(turn),
      my + dx * Math.sin(turn) + dy * Math.cos(turn),
    ];
    return between(turned, to[i], s * s);
  });
}

const curve = (c: Curve | null) =>
  c
    ? `M${fixed(c[0][0])} ${fixed(c[0][1])} C ${c
        .slice(1)
        .map(([x, y]) => `${fixed(x)} ${fixed(y)}`)
        .join(", ")}`
    : "";

function drawIcon(opening: boolean, t: number) {
  let lines: (Curve | null)[];
  if (opening) {
    const gone = easeInOut(share(t, OPEN_MIDDLE_GOES));
    lines = [
      pivot(HAMBURGER[0], CROSS[0], easeInOut(share(t, OPEN_TOP_TURNS))),
      gone >= 1 ? null : HAMBURGER[1].map((p) => between(p, ICON_MIDDLE, gone)),
      pivot(HAMBURGER[2], CROSS[1], easeInOut(share(t, OPEN_BOTTOM_TURNS))),
    ];
  } else {
    const back = easeInOut(share(t, CLOSE_MIDDLE_COMES));
    lines = [
      pivot(CROSS[0], HAMBURGER[0], easeInOut(share(t, CLOSE_TOP_TURNS))),
      back <= 0 ? null : HAMBURGER[1].map((p) => between(p, ICON_MIDDLE, 1 - back)),
      pivot(CROSS[1], HAMBURGER[2], easeInOut(share(t, CLOSE_BOTTOM_TURNS))),
    ];
  }
  lines.forEach((line, i) => iconLines[i]?.setAttribute("d", curve(line)));
}

const SVG_NS = "http://www.w3.org/2000/svg";
const edgePaths = Object.fromEntries(
  Object.entries(EDGE_LINES).map(([name, line]) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", String(line.width));
    path.setAttribute("stroke-opacity", String(line.opacity));
    path.setAttribute("stroke-linejoin", "round");
    ink?.append(path);
    return [name, path];
  }),
);
const tidePath = document.createElementNS(SVG_NS, "path");
tidePath.setAttribute("fill", "currentColor");
tidePath.setAttribute("fill-opacity", String(TIDE_OPACITY));
tidePath.setAttribute("fill-rule", "evenodd");
ink?.append(tidePath);

let origin: Point = [0, 0];
let covers = 0;

function drawInk(spread: number) {
  const grow = covers * spread;
  if (!paper) return;
  if (grow <= 0) {
    paper.style.clipPath = "inset(0 0 100% 0)";
    for (const path of [...Object.values(edgePaths), tidePath]) path.setAttribute("d", "");
    return;
  }
  const radii = angles.map((angle) => reach(angle, grow));
  const ring = (out: number) =>
    angles.map(
      (angle, i): Point => [
        origin[0] + Math.cos(angle) * (radii[i] + out),
        origin[1] + Math.sin(angle) * (radii[i] + out),
      ],
    );
  const edge = loop(ring(0));
  paper.style.clipPath = `path("${edge}")`;
  for (const [name, line] of Object.entries(EDGE_LINES))
    edgePaths[name].setAttribute("d", loop(ring(line.offset)));
  const outer = angles.map(
    (angle, i): Point => [
      origin[0] + Math.cos(angle) * (radii[i] + tides[i]),
      origin[1] + Math.sin(angle) * (radii[i] + tides[i]),
    ],
  );
  tidePath.setAttribute("d", loop(outer) + " " + loop(ring(-TIDE_INNER)));
}

function clearInk() {
  if (paper) paper.style.clipPath = "";
  for (const path of [...Object.values(edgePaths), tidePath]) path.setAttribute("d", "");
}

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let frame = 0;
let opening = false;
let spreadNow = 0;

function run(open: boolean, from: number) {
  cancelAnimationFrame(frame);
  opening = open;
  const length = open ? OPEN_MS : CLOSE_MS;
  const start = performance.now() - from * length;
  const step = (now: number) => {
    const t = clamp((now - start) / length);
    spreadNow = open ? Math.pow(t, SOAK) : 1 - easeIn(t);
    drawIcon(open, t);
    if (t < 1) {
      drawInk(spreadNow);
      frame = requestAnimationFrame(step);
    } else if (open) {
      clearInk();
    } else {
      finish();
    }
  };
  step(performance.now());
}

function finish() {
  sheet?.close();
}

// X sits exactly over the hamburger it grew from, wherever the bar is
function alignIcon() {
  if (!openButton || !closeButton || !paper) return;
  closeButton.style.translate = "";
  const from = openButton.getBoundingClientRect();
  const to = closeButton.getBoundingClientRect();
  const box = paper.getBoundingClientRect();
  closeButton.style.translate = `${from.left - to.left}px ${from.top - to.top}px`;
  origin = [from.left + from.width / 2 - box.left, from.top + from.height / 2 - box.top];
  covers = coverFrom(origin, box.width, box.height);
}

openButton?.addEventListener("click", () => {
  if (!sheet) return;
  sheet.showModal();
  sheet.focus({ preventScroll: true });
  openButton.setAttribute("aria-expanded", "true");
  alignIcon();
  if (still()) return drawIcon(true, 1);
  run(true, 0);
});

function gather() {
  if (!sheet?.open || sheet.classList.contains("closing")) return;
  if (still()) return finish();
  sheet.classList.add("closing");
  run(false, opening ? Math.cbrt(1 - spreadNow) : 0);
}

closeButton?.addEventListener("click", gather);
sheet?.addEventListener("cancel", (event) => {
  event.preventDefault();
  gather();
});

// whoever closes the sheet, leaves it ready for next time
sheet?.addEventListener("close", () => {
  cancelAnimationFrame(frame);
  sheet.classList.remove("closing");
  clearInk();
  drawIcon(true, 1);
  openButton?.setAttribute("aria-expanded", "false");
});

export {};
