// Where you stopped: a long essay remembers the paragraph you left it at.
// Coming back later, a pressed leaf marks that paragraph with a pencil note,
// one click takes you there, and the leaf blows away once you pass it.

import { load, update } from "../utils/garden";
import { MOMIJI, MOMIJI_VIEWBOX } from "../utils/momiji";

const LEAF =
  `<svg viewBox="${MOMIJI_VIEWBOX}" width="30" height="30" aria-hidden="true">` +
  `<g transform="rotate(-24)">` +
  `<path class="stop-leaf-stem" d="${MOMIJI.stem}"/>` +
  `<path class="stop-leaf-blade" d="${MOMIJI.outline}"/>` +
  `<path class="stop-leaf-vein" d="${MOMIJI.veins}"/>` +
  `<path class="stop-leaf-ink" d="${MOMIJI.outline}" transform="translate(5 -4)"/>` +
  `</g></svg>`;

const slug = location.pathname.replace(/^\/writings\/|\/$/g, "");
const paragraphs = Array.from(
  document.querySelectorAll<HTMLElement>(".prose p:not(.footnotes-section p)"),
);
const body = document.querySelector<HTMLElement>(".article-body");

function ago(when: number): string {
  const days = Math.floor((Date.now() - when) / 86400000);
  if (days < 1) return "earlier today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** The paragraph the reader is on: the last one whose top passed 40% of the screen */
function current(): number {
  let at = -1;
  for (let i = 0; i < paragraphs.length; i++) {
    if (paragraphs[i].getBoundingClientRect().top < innerHeight * 0.4) at = i;
    else break;
  }
  return at;
}

function remember() {
  const at = current();
  if (at < 3) return;

  // near the end there is nothing left to come back to
  const done = at >= paragraphs.length - 3;
  update((state) => {
    if (done) delete state.stops[slug];
    else state.stops[slug] = { at, when: Date.now() };
  });
}

function mark(at: number, when: number) {
  const target = paragraphs[at];
  if (!target || !body) return;
  const text = `you were here, ${ago(when)}`;

  const leaf = document.createElement("div");
  leaf.className = "stop-leaf";
  leaf.innerHTML = LEAF;
  const note = document.createElement("span");
  note.className = "stop-note hand";
  note.textContent = text;
  leaf.append(note);
  leaf.style.top = `${target.offsetTop}px`;
  body.append(leaf);

  const go = document.createElement("button");
  go.type = "button";
  go.className = "stop-go hand";
  go.innerHTML = `${LEAF}<span>${text} — continue ↓</span>`;
  go.addEventListener("click", () => {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    go.remove();
  });
  document.querySelector(".article-meta")?.after(go);

  // once the reader is past the paragraph, the leaf blows away
  const passed = new IntersectionObserver((entries) => {
    const entry = entries[0];
    if (entry.isIntersecting || entry.boundingClientRect.top > 0) return;
    passed.disconnect();
    leaf.classList.add("is-gone");
    go.remove();
    leaf.addEventListener("animationend", () => leaf.remove());
  });
  passed.observe(target);
}

const stop = load().stops[slug];
if (stop && Date.now() - stop.when > 30 * 60 * 1000 && scrollY < innerHeight) {
  document.fonts.ready.then(() => mark(stop.at, stop.when));
}

let timer = 0;
window.addEventListener(
  "scroll",
  () => {
    clearTimeout(timer);
    timer = window.setTimeout(remember, 400);
  },
  { passive: true },
);
