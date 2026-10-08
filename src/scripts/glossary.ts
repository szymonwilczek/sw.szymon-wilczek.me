// Every kanji on the site gets a slip with its reading and meaning,
// on hover with a mouse or on a long press with a finger.

const GLOSSARY: Record<string, [string, string, number, string?]> = {
  狼: ["ōkami", "wolf", 10, "my surname"],
  終: ["owari", "the end", 11],
  封: ["fū", "a seal, to close up", 9],
  鍵: ["kagi", "key", 17],
  迷: ["mayou", "to lose the way", 9],
  書: ["kaku", "to write", 10],
  写: ["utsusu", "to copy, to photograph", 5],
  合: ["au", "to match, to fit", 6],
  秋: ["aki", "autumn", 9],
  北: ["kita", "north", 5],
  夜: ["yoru", "night", 8],
  冬: ["fuyu", "winter", 5],
  春: ["haru", "spring", 9],
  夏: ["natsu", "summer", 10],
  文: ["fumi", "a letter", 4],
  石: ["ishi", "stone", 5],
  違: ["chigau", "to differ, to be wrong", 13],
  波: ["nami", "a wave", 8],
  兎: ["usagi", "hare, rabbit", 7],
  寂: ["sabi", "quiet, the beauty of age", 11],
};

let slip: HTMLElement | null = null;
let owner: Element | null = null;

/** A seal-sized drawing holding exactly one kanji from the glossary */
function sealOf(el: Element): string | null {
  const texts = el.querySelectorAll("text");
  const r = el.getBoundingClientRect();
  if (texts.length !== 1 || r.width > 120 || r.height > 120) return null;
  const ch = texts[0].textContent?.trim() ?? "";
  return GLOSSARY[ch] ? ch : null;
}

/** The element that carries a kanji: a seal's <svg>, or a lone glyph in text */
function kanjiOf(el: Element | null): [Element, string] | null {
  if (!el || el.closest(".kanji-slip, .minibuffer")) return null;
  const svg = el.closest("svg");
  if (svg) {
    const ch = sealOf(svg);
    if (ch) return [svg, ch];
    const group = el.closest("g");
    const inner = group && svg.contains(group) ? sealOf(group) : null;
    return inner ? [group!, inner] : null;
  }
  const ch = el.textContent?.trim() ?? "";
  if (el.children.length === 0 && GLOSSARY[ch]) return [el, ch];
  return null;
}

function show(el: Element, ch: string) {
  const [reading, meaning, strokes, note] = GLOSSARY[ch];
  if (!slip) {
    slip = document.createElement("div");
    slip.className = "kanji-slip paper";
    slip.setAttribute("role", "tooltip");
    document.body.append(slip);
  }
  slip.innerHTML = "";
  const head = document.createElement("span");
  head.className = "kanji-slip-head";
  head.textContent = `${reading} — ${meaning}`;
  const foot = document.createElement("span");
  foot.className = "kanji-slip-foot";
  foot.textContent = [`${strokes} strokes`, note].filter(Boolean).join(" · ");
  slip.append(head, foot);

  const r = el.getBoundingClientRect();
  const w = slip.offsetWidth;
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const below = r.bottom + 10 + slip.offsetHeight < innerHeight;
  slip.style.left = `${left}px`;
  slip.style.top = `${below ? r.bottom + 10 : r.top - slip.offsetHeight - 10}px`;
  slip.classList.add("is-shown");
  owner = el;
}

function hide() {
  slip?.classList.remove("is-shown");
  owner = null;
}

document.addEventListener("pointerover", (event) => {
  if (event.pointerType !== "mouse") return;
  const found = kanjiOf(event.target as Element);
  if (found && found[0] !== owner) show(...found);
  else if (!found && owner) hide();
});

// long press on touch: the slip shows and the press doesnt follow the link
let timer = 0;
let pressed = false;

document.addEventListener(
  "touchstart",
  (event) => {
    const found = kanjiOf(event.target as Element);
    hide();
    pressed = false;
    if (!found) return;
    timer = window.setTimeout(() => {
      pressed = true;
      show(...found);
    }, 450);
  },
  { passive: true },
);

for (const type of ["touchend", "touchmove", "touchcancel"]) {
  document.addEventListener(type, () => clearTimeout(timer), { passive: true });
}

document.addEventListener(
  "click",
  (event) => {
    if (!pressed) return;
    pressed = false;
    event.preventDefault();
    event.stopPropagation();
  },
  true,
);

document.addEventListener("contextmenu", (event) => {
  if (owner && kanjiOf(event.target as Element)) event.preventDefault();
});

window.addEventListener("scroll", hide, { passive: true });
