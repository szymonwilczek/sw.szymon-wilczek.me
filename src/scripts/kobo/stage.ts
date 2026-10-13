import { groupSvg, toSvg, toneVars, FILTERS } from "../../utils/tea/ink.js";
import { turned, type PieceSpec } from "../../utils/tea/pottery";

export type P = [number, number];
export const K = toneVars();
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
    const w = JSON.parse(localStorage.getItem(WORK) || "null");
    if (w && w.step && w.spec) return w;
  } catch {
    // a spoilt draft starts again
  }
  return fresh();
}
export const save = (w: Work) => localStorage.setItem(WORK, JSON.stringify(w));
export const clear = () => localStorage.removeItem(WORK);

// a group the drawing code can draw into
export type Grp = ReturnType<typeof import("../../utils/tea/ink.js").newGroup>;
export const markup = (groups: Grp[]) => groups.map((g) => groupSvg(g)).join("");

export interface Stage {
  root: HTMLElement;
  svg: SVGSVGElement;
  live: SVGGElement;
  draw(groups: Grp[]): void;
  at(e: { clientX: number; clientY: number }): P;
  say(html: string): void;
  button(label: string, onClick: () => void, cls?: string): HTMLButtonElement;
  over(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: () => void,
  ): HTMLButtonElement;
  clearUi(): void;
}

export function stage(
  host: HTMLElement,
  W: number,
  H: number,
  title: [string, string],
  still: Grp[],
  defs = "",
): Stage {
  host.innerHTML = "";
  const root = document.createElement("div");
  root.className = "kobo-stage";
  root.innerHTML =
    `<p class="kobo-title"><span class="kobo-kan" lang="ja">${title[0]}</span> <span class="hand">${title[1]}</span></p>` +
    `<div class="kobo-art"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title[1]}">` +
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
    at(e) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());
      return [p.x, p.y];
    },
    say: (html) => (sayEl.innerHTML = html),
    button(label, onClick, cls = "") {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `kobo-btn hand ${cls}`;
      b.textContent = label;
      b.addEventListener("click", onClick);
      doEl.append(b);
      return b;
    },

    // invisible button over part of the drawing,
    // centred on (x, y) in drawing units
    over(label, x, y, w, h, onClick) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "kobo-over";
      b.setAttribute("aria-label", label);
      b.style.cssText = `left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%`;
      b.addEventListener("click", onClick);
      art.append(b);
      return b;
    },
    clearUi() {
      doEl.innerHTML = "";
      art.querySelectorAll(".kobo-over").forEach((b) => b.remove());
    },
  };
}

// a drag on the drawing
export function drag(
  s: Stage,
  on: {
    down?: (p: P, e: PointerEvent) => boolean | void;
    move?: (p: P, e: PointerEvent) => void;
    up?: (p: P) => void;
  },
) {
  let held = false;
  const el = s.svg;
  el.addEventListener("pointerdown", (e) => {
    if (on.down && on.down(s.at(e), e) === false) return;
    held = true;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* a synthetic pointer */
    }
    e.preventDefault();
  });
  el.addEventListener("pointermove", (e) => held && on.move?.(s.at(e), e));
  const end = (e: PointerEvent) => {
    if (!held) return;
    held = false;
    on.up?.(s.at(e));
  };
  el.addEventListener("pointerup", end);
  el.addEventListener("pointercancel", end);
}

// redraw at most once a frame
export function frame(f: () => void) {
  let queued = false;
  return () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      f();
    });
  };
}

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
export const wait = (ms: number) => new Promise((r) => setTimeout(r, still() ? 0 : ms));
export { toSvg };

// the piece as the drawing code wants it, turned to face you
export function look(spec: Work["spec"], turn = 0, sealed = false) {
  return { ...turned({ ...spec, name: "", sign: [], made: "" }, turn), seal: sealed };
}

// a scale that fits the piece in a box of w x h drawing units
export function fit(spec: Work["spec"], w: number, h: number, most = 3) {
  const rw = Math.max(...spec.prof.map(([r]) => r)) * (spec.handle ? 1.35 : 1);
  return Math.min(most, w / (rw * 2), h / (spec.H + rw * 0.6));
}
