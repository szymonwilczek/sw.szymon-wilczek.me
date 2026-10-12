import { SEASONS, seasonOf } from "../../utils/engawa/sky";
import type { View } from "./scene";

// enso's centre
const CX = 1050,
  CY = 98;

export function dialOf(fig: HTMLElement, scene: { view: View; draw: () => void }) {
  const dial = fig.querySelector<HTMLButtonElement>(".dial")!;
  const season = fig.querySelector<HTMLButtonElement>(".season")!;
  const svg = fig.querySelector("svg")!;
  const { view } = scene;

  let queued = false;
  const redraw = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scene.draw();
    });
  };

  // pointer's angle round the centre, as an hour
  function hourAt(e: PointerEvent): number {
    const box = svg.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * 1100 - CX;
    const y = ((e.clientY - box.top) / box.height) * 640 - CY;
    const a = Math.atan2(x, -y);
    return ((((a / (Math.PI * 2)) * 24) % 24) + 24) % 24;
  }

  let dragging = false,
    moved = false;
  dial.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = false;
    dial.setPointerCapture(e.pointerId);
  });
  dial.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    moved = true;
    view.hourSet = hourAt(e);
    redraw();
  });
  dial.addEventListener("pointerup", () => {
    dragging = false;
  });
  dial.addEventListener("click", () => {
    if (moved) return;
    view.hourSet = null;
    redraw();
  });
  dial.addEventListener("keydown", (e) => {
    const step = (<Record<string, number>>{
      ArrowRight: 0.25,
      ArrowUp: 0.25,
      ArrowLeft: -0.25,
      ArrowDown: -0.25,
    })[e.key];
    if (step === undefined) return;
    e.preventDefault();
    view.hourSet = ((((view.hourSet ?? view.hour) + step) % 24) + 24) % 24;
    redraw();
  });

  season.addEventListener("click", () => {
    const real = seasonOf(new Date());
    const next = SEASONS[(SEASONS.indexOf(view.season) + 1) % 4];
    view.seasonSet = next === real ? null : next;
    redraw();
  });
}
