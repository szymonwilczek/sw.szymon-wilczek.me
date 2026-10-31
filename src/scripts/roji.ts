import {
  bambooClump,
  brushStroke,
  brushWash,
  newGroup,
  groupSvg,
  toneVars,
  rng,
  hash,
  sceneGarden16,
  toSvg,
} from "../utils/tea/ink.js";
import { turned, type PieceSpec } from "../utils/tea/pottery";
import { fits } from "../utils/tea/key";
import { earn } from "../utils/garden";

type P = [number, number];
type Cut = { line: [P, P]; phase: "fall" | "down" };

const scene = document.querySelector<HTMLElement>(".roji")!;
const svg = scene.querySelector<SVGSVGElement>("svg")!;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const CLUMP = { x: 250, y: 404, half: 60, top: 150 };

function draw(cutLine: Cut, still: boolean) {
  const groups: object[] = [];
  bambooClump(groups, rng(hash("bb")), CLUMP.x, CLUMP.y, toneVars(), 1, cutLine);
  const previous = svg.querySelector(".roji-bamboo")!;
  previous.outerHTML = groupSvg({ cls: `roji-bamboo${still ? "" : " cutting"}`, groups });
}

// swipe cuts only if it runs across the clump
function across([from, to]: [P, P]): boolean {
  if (Math.abs(to[0] - from[0]) < 40) return false;
  const minX = Math.min(from[0], to[0]),
    maxX = Math.max(from[0], to[0]);
  if (minX > CLUMP.x - CLUMP.half || maxX < CLUMP.x + CLUMP.half) return false;
  const crossY = from[1] + ((to[1] - from[1]) * (CLUMP.x - from[0])) / (to[0] - from[0]);
  return crossY > CLUMP.top && crossY < CLUMP.y - 20;
}

let done = false;
let madeCut: Cut | undefined;

const STONE_KEY = "roji:key";
const stone = scene.querySelector<HTMLButtonElement>(".stone")!;
const form = scene.querySelector<HTMLFormElement>(".key")!;
const said = form.querySelector("output")!;

async function open(slowly: boolean) {
  if (slowly && !still.matches) {
    svg.querySelector(".roji-stone")?.classList.add("rolling");
    svg.querySelector(".roji-roof")?.classList.add("lifting");
    await new Promise((resolve) => setTimeout(resolve, 1400));
  }
  const shelf: PieceSpec[] = JSON.parse(scene.dataset.shelf || "[]");
  const garden = sceneGarden16(toneVars(), "open", {
    shelf: (i: number) => (shelf[i] ? turned(shelf[i]) : null),
    cut: madeCut,
  });
  svg.innerHTML = toSvg(garden, true);
  scene.classList.add("open");
  scene.querySelector(".door:not(.machiai)")?.setAttribute("aria-label", "Into the workshop");
}

stone.addEventListener("click", () => {
  form.hidden = !form.hidden;
  stone.setAttribute("aria-expanded", String(!form.hidden));
  if (!form.hidden) form.key.focus();
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const phrase = String(form.key.value);
  if (!(await fits(phrase))) {
    said.textContent = "the stone does not move.";
    form.classList.remove("nope");
    void form.offsetWidth;
    form.classList.add("nope");
    return;
  }
  localStorage.setItem(STONE_KEY, phrase);
  form.hidden = true;
  open(true);
});
const kept = localStorage.getItem(STONE_KEY);
if (kept) fits(kept).then((matches): unknown => matches && open(false));

// into the open workshop
const door = scene.querySelector<HTMLButtonElement>(".door:not(.machiai)")!;
const machiai = scene.querySelector<HTMLButtonElement>(".machiai")!;
const kobo = scene.querySelector<HTMLElement>(".kobo")!;
async function inside(
  from: HTMLButtonElement,
  origin: string,
  enter: (leave: () => void) => Promise<void>,
) {
  if (!still.matches) {
    svg.style.transformOrigin = origin;
    scene.classList.add("zooming");
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  scene.classList.remove("zooming");
  scene.classList.add("inside");
  kobo.hidden = false;
  await enter(() => {
    kobo.hidden = true;
    kobo.innerHTML = "";
    scene.classList.remove("inside");
    from.focus();
  });
  kobo.querySelector<HTMLElement>(".kobo-title")?.scrollIntoView({ block: "nearest" });
}
const shut = scene.querySelector<HTMLElement>(".shut")!;
door.addEventListener("click", () => {
  if (!scene.classList.contains("open")) {
    shut.hidden = !shut.hidden;
    door.setAttribute("aria-expanded", String(!shut.hidden));
    return;
  }
  door.removeAttribute("aria-expanded");
  const code = import("./kobo/index");
  inside(door, "61% 46%", async (leave) => (await code).enter(kobo, leave));
});
machiai.addEventListener("click", () => {
  earn("茶");
  const code = import("./machiai");
  const shelf: PieceSpec[] = JSON.parse(scene.dataset.shelf || "[]");
  inside(machiai, "15% 78%", async (leave) => (await code).enter(kobo, shelf, leave));
});

const pointAt = (event: PointerEvent): P => {
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
    svg.getScreenCTM()!.inverse(),
  );
  return [Math.round(point.x), Math.round(point.y)];
};

let start: P | null = null;
let trail: P[] = [];
let slash: SVGGElement | null = null;
let queued = false;
const tones = toneVars();
function paint() {
  queued = false;
  if (!slash || trail.length < 2) return;
  const group = newGroup(),
    rand = rng(hash("slash"));
  brushWash(group, rand, trail, 10, tones.gold, 0.55);
  brushStroke(group, rand, trail, 2.4, tones.ink, 0.5, { tip: 0.05, head: 0.1 });
  slash.innerHTML = groupSvg(group);
}
function lift(wasCut: boolean) {
  const stroke = slash;
  slash = null;
  trail = [];
  if (!stroke) return;
  if (still.matches) return stroke.remove();
  stroke.classList.add(wasCut ? "lifting" : "missing");
  stroke.addEventListener("animationend", () => stroke.remove(), { once: true });
}
svg.addEventListener("pointerdown", (event) => {
  if (done) return;
  start = pointAt(event);
  trail = [start];
  slash?.remove();
  slash = document.createElementNS("http://www.w3.org/2000/svg", "g");
  slash.classList.add("roji-slash");
  svg.append(slash);
});
svg.addEventListener("pointermove", (event) => {
  if (!start || done) return;
  const point = pointAt(event),
    last = trail[trail.length - 1];
  if (Math.hypot(point[0] - last[0], point[1] - last[1]) < 8) return;
  trail.push(point);
  if (trail.length > 24) trail = trail.filter((_, i) => i % 2 === 0 || i === trail.length - 1);
  if (!queued) {
    queued = true;
    requestAnimationFrame(paint);
  }
});
scene.addEventListener("pointerup", (event) => {
  if (!start || done) return;
  const line: [P, P] = [start, pointAt(event)];
  start = null;
  const crosses = across(line);
  lift(crosses);
  if (!crosses) return;
  done = true;
  draw({ line, phase: "down" }, false);
  madeCut = { line, phase: "down" };
});
scene.addEventListener("pointercancel", () => {
  start = null;
  lift(false);
});
