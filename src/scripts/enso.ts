// Riddle door: "the garden is round".
// Press and drag in the home intro and a brush stroke follows from the first pixel.
// Too small, too fast or open, the ink fades; a closed loop stays as an enso
// and a dotted path walks off to the veranda, open on the garden.
// On touch the brush waits for a short press, so scrolling stays.

import { findDoor } from "../utils/garden";

type Point = [number, number];

const area = document.querySelector<HTMLElement>(".hero-text");
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

/** A loop counts when it is big, unhurried, nearly closed and goes all the way round */
function closed(points: Point[], duration: number): boolean {
  if (points.length < 16 || duration < 350) return false;
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  if (width < 70 || height < 70 || Math.max(width, height) / Math.min(width, height) > 2.5)
    return false;
  const [startX, startY] = points[0];
  const [endX, endY] = points[points.length - 1];
  if (Math.hypot(endX - startX, endY - startY) > Math.max(30, 0.3 * Math.min(width, height)))
    return false;
  const centerX = xs.reduce((sum, value) => sum + value) / xs.length;
  const centerY = ys.reduce((sum, value) => sum + value) / ys.length;
  let sweep = 0;
  for (let i = 1; i < points.length; i++) {
    const fromAngle = Math.atan2(points[i - 1][1] - centerY, points[i - 1][0] - centerX);
    const toAngle = Math.atan2(points[i][1] - centerY, points[i][0] - centerX);
    sweep += ((toAngle - fromAngle + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  }
  return Math.abs(sweep) > (300 * Math.PI) / 180;
}

if (area) {
  const hero = area.closest<HTMLElement>(".hero") ?? area;
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
      area!.setPointerCapture(event.pointerId);
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
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const right = Math.max(...xs);
    const middleY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const tail: Point = [right + 140, middleY + 70];
    const trail = document.createElementNS(SVG_NS, "path");
    trail.classList.add("enso-trail");
    trail.setAttribute(
      "d",
      `M${right + 6} ${middleY} C ${right + 50} ${middleY + 4}, ${right + 70} ${middleY + 60}, ${tail[0] - 8} ${tail[1] - 4}`,
    );
    canvas.append(trail);

    const link = document.createElement("a");
    link.href = "/engawa/";
    link.className = "enso-link hand";
    link.textContent = "the veranda →";
    link.style.left = `${tail[0]}px`;
    link.style.top = `${tail[1] - 14}px`;
    hero.append(link);
    findDoor("enso");
  }

  function finish() {
    if (!drawing || !stroke) return;
    drawing = false;
    if (closed(points, performance.now() - began)) keep(stroke);
    else fade(stroke);
    stroke = null;
  }

  area.addEventListener("pointerdown", (event) => {
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
    }, 280);
  });

  area.addEventListener("pointermove", (event) => {
    if (pending) {
      const [x, y] = pointAt(event);
      if (Math.hypot(x - pressed[0], y - pressed[1]) < 8) return;
      clearTimeout(pending);
      pending = 0;
      return;
    }
    if (!drawing || !stroke) return;
    const point = pointAt(event);
    const last = points[points.length - 1];
    if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 2) return;
    points.push(point);
    stroke.setAttribute("d", smooth(points));
  });

  // while the brush is down on touch, the page holds still
  area.addEventListener(
    "touchmove",
    (event) => {
      if (drawing) event.preventDefault();
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
