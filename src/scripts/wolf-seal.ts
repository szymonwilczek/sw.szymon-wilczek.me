// Riddle door: the wolf has ten strokes.

import { findDoor } from "../utils/garden";

const STORAGE_KEY = "wolf-strokes";
const STROKES = 10;

function strokes(): number {
  try {
    return Number(sessionStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function inkSeal(count: number) {
  document.querySelectorAll<SVGSVGElement>(".site-brand .seal").forEach((seal) => {
    seal.style.setProperty("--strokes", String(Math.min(count, STROKES)));
    seal.classList.toggle("is-inked", count > 0);
    const brand = seal.closest<HTMLAnchorElement>(".site-brand")!;
    if (count < STROKES) return;
    seal.querySelector(".seal-glyph")!.textContent = "北";
    brand.href = "/map/?found";
    brand.setAttribute("aria-label", "the map");
  });
}

inkSeal(strokes());

document.querySelectorAll<SVGSVGElement>(".site-brand .seal").forEach((seal) =>
  seal.addEventListener("click", (event) => {
    const count = strokes();
    if (count >= STROKES) {
      // the link take the reader to the map, and wash the seal
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // it stays for this visit
      }
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, String(count + 1));
    } catch {
      return;
    }
    if (location.pathname === "/") event.preventDefault();
    inkSeal(count + 1);
    if (count + 1 === STROKES) {
      event.preventDefault();
      findDoor("seal");
    }
  }),
);
