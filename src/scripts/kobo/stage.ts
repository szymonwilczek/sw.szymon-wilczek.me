import { groupSvg, toSvg, toneVars, FILTERS } from "../../utils/tea/ink.js";
import { turned, type PieceSpec } from "../../utils/tea/pottery";

export type Point = [number, number];
export const tones = toneVars();
export const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// where a piece is on its way through the workshop
export type Step = "wheel" | "shelf" | "bisque" | "glaze" | "fire" | "brush" | "done";
export interface Work {
  step: Step;
  spec: Omit<PieceSpec, "name" | "sign" | "made">;
  flaw: number; // what was rushed or overdone, the kiln's odds of a crack
}

const WORK = "roji:work";
export function fresh(): Work {
  return {
    step: "wheel",
    spec: {
      v: 1,
      prof: [],
      H: 40,
      handle: false,
      clay: 0,
      glaze: null,
      fire: 0,
      kin: null,
      paint: [],
    },
    flaw: 0,
  };
}
export function load(): Work {
  try {
    const saved = JSON.parse(localStorage.getItem(WORK) || "null");
    if (saved && saved.step && saved.spec) return saved;
  } catch {
    // a spoilt draft starts again
  }
  return fresh();
}
export const save = (work: Work) => localStorage.setItem(WORK, JSON.stringify(work));
export const clear = () => localStorage.removeItem(WORK);

// a group the drawing code can draw into
export type InkGroup = ReturnType<typeof import("../../utils/tea/ink.js").newGroup>;
export const markup = (groups: InkGroup[]) => groups.map((group) => groupSvg(group)).join("");

export interface Stage {
  root: HTMLElement;
  svg: SVGSVGElement;
  live: SVGGElement;
  draw(groups: InkGroup[]): void;
  at(event: { clientX: number; clientY: number }): Point;
  say(html: string): void;
  button(label: string, onClick: () => void, cls?: string): HTMLButtonElement;
  over(
    label: string,
    x: number,
    y: number,
    width: number,
    height: number,
    onClick: () => void,
  ): HTMLButtonElement;
  clearUi(): void;
}

export function stage(
  host: HTMLElement,
  viewWidth: number,
  viewHeight: number,
  title: [string, string],
  still: InkGroup[],
  defs = "",
): Stage {
  host.innerHTML = "";
  const root = document.createElement("div");
  root.className = "kobo-stage";
  root.innerHTML =
    `<p class="kobo-title"><span class="kobo-kan" lang="ja">${title[0]}</span> <span class="hand">${title[1]}</span></p>` +
    `<div class="kobo-art"><svg viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="${title[1]}">` +
    `<defs>${FILTERS}${defs}</defs>${markup(still)}<g class="kobo-live"></g></svg></div>` +
    `<p class="kobo-say hand" aria-live="polite"></p><p class="kobo-do"></p>`;
  host.append(root);
  const art = root.querySelector<HTMLElement>(".kobo-art")!;
  const svg = root.querySelector("svg")!;
  const live = svg.querySelector<SVGGElement>(".kobo-live")!;
  const sayEl = root.querySelector<HTMLElement>(".kobo-say")!;
  const doEl = root.querySelector<HTMLElement>(".kobo-do")!;
  return {
    root,
    svg,
    live,
    draw: (groups) => (live.innerHTML = markup(groups)),
    at(event) {
      const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(
        svg.getScreenCTM()!.inverse(),
      );
      return [point.x, point.y];
    },
    say: (html) => (sayEl.innerHTML = html),
    button(label, onClick, cls = "") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `kobo-btn hand ${cls}`;
      button.textContent = label;
      button.addEventListener("click", onClick);
      doEl.append(button);
      return button;
    },

    // invisible button over part of the drawing,
    // centred on (x, y) in drawing units
    over(label, x, y, width, height, onClick) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kobo-over";
      button.setAttribute("aria-label", label);
      button.style.cssText = `left:${(x / viewWidth) * 100}%;top:${(y / viewHeight) * 100}%;width:${(width / viewWidth) * 100}%;height:${(height / viewHeight) * 100}%`;
      button.addEventListener("click", onClick);
      art.append(button);
      return button;
    },
    clearUi() {
      doEl.innerHTML = "";
      art.querySelectorAll(".kobo-over").forEach((overlay) => overlay.remove());
    },
  };
}

// a drag on the drawing
export function drag(
  view: Stage,
  handlers: {
    down?: (point: Point, event: PointerEvent) => boolean | void;
    move?: (point: Point, event: PointerEvent) => void;
    up?: (point: Point) => void;
  },
) {
  let held = false;
  const surface = view.svg;
  surface.addEventListener("pointerdown", (event) => {
    if (handlers.down && handlers.down(view.at(event), event) === false) return;
    held = true;
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      /* a synthetic pointer */
    }
    event.preventDefault();
  });
  surface.addEventListener(
    "pointermove",
    (event) => held && handlers.move?.(view.at(event), event),
  );
  const release = (event: PointerEvent) => {
    if (!held) return;
    held = false;
    handlers.up?.(view.at(event));
  };
  surface.addEventListener("pointerup", release);
  surface.addEventListener("pointercancel", release);
}

// redraw at most once a frame
export function frame(render: () => void) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      render();
    });
  };
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
export const wait = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, still() ? 0 : delay));
export { toSvg };

// the piece as the drawing code wants it, turned to face you
export function look(spec: Work["spec"], turn = 0, sealed = false) {
  return { ...turned({ ...spec, name: "", sign: [], made: "" }, turn), seal: sealed };
}

// a scale that fits the piece in a box of w x h drawing units
export function fit(spec: Work["spec"], width: number, height: number, maxScale = 3) {
  const widest = Math.max(...spec.prof.map(([radius]) => radius)) * (spec.handle ? 1.35 : 1);
  return Math.min(maxScale, width / (widest * 2), height / (spec.H + widest * 0.6));
}
