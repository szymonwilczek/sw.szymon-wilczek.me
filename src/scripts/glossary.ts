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
  秋: ["aki", "autumn", 9],
  北: ["kita", "north", 5],
  夜: ["yoru", "night", 8],
  冬: ["fuyu", "winter", 5],
  春: ["haru", "spring", 9],
  夏: ["natsu", "summer", 10],
  文: ["fumi", "a letter", 4],
  違: ["chigau", "to differ, to be wrong", 13],
  波: ["nami", "a wave", 8],
  寂: ["sabi", "quiet, the beauty of age", 11],
  雀: ["suzume", "sparrow", 11],
  修: ["shū", "to mend, to put right", 10],
  陶: ["tō", "pottery", 11],
  茶: ["cha", "tea", 9],
  年: ["toshi", "a year", 6],
  縁: ["en", "a tie, the red thread of fate", 15],
  庭: ["niwa", "garden", 10],
};

let slip: HTMLElement | null = null;
let owner: Element | null = null;

/** A seal-sized drawing holding exactly one kanji from the glossary */
function sealOf(element: Element): string | null {
  const texts = element.querySelectorAll("text");
  const box = element.getBoundingClientRect();
  if (texts.length !== 1 || box.width > 120 || box.height > 120) return null;
  const glyph = texts[0].textContent?.trim() ?? "";
  return GLOSSARY[glyph] ? glyph : null;
}

/** The element that carries a kanji: a seal's <svg>, or a lone glyph in text */
function kanjiOf(element: Element | null): [Element, string] | null {
  if (!element || element.closest(".kanji-slip, .minibuffer")) return null;
  const svg = element.closest("svg");
  if (svg) {
    const glyph = sealOf(svg);
    if (glyph) return [svg, glyph];
    const group = element.closest("g");
    const inner = group && svg.contains(group) ? sealOf(group) : null;
    return inner ? [group!, inner] : null;
  }
  const character = element.textContent?.trim() ?? "";
  if (element.children.length === 0 && GLOSSARY[character]) return [element, character];
  return null;
}

function show(element: Element, glyph: string) {
  const [reading, meaning, strokes, note] = GLOSSARY[glyph];
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

  const box = element.getBoundingClientRect();
  const width = slip.offsetWidth;
  const left = Math.min(Math.max(8, box.left + box.width / 2 - width / 2), innerWidth - width - 8);
  const below = box.bottom + 10 + slip.offsetHeight < innerHeight;
  slip.style.left = `${left}px`;
  slip.style.top = `${below ? box.bottom + 10 : box.top - slip.offsetHeight - 10}px`;
  slip.classList.add("is-shown");
  owner = element;
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
