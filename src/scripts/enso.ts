// Riddle door: "the garden is round".
// Press and drag in the home intro and a brush stroke follows from the first pixel.
// Too small, too fast or open, the ink fades; a closed loop stays as an enso
// and a dotted path walks off to the map.
// On touch the brush waits for a short press, so scrolling stays.

import { findDoor } from "../utils/garden";

type Point = [number, number];

const area = document.querySelector<HTMLElement>(".hero-text");
const NS = "http://www.w3.org/2000/svg";

function smooth(pts: Point[]): string {
  if (pts.length < 3) return `M${pts.map((p) => p.join(" ")).join(" L")}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const [lx, ly] = pts[pts.length - 1];
  return `${d} L${lx} ${ly}`;
}

/** A loop counts when it is big, unhurried, nearly closed and goes all the way round */
function closed(pts: Point[], ms: number): boolean {
  if (pts.length < 16 || ms < 350) return false;
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs);
  const h = Math.max(...ys) - Math.min(...ys);
  if (w < 70 || h < 70 || Math.max(w, h) / Math.min(w, h) > 2.5) return false;
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  if (Math.hypot(ex - sx, ey - sy) > Math.max(30, 0.3 * Math.min(w, h))) return false;
  const cx = xs.reduce((a, b) => a + b) / xs.length;
  const cy = ys.reduce((a, b) => a + b) / ys.length;
  let sweep = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = Math.atan2(pts[i - 1][1] - cy, pts[i - 1][0] - cx);
    const b = Math.atan2(pts[i][1] - cy, pts[i][0] - cx);
    sweep += ((b - a + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  }
  return Math.abs(sweep) > (300 * Math.PI) / 180;
}

if (area) {
  const hero = area.closest<HTMLElement>(".hero") ?? area;
  const canvas = document.createElementNS(NS, "svg");
  canvas.classList.add("enso-canvas");
  canvas.setAttribute("aria-hidden", "true");
  hero.append(canvas);

  let pts: Point[] = [];
  let stroke: SVGPathElement | null = null;
  let began = 0;
  let pending = 0;
  let pressed: Point = [0, 0];
  let drawing = false;

  const at = (e: PointerEvent): Point => {
    const box = hero.getBoundingClientRect();
    return [Math.round(e.clientX - box.left), Math.round(e.clientY - box.top)];
  };

  function begin(e: PointerEvent) {
    drawing = true;
    pts = [at(e)];
    began = performance.now();
    stroke = document.createElementNS(NS, "path");
    stroke.classList.add("enso-stroke");
    canvas.append(stroke);
    stroke.setAttribute("d", smooth(pts));
    try {
      area!.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone
    }
  }

  function fade(path: SVGPathElement) {
    path.classList.add("is-fading");
    path.addEventListener("transitionend", () => path.remove(), { once: true });
    setTimeout(() => path.remove(), 1200);
  }

  function keep(path: SVGPathElement) {
    path.classList.add("is-kept");
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const right = Math.max(...xs);
    const mid = (Math.min(...ys) + Math.max(...ys)) / 2;
    const end: Point = [right + 140, mid + 70];
    const trail = document.createElementNS(NS, "path");
    trail.classList.add("enso-trail");
    trail.setAttribute(
      "d",
      `M${right + 6} ${mid} C ${right + 50} ${mid + 4}, ${right + 70} ${mid + 60}, ${end[0] - 8} ${end[1] - 4}`,
    );
    canvas.append(trail);

    const link = document.createElement("a");
    link.href = "/map/?found";
    link.className = "enso-link hand";
    link.textContent = "the map →";
    link.style.left = `${end[0]}px`;
    link.style.top = `${end[1] - 14}px`;
    hero.append(link);
    findDoor("enso");
  }

  function finish() {
    if (!drawing || !stroke) return;
    drawing = false;
    if (closed(pts, performance.now() - began)) keep(stroke);
    else fade(stroke);
    stroke = null;
  }

  area.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (e.target as Element).closest("a, button")) return;
    if (e.pointerType === "mouse" || e.pointerType === "pen") {
      e.preventDefault();
      begin(e);
      return;
    }

    // touch: a short still press picks up the brush; moving first scrolls
    pressed = at(e);
    pending = window.setTimeout(() => {
      pending = 0;
      begin(e);
      pts = [pressed];
    }, 280);
  });

  area.addEventListener("pointermove", (e) => {
    if (pending) {
      const [x, y] = at(e);
      if (Math.hypot(x - pressed[0], y - pressed[1]) < 8) return;
      clearTimeout(pending);
      pending = 0;
      return;
    }
    if (!drawing || !stroke) return;
    const p = at(e);
    const last = pts[pts.length - 1];
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 2) return;
    pts.push(p);
    stroke.setAttribute("d", smooth(pts));
  });

  // while the brush is down on touch, the page holds still
  area.addEventListener(
    "touchmove",
    (e) => {
      if (drawing) e.preventDefault();
    },
    { passive: false },
  );

  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    area.addEventListener(type, () => {
      clearTimeout(pending);
      pending = 0;
      finish();
    });
  }
}
