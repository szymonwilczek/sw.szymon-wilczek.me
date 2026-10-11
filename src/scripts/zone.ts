// M-x zone

import { onIdle } from "../utils/idle";

const WAIT = 120_000;
const ROUND = 4000;
const BLOCKS = "main :is(p, li, h1, h2, h3, h4, blockquote, figcaption, dt, dd, td)";
const SKIP = "pre, code, kbd, svg, button, input, textarea, select, .zw";

const still = matchMedia("(prefers-reduced-motion: reduce)");
let words: HTMLElement[] = [];
let round = 0;
let timer = 0;
let echoTimer = 0;
let zoning = false;

function echo(text: string) {
  let line = document.querySelector<HTMLElement>(".echo");
  if (!line) {
    line = document.createElement("div");
    line.className = "echo";
    line.setAttribute("aria-hidden", "true");
    document.body.append(line);
  }
  line.textContent = text;
  line.classList.add("is-on");
  clearTimeout(echoTimer);
  echoTimer = window.setTimeout(() => line.classList.remove("is-on"), 1800);
}

// only the words in view come loose, each in its own box
function loosen() {
  const seen = new Set<Text>();
  for (const block of document.querySelectorAll<HTMLElement>(BLOCKS)) {
    const r = block.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || block.closest(SKIP)) continue;
    const walk = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      const text = walk.currentNode as Text;
      if (text.data.trim() && !text.parentElement?.closest(SKIP)) seen.add(text);
    }
  }
  for (const text of seen) {
    const bits = document.createDocumentFragment();
    for (const bit of text.data.split(/(\s+)/)) {
      if (!bit) continue;
      if (/^\s+$/.test(bit)) {
        bits.append(bit);
        continue;
      }
      const word = document.createElement("span");
      word.className = "zw";
      word.textContent = bit;
      bits.append(word);
      words.push(word);
    }
    text.replaceWith(bits);
  }
}

function wander() {
  round++;
  const reach = Math.min(2 + round * 2.5, 16);
  for (const word of words) {
    if (Math.random() < 0.35) continue;
    const drip = Math.random() < 0.05 ? reach * 3 : 0;
    const x = (Math.random() - 0.5) * reach;
    const y = (Math.random() - 0.5) * reach * 0.6 + drip;
    const turn = (Math.random() - 0.5) * reach;
    word.style.transitionDelay = `${Math.random() * 1.5}s`;
    word.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${turn.toFixed(1)}deg)`;
    word.style.opacity = drip ? "0.5" : "";
  }
  timer = window.setTimeout(wander, ROUND);
}

function zone() {
  if (zoning || document.querySelector("dialog[open]")) return;
  if (still.matches) {
    echo("zone: the words keep still");
    return;
  }
  zoning = true;
  round = 0;
  loosen();
  wander();
}

function quit() {
  if (!zoning) return;
  zoning = false;
  clearTimeout(timer);
  const loose = words;
  words = [];
  document.documentElement.classList.add("zone-off");
  for (const word of loose) {
    word.style.transform = "";
    word.style.opacity = "";
  }
  echo("zone: quit");
  window.setTimeout(() => {
    const parents = new Set<Node>();
    for (const word of loose) {
      if (word.parentNode) parents.add(word.parentNode);
      word.replaceWith(word.textContent ?? "");
    }
    for (const parent of parents) parent.normalize();
    document.documentElement.classList.remove("zone-off");
  }, 550);
}

onIdle(WAIT, zone, quit);

addEventListener("zone", () => window.setTimeout(zone, 400));
