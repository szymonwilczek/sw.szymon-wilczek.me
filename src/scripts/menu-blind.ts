// Phone menu

type Point = [number, number];
type Curve = Point[];

const sheet = document.querySelector<HTMLDialogElement>("#menu-sheet");
const paper = sheet?.querySelector<HTMLElement>(".menu-paper");
const hemPaths = [...(sheet?.querySelectorAll<SVGPathElement>(".menu-hem") ?? [])];
const strokePath = sheet?.querySelector<SVGPathElement>(".menu-stroke");
const hairsPath = sheet?.querySelector<SVGPathElement>(".menu-hairs");
const rows = [
  ...(paper?.querySelectorAll<HTMLElement>(".menu-list li, .menu-theme, .menu-extra") ?? []),
];
const openButton = document.querySelector<HTMLButtonElement>("#menu-open");
const closeButton = document.querySelector<HTMLButtonElement>("#menu-close");
const iconLines = [...(closeButton?.querySelectorAll<SVGPathElement>("path") ?? [])];

// how long each way takes
// the rest of the timing follows from these
const OPEN_MS = 850;
const CLOSE_MS = 500;
const CLOSE_ROLL = 0.85; // share of the close spent pulling the paper up

// the drop
// the time of each follows from how high it goes
const BOUNCES = [0.02, 0.005];
const FALL_TIME = 1;
const FALL_AND_BOUNCES =
  FALL_TIME + BOUNCES.reduce((sum, height) => sum + 2 * Math.sqrt(height), 0);

// the rows
const ROW_LAG = 10; // px a row starts above its place
const ROW_SETTLE_MS = 300;
const CLOSE_LIFT = 8; // px the rows rise as the paper is pulled up

// the brush stroke along the foot
const BRUSH = 9; // px, as wide as it gets
const BRUSH_LIFT = 2; // px between the stroke and the very foot
const BRUSH_FROM = -32; // px, beyond the left edge so it never shows its start
const BRUSH_TO = 0.8; // share of the width where the ink gives out
const BRUSH_SAG = 1.6;
const BRUSH_STEPS = 48;
const BRUSH_PRESS = 0.08; // share of the length spent pressing down
const BRUSH_PRESSED = 0.75; // how wide it starts, before it is pressed
const BRUSH_LIGHTEN = 0.25; // how much narrower it ends than it was pressed
const BRUSH_RIPPLE = 0.15; // the uneven pressure of the hand
const BRUSH_RIPPLES = 9;
const HAIRS = [-3.4, -1.8, -0.4, 1.2, 2.8, 3.9];
const HAIRS_LEAVE = 0.74;
const HAIRS_REACH = 0.86;
const HAIRS_SPREAD = 0.025;
const HAIRS_LENGTHS = 5; // hairs come in this many lengths
const HAIRS_SHUFFLE = 7; // so neighbours are not the same length
const HAIR_STEPS = 8;
const HAIR_WOBBLE = 0.4;
const HAIR_WAVES = 5; // how many times a hair wavers along its length
const HAIR_PHASE = 1.7; // how differently each hair wavers
const HAIR_ROOT = 0.8; // how close together they are where they leave
const HEM = 34; // px above the foot
const HEM_SECOND = 6;
const HEM_WAVE = 8; // px its top edge wanders
const HEM_STEPS = 30;

// [waves across the width, share, phase] of the hem's wandering edge
const HEM_WAVES: [number, number, number][] = [
  [2, 0.35, 1.1],
  [3, 0.2, 4],
  [5, 0.12, 2.3],
  [7, 0.08, 5.2],
];

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

const MIDDLE: Point = [14, 10]; // where the middle line draws in to
const OPEN_GONE: Point = [0, 0.4];
const OPEN_TOP: Point = [0.1, 0.75];
const OPEN_BOTTOM: Point = [0.16, 0.8];
const CLOSE_TOP: Point = [0, 0.7];
const CLOSE_BOTTOM: Point = [0.05, 0.75];
const CLOSE_BACK: Point = [0.35, 1];

const clamp = (value: number, least = 0, most = 1) => Math.min(most, Math.max(least, value));
const share = (t: number, [from, to]: Point) => clamp((t - from) / (to - from));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (p: Point, q: Point, t: number): Point => [
  lerp(p[0], q[0], t),
  lerp(p[1], q[1], t),
];
const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const calm = (t: number) => easeInOut(clamp(t));
const fixed = (value: number) => Math.round(value * 10) / 10;
const toward = (c: Curve, point: Point, t: number): Curve => c.map((p) => between(p, point, t));

// how far down the foot of the paper is, at time t of the opening
function drop(t: number) {
  let time = t * FALL_AND_BOUNCES;
  if (time < FALL_TIME) return (time / FALL_TIME) ** 2;
  time -= FALL_TIME;
  for (const height of BOUNCES) {
    const half = Math.sqrt(height);
    if (time < 2 * half) return 1 - (height - (time - half) ** 2);
    time -= 2 * half;
  }
  return 1;
}

// curve swung about its own middle onto another
function pivot(from: Curve, to: Curve, s: number): Curve {
  const middle = (c: Curve) => between(c[0], c[3], 0.5);
  const angle = (c: Curve) => Math.atan2(c[3][1] - c[0][1], c[3][0] - c[0][0]);
  const span = (c: Curve) => Math.hypot(c[3][0] - c[0][0], c[3][1] - c[0][1]);
  const turn = (angle(to) - angle(from)) * s;
  const stretch = lerp(1, span(to) / span(from), s);
  const [cx, cy] = middle(from);
  const [mx, my] = between(middle(from), middle(to), s);
  const settle = clamp(s);
  return from.map(([x, y], i) => {
    const dx = (x - cx) * stretch,
      dy = (y - cy) * stretch;
    const turned: Point = [
      mx + dx * Math.cos(turn) - dy * Math.sin(turn),
      my + dx * Math.sin(turn) + dy * Math.cos(turn),
    ];
    return between(turned, to[i], settle * settle);
  });
}

const curve = (c: Curve) =>
  `M${fixed(c[0][0])} ${fixed(c[0][1])} C ${c
    .slice(1)
    .map(([x, y]) => `${fixed(x)} ${fixed(y)}`)
    .join(", ")}`;

function drawIcon(opening: boolean, t: number) {
  let lines: (Curve | null)[];
  if (opening) {
    const gone = calm(share(t, OPEN_GONE));
    lines = [
      pivot(HAMBURGER[0], CROSS[0], calm(share(t, OPEN_TOP))),
      gone >= 1 ? null : toward(HAMBURGER[1], MIDDLE, gone),
      pivot(HAMBURGER[2], CROSS[1], calm(share(t, OPEN_BOTTOM))),
    ];
  } else {
    const back = calm(share(t, CLOSE_BACK));
    lines = [
      pivot(CROSS[0], HAMBURGER[0], calm(share(t, CLOSE_TOP))),
      back <= 0 ? null : toward(HAMBURGER[1], MIDDLE, 1 - back),
      pivot(CROSS[1], HAMBURGER[2], calm(share(t, CLOSE_BOTTOM))),
    ];
  }
  lines.forEach((line, i) => iconLines[i]?.setAttribute("d", line ? curve(line) : ""));
}

let width = 0;
let height = 0;
let rowBottoms: number[] = [];
let passedAt: (number | null)[] = [];

const path = (points: Point[]) =>
  "M" + points.map(([x, y]) => `${fixed(x)} ${fixed(y)}`).join(" L");

// points from x0 to x1 at height y, sagging a little in the middle
const across = (y: number, x0: number, x1: number, sag: number, steps: number) =>
  Array.from(
    { length: steps + 1 },
    (_, i): Point => [lerp(x0, x1, i / steps), y + sag * Math.sin((Math.PI * i) / steps)],
  );

// band of ink along points, as wide at each as the brush says
function band(points: Point[], wide: (t: number) => number) {
  const left: Point[] = [];
  const right: Point[] = [];
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const length = Math.hypot(dx, dy) || 1;
    const half = wide(i / (points.length - 1)) / 2;
    left.push([p[0] - (dy / length) * half, p[1] + (dx / length) * half]);
    right.push([p[0] + (dy / length) * half, p[1] - (dx / length) * half]);
  });
  return path(left.concat(right.reverse())) + " Z";
}

function brush(foot: number) {
  const middle = foot - BRUSH / 2 - BRUSH_LIFT;
  const points = across(middle, BRUSH_FROM, width * BRUSH_TO, BRUSH_SAG, BRUSH_STEPS);
  const press = (t: number) =>
    BRUSH *
    (t < BRUSH_PRESS
      ? BRUSH_PRESSED + ((1 - BRUSH_PRESSED) * t) / BRUSH_PRESS
      : 1 - BRUSH_LIGHTEN * t) *
    (1 - BRUSH_RIPPLE * Math.sin(t * BRUSH_RIPPLES));
  return band(points, press);
}

// each hair a line drawn by hand, wandering a little on its own
function hairs(foot: number) {
  const middle = foot - BRUSH / 2 - BRUSH_LIFT;
  return HAIRS.map((tip, i) => {
    const from: Point = [width * HAIRS_LEAVE, middle + tip * HAIR_ROOT];
    const to: Point = [
      width * (HAIRS_REACH + HAIRS_SPREAD * ((i * HAIRS_SHUFFLE) % HAIRS_LENGTHS)),
      middle + tip,
    ];
    const points = Array.from({ length: HAIR_STEPS + 1 }, (_, k): Point => {
      const t = k / HAIR_STEPS;
      const [x, y] = between(from, to, t);
      return [x, y + HAIR_WOBBLE * Math.sin(t * HAIR_WAVES + i * HAIR_PHASE)];
    });
    return path(points);
  }).join(" ");
}

function hem(foot: number) {
  const top = across(foot - HEM, 0, width, 0, HEM_STEPS).map(([x, y]): Point => {
    const a = (x / width) * Math.PI * 2;
    const wander = HEM_WAVES.reduce(
      (sum, [waves, part, phase]) => sum + part * Math.sin(waves * a + phase),
      0,
    );
    return [x, y + HEM_WAVE * wander];
  });
  return path([...top, [width, foot], [0, foot]]) + " Z";
}

// paper down to depth px from the top of the sheet
function drawSheet(depth: number) {
  if (!paper) return;
  paper.style.clipPath = depth >= height ? "" : `inset(0 0 ${fixed(height - depth)}px 0)`;
  const shown = depth > 1;
  const foot = Math.max(depth, BRUSH + 2 * BRUSH_LIFT);
  hemPaths.forEach((hemPath, i) =>
    hemPath.setAttribute("d", shown ? hem(foot - i * HEM_SECOND) : ""),
  );
  strokePath?.setAttribute("d", shown ? brush(foot) : "");
  hairsPath?.setAttribute("d", shown ? hairs(foot) : "");
}

function settleRows(depth: number, now: number) {
  rows.forEach((row, i) => {
    if (passedAt[i] === null && depth >= rowBottoms[i]) passedAt[i] = now;
    const since = passedAt[i];
    const u = since === null ? 0 : clamp((now - since) / ROW_SETTLE_MS);
    row.style.translate = u >= 1 ? "" : `0 ${fixed(-ROW_LAG * (1 - easeOut(u)))}px`;
  });
}

function liftRows(by: number) {
  for (const row of rows) row.style.translate = by ? `0 ${fixed(-by)}px` : "";
}

function measure() {
  if (!paper) return;
  const box = paper.getBoundingClientRect();
  width = box.width;
  height = box.height;
  rowBottoms = rows.map((row) => row.getBoundingClientRect().bottom - box.top);
}

const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let frame = 0;
let opening = false;
let depthNow = 0;

function run(open: boolean, from: number) {
  cancelAnimationFrame(frame);
  opening = open;
  const length = open ? OPEN_MS : CLOSE_MS;
  const start = performance.now() - from * length;
  passedAt = rows.map(() => null);
  const step = (now: number) => {
    const t = clamp((now - start) / length);
    depthNow = height * (open ? drop(t) : 1 - easeIn(share(t, [0, CLOSE_ROLL])));
    drawIcon(open, t);
    drawSheet(depthNow);
    if (open) settleRows(depthNow, now);
    else liftRows(CLOSE_LIFT * easeIn(share(t, [0, CLOSE_ROLL / 2])));
    const settling = rows.some((row) => row.style.translate);
    if (t < 1 || (open && settling)) frame = requestAnimationFrame(step);
    else if (!open) sheet?.close();
  };
  step(performance.now());
}

// the X sits exactly over the hamburger it grew from, wherever the bar is
function alignIcon() {
  if (!openButton || !closeButton) return;
  closeButton.style.translate = "";
  const from = openButton.getBoundingClientRect();
  const to = closeButton.getBoundingClientRect();
  closeButton.style.translate = `${from.left - to.left}px ${from.top - to.top}px`;
}

openButton?.addEventListener("click", () => {
  if (!sheet) return;
  sheet.showModal();
  sheet.focus({ preventScroll: true });
  openButton.setAttribute("aria-expanded", "true");
  alignIcon();
  measure();
  if (still()) {
    drawIcon(true, 1);
    return drawSheet(height);
  }
  run(true, 0);
});

// close in the middle of opening pulls the paper up from where it hangs
function gather() {
  if (!sheet?.open || sheet.classList.contains("closing")) return;
  if (still()) return sheet.close();
  sheet.classList.add("closing");
  const hangs = height ? depthNow / height : 1;
  run(false, opening ? CLOSE_ROLL * Math.cbrt(1 - hangs) : 0);
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
  if (paper) paper.style.clipPath = "";
  for (const hemPath of hemPaths) hemPath.setAttribute("d", "");
  strokePath?.setAttribute("d", "");
  hairsPath?.setAttribute("d", "");
  liftRows(0);
  drawIcon(true, 1);
  openButton?.setAttribute("aria-expanded", "false");
});

// turned phone
addEventListener("resize", () => {
  if (!sheet?.open || sheet.classList.contains("closing")) return;
  measure();
  drawSheet(height);
});

export {};
