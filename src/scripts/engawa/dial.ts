import { SEASONS, seasonOf } from "../../utils/engawa/sky";
import type { View } from "./scene";

// enso's centre
const CENTER_X = 1050,
  CENTER_Y = 98;

export function dialOf(figure: HTMLElement, scene: { view: View; draw: () => void }) {
  const dial = figure.querySelector<HTMLButtonElement>(".dial")!;
  const season = figure.querySelector<HTMLButtonElement>(".season")!;
  const svg = figure.querySelector("svg")!;
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
  function hourAt(event: PointerEvent): number {
    const bounds = svg.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 1100 - CENTER_X;
    const y = ((event.clientY - bounds.top) / bounds.height) * 640 - CENTER_Y;
    const angle = Math.atan2(x, -y);
    return ((((angle / (Math.PI * 2)) * 24) % 24) + 24) % 24;
  }

  let dragging = false,
    moved = false;
  dial.addEventListener("pointerdown", (event) => {
    dragging = true;
    moved = false;
    dial.setPointerCapture(event.pointerId);
  });
  dial.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    moved = true;
    view.hourSet = hourAt(event);
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
  dial.addEventListener("keydown", (event) => {
    const step = (<Record<string, number>>{
      ArrowRight: 0.25,
      ArrowUp: 0.25,
      ArrowLeft: -0.25,
      ArrowDown: -0.25,
    })[event.key];
    if (step === undefined) return;
    event.preventDefault();
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
