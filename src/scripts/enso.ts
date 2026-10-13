// "the garden is round"

import { findDoor } from "../utils/garden";

type Point = [number, number];

const hero = document.querySelector<HTMLElement>(".hero");
const SVG_NS = "http://www.w3.org/2000/svg";

function smooth(points: Point[]): string {
  if (points.length < 3) return `M${points.map((point) => point.join(" ")).join(" L")}`;
  let path = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nextX, nextY] = points[i + 1];
    path += ` Q${x} ${y} ${(x + nextX) / 2} ${(y + nextY) / 2}`;
  }
  const [lastX, lastY] = points[points.length - 1];
  return `${path} L${lastX} ${lastY}`;
}

const FADE_FALLBACK_MS = 1200;
const TOUCH_HOLD_MS = 280;
const TOUCH_SLOP = 8;
const MIN_STEP = 2;
const TRAIL_START_GAP = 6;
const TRAIL_REACH = { x: 140, y: 70 };
const TRAIL_BEND_1 = { x: 50, y: 4 };
const TRAIL_BEND_2 = { x: 70, y: 60 };
const TRAIL_END_GAP = { x: 8, y: 4 };
const LINK_RAISE = 14;

// what counts as a drawn circle
const MIN_POINTS = 10;
const MIN_DURATION_MS = 200;
const MIN_SIDE = 70;
const MAX_ASPECT = 2.5;
const CLOSE_GAP_MIN = 30;
const CLOSE_GAP_SHARE = 0.4;
const MIN_TURN = (300 * Math.PI) / 180;

function closed(points: Point[], duration: number): boolean {
  if (points.length < MIN_POINTS || duration < MIN_DURATION_MS) return false;
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (
    Math.min(width, height) < MIN_SIDE ||
    Math.max(width, height) / Math.min(width, height) > MAX_ASPECT
  )
    return false;
  const centerX = (Math.max(...xs) + Math.min(...xs)) / 2;
  const centerY = (Math.max(...ys) + Math.min(...ys)) / 2;
  const gap = Math.max(CLOSE_GAP_MIN, CLOSE_GAP_SHARE * Math.min(width, height));
  const [startX, startY] = points[0];
  let turn = 0;
  for (let i = 1; i < points.length; i++) {
    const fromAngle = Math.atan2(points[i - 1][1] - centerY, points[i - 1][0] - centerX);
    const toAngle = Math.atan2(points[i][1] - centerY, points[i][0] - centerX);
    turn += ((toAngle - fromAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
    const [x, y] = points[i];
    if (Math.abs(turn) >= MIN_TURN && Math.hypot(x - startX, y - startY) <= gap) return true;
  }
  return false;
}

if (hero) {
  const canvas = document.createElementNS(SVG_NS, "svg");
  canvas.classList.add("enso-canvas");
  canvas.setAttribute("aria-hidden", "true");
  hero.append(canvas);

  let points: Point[] = [];
  let stroke: SVGPathElement | null = null;
  let began = 0;
  let pending = 0;
  let pressed: Point = [0, 0];
  let drawing = false;

  const pointAt = (event: PointerEvent): Point => {
    const box = hero.getBoundingClientRect();
    return [Math.round(event.clientX - box.left), Math.round(event.clientY - box.top)];
  };

  function begin(event: PointerEvent) {
    drawing = true;
    points = [pointAt(event)];
    began = performance.now();
    stroke = document.createElementNS(SVG_NS, "path");
    stroke.classList.add("enso-stroke");
    canvas.append(stroke);
    stroke.setAttribute("d", smooth(points));
    try {
      hero.setPointerCapture(event.pointerId);
    } catch {
      // the pointer is already gone
    }
  }

  function fade(path: SVGPathElement) {
    path.classList.add("is-fading");
    path.addEventListener("transitionend", () => path.remove(), { once: true });
    setTimeout(() => path.remove(), FADE_FALLBACK_MS);
  }

  function keep(path: SVGPathElement) {
    path.classList.add("is-kept");
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const middleY = (Math.min(...ys) + Math.max(...ys)) / 2;

    const link = document.createElement("a");
    link.href = "/engawa/";
    link.className = "enso-link hand";
    link.textContent = "the veranda →";
    hero.append(link);

    // path walks off to the right,
    // or to the left when the enso sits too near the edge
    const right = Math.max(...xs);
    const roomOnRight = hero.clientWidth - right >= TRAIL_REACH.x + link.offsetWidth;
    const side = roomOnRight ? 1 : -1;
    const from = roomOnRight ? right : Math.min(...xs);
    const along = (offset: number) => from + side * offset;
    const tail: Point = [along(TRAIL_REACH.x), middleY + TRAIL_REACH.y];
    const trail = document.createElementNS(SVG_NS, "path");
    trail.classList.add("enso-trail");
    trail.setAttribute(
      "d",
      `M${along(TRAIL_START_GAP)} ${middleY} C ${along(TRAIL_BEND_1.x)} ${middleY + TRAIL_BEND_1.y}, ${along(TRAIL_BEND_2.x)} ${middleY + TRAIL_BEND_2.y}, ${tail[0] - side * TRAIL_END_GAP.x} ${tail[1] - TRAIL_END_GAP.y}`,
    );
    canvas.append(trail);

    if (!roomOnRight) link.textContent = "← the veranda";
    link.style.left = `${roomOnRight ? tail[0] : tail[0] - link.offsetWidth}px`;
    link.style.top = `${tail[1] - LINK_RAISE}px`;
    findDoor("enso");
  }

  function finish() {
    if (!drawing || !stroke) return;
    drawing = false;
    if (closed(points, performance.now() - began)) keep(stroke);
    else fade(stroke);
    stroke = null;
  }

  hero.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || (event.target as Element).closest("a, button")) return;
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
      event.preventDefault();
      begin(event);
      return;
    }

    // touch: a short still press picks up the brush; moving first scrolls
    pressed = pointAt(event);
    pending = window.setTimeout(() => {
      pending = 0;
      begin(event);
      points = [pressed];
    }, TOUCH_HOLD_MS);
  });

  hero.addEventListener("pointermove", (event) => {
    if (pending) {
      const [x, y] = pointAt(event);
      if (Math.hypot(x - pressed[0], y - pressed[1]) < TOUCH_SLOP) return;
      clearTimeout(pending);
      pending = 0;
      return;
    }
    if (!drawing || !stroke) return;

    const moves = event.getCoalescedEvents?.() ?? [];
    for (const move of moves.length > 0 ? moves : [event]) {
      const point = pointAt(move);
      const last = points[points.length - 1];
      if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= MIN_STEP) points.push(point);
    }
    stroke.setAttribute("d", smooth(points));
  });

  // while the brush is down on touch, the page holds still
  hero.addEventListener(
    "touchmove",
    (event) => {
      if (drawing) event.preventDefault();
    },
    { passive: false },
  );

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    hero.addEventListener(type, () => {
      clearTimeout(pending);
      pending = 0;
      finish();
    });
  }
}
