// Keyboard focus is circled in pencil: a loop that never quite closes,
// drawn only for :focus-visible, so mouse users never see it.

const SKIP = "input, textarea, select, .ink-button, .nav-link, .picker-row, .minibuffer *";
const NS = "http://www.w3.org/2000/svg";

let loop: SVGSVGElement | null = null;
let target: HTMLElement | null = null;

function draw(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const pad = 6;
  const w = r.width + pad * 2;
  const h = r.height + pad * 2;
  const jitter = () => (Math.random() - 0.5) * 3;

  if (!loop) {
    loop = document.createElementNS(NS, "svg");
    loop.classList.add("focus-loop");
    loop.setAttribute("aria-hidden", "true");
    const path = document.createElementNS(NS, "path");
    path.setAttribute("pathLength", "1");
    loop.append(path);
    document.body.append(loop);
  }

  loop.setAttribute("width", String(w + 8));
  loop.setAttribute("height", String(h + 8));
  place(el);

  // start just past the top left, go round once, overshoot the start a little
  const x0 = 4;
  const y0 = 4;
  const d = [
    `M${x0 + w * 0.18} ${y0 + 1 + jitter()}`,
    `C ${x0 + w * 0.5} ${y0 - 2 + jitter()}, ${x0 + w + 1} ${y0 + jitter()}, ${x0 + w} ${y0 + h * 0.5}`,
    `C ${x0 + w - 1} ${y0 + h + 1 + jitter()}, ${x0 + w * 0.4} ${y0 + h + jitter()}, ${x0 + 2} ${y0 + h * 0.62}`,
    `C ${x0 - 2} ${y0 + h * 0.2 + jitter()}, ${x0 + w * 0.1} ${y0 + 2}, ${x0 + w * 0.3} ${y0 + 3 + jitter()}`,
  ].join(" ");
  loop.firstElementChild!.setAttribute("d", d);
}

function place(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  loop!.style.left = `${r.left - 10}px`;
  loop!.style.top = `${r.top - 10}px`;
}

function clear() {
  loop?.remove();
  loop = null;
  target = null;
}

document.addEventListener("focusin", (event) => {
  const el = event.target as HTMLElement;
  if (!(el instanceof HTMLElement) || el.matches(SKIP) || !el.matches(":focus-visible")) {
    clear();
    return;
  }
  target = el;
  draw(el);
});

document.addEventListener("focusout", clear);

function follow() {
  if (target && loop) place(target);
}

window.addEventListener("scroll", follow, { passive: true });
window.addEventListener("resize", follow);
document.documentElement.classList.add("has-focus-loop");
