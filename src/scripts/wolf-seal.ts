// Riddle door: the wolf has ten strokes.

import { findDoor } from "../utils/garden";

const KEY = "wolf-strokes";
const STROKES = 10;

function strokes(): number {
  try {
    return Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

function ink(n: number) {
  document.querySelectorAll<SVGSVGElement>(".site-brand .seal").forEach((seal) => {
    seal.style.setProperty("--strokes", String(Math.min(n, STROKES)));
    seal.classList.toggle("is-inked", n > 0);
    const brand = seal.closest<HTMLAnchorElement>(".site-brand")!;
    if (n < STROKES) return;
    seal.querySelector(".seal-glyph")!.textContent = "北";
    brand.href = "/map/";
    brand.setAttribute("aria-label", "the map");
  });
}

ink(strokes());

document.querySelectorAll<SVGSVGElement>(".site-brand .seal").forEach((seal) =>
  seal.addEventListener("click", (event) => {
    const n = strokes();
    if (n >= STROKES) {
      // the link take the reader to the map, and wash the seal
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        // it stays for this visit
      }
      return;
    }
    try {
      sessionStorage.setItem(KEY, String(n + 1));
    } catch {
      return;
    }
    if (location.pathname === "/") event.preventDefault();
    ink(n + 1);
    if (n + 1 === STROKES) {
      event.preventDefault();
      findDoor("seal");
    }
  }),
);
