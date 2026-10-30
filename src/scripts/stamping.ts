// Fresh seal is stamped where it was earned

import { earnedCount, load, SEALS } from "../utils/garden";
import { hankoSvg } from "../utils/hanko";

const still = matchMedia("(prefers-reduced-motion: reduce)");
const queue: string[] = [];
let busy = false;

function count() {
  const counter = document.querySelector<HTMLElement>(".seal-count");
  if (!counter) return;
  const earned = earnedCount(load());
  counter.querySelector(".seal-count-n")!.textContent = `${earned}/${SEALS.length}`;
  counter.hidden = earned === 0;
}

async function stamp(glyph: string) {
  const page = SEALS.find((seal) => seal.glyph === glyph);
  const press = document.createElement("div");
  press.className = "stamp-press";
  press.setAttribute("role", "status");
  press.innerHTML = hankoSvg(glyph, 64);
  const note = document.createElement("span");
  note.className = "stamp-press-note";
  note.textContent = page?.note ?? "";
  press.append(note);
  press.querySelector("svg")!.setAttribute("aria-label", `seal ${glyph}: ${note.textContent}`);
  document.body.append(press);

  const counter = document.querySelector<HTMLElement>(".seal-count");
  if (still.matches) {
    await press.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: "both" }).finished;
    await new Promise((resolve) => setTimeout(resolve, 1600));
    await press.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "both" }).finished;
  } else {
    const seal = press.querySelector("svg")!;
    await seal.animate(
      [
        { transform: "scale(1.6)", opacity: 0 },
        { transform: "scale(0.93)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(.3,.7,.4,1)", fill: "both" },
    ).finished;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    note.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: "both" });

    // toward the counter, or the bottom corner when the footer is out of view
    const from = seal.getBoundingClientRect();
    const landing = counter && !counter.hidden ? counter.getBoundingClientRect() : null;
    const shiftX = (landing ? landing.left + 6 : innerWidth - 40) - (from.left + from.width / 2);
    const shiftY =
      Math.min(landing ? landing.top + 6 : innerHeight, innerHeight - 20) -
      (from.top + from.height / 2);
    await seal.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${shiftX}px, ${shiftY}px) scale(0.22)`, opacity: 0.6 },
      ],
      { duration: 700, easing: "cubic-bezier(.5,0,.7,.4)", fill: "both" },
    ).finished;
  }
  press.remove();
  count();
  counter?.animate([{ scale: 1.35 }, { scale: 1 }], { duration: 300, easing: "ease-out" });
}

async function next() {
  if (busy) return;
  busy = true;
  while (queue.length) await stamp(queue.shift()!);
  busy = false;
}

window.addEventListener("garden-seal", (event) => {
  queue.push((event as CustomEvent<{ glyph: string }>).detail.glyph);
  // let the page settle before the first press
  setTimeout(next, 400);
});

count();
