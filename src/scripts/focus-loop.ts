// Keyboard focus is circled in pencil: a loop that never quite closes,
// drawn only for :focus-visible, so mouse users never see it.

const SKIP =
  "input, textarea, select, .ink-button, .nav-link, .picker-row, .minibuffer *, .own-focus, [tabindex='-1']";
const SVG_NS = "http://www.w3.org/2000/svg";

let loop: SVGSVGElement | null = null;
let target: HTMLElement | null = null;

function draw(focused: HTMLElement) {
  const box = focused.getBoundingClientRect();
  const pad = 6;
  const width = box.width + pad * 2;
  const height = box.height + pad * 2;
  const jitter = () => (Math.random() - 0.5) * 3;

  if (!loop) {
    loop = document.createElementNS(SVG_NS, "svg");
    loop.classList.add("focus-loop");
    loop.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("pathLength", "1");
    loop.append(path);
    document.body.append(loop);
  }

  loop.setAttribute("width", String(width + 8));
  loop.setAttribute("height", String(height + 8));
  place(focused);

  // start just past the top left, go round once, overshoot the start a little
  const startX = 4;
  const startY = 4;
  const loopPath = [
    `M${startX + width * 0.18} ${startY + 1 + jitter()}`,
    `C ${startX + width * 0.5} ${startY - 2 + jitter()}, ${startX + width + 1} ${startY + jitter()}, ${startX + width} ${startY + height * 0.5}`,
    `C ${startX + width - 1} ${startY + height + 1 + jitter()}, ${startX + width * 0.4} ${startY + height + jitter()}, ${startX + 2} ${startY + height * 0.62}`,
    `C ${startX - 2} ${startY + height * 0.2 + jitter()}, ${startX + width * 0.1} ${startY + 2}, ${startX + width * 0.3} ${startY + 3 + jitter()}`,
  ].join(" ");
  loop.firstElementChild!.setAttribute("d", loopPath);
}

function place(focused: HTMLElement) {
  const box = focused.getBoundingClientRect();
  loop!.style.left = `${box.left - 10}px`;
  loop!.style.top = `${box.top - 10}px`;
}

function clear() {
  loop?.remove();
  loop = null;
  target = null;
}

document.addEventListener("focusin", (event) => {
  const focused = event.target as HTMLElement;
  if (
    !(focused instanceof HTMLElement) ||
    focused.matches(SKIP) ||
    !focused.matches(":focus-visible")
  ) {
    clear();
    return;
  }
  target = focused;
  draw(focused);
});

document.addEventListener("focusout", clear);

function follow() {
  if (target && loop) place(target);
}

window.addEventListener("scroll", follow, { passive: true });
window.addEventListener("resize", follow);
document.documentElement.classList.add("has-focus-loop");
