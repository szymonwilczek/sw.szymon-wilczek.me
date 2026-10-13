import { cardShell, toSvg, toneVars } from "../../utils/tea/ink.js";
import type { View } from "./scene";

const WIDTH = 540,
  HEIGHT = 762;

// make writes the card's words once it opens;
// update, if given, follows the scene
export interface Fill {
  make: (body: HTMLElement, view: View) => void;
  update?: (view: View) => void;
  leave?: () => void;
}

export function cardsOf(
  figure: HTMLElement,
  scene: { view: View; on: (listener: (view: View) => void) => void },
) {
  const fills = new Map<string, Fill>();
  const layer = document.createElement("div");
  layer.className = "cards";
  layer.innerHTML = `<article class="card" role="dialog" aria-modal="false" tabindex="-1">
    <svg viewBox="0 0 ${WIDTH} ${HEIGHT}" aria-hidden="true"></svg>
    <button type="button" class="card-close" aria-label="Put the card away"></button>
    <div class="card-body"></div>
  </article>`;
  layer.hidden = true;
  figure.append(layer);
  const card = layer.querySelector<HTMLElement>(".card")!;
  const svg = card.querySelector("svg")!;
  const body = card.querySelector<HTMLElement>(".card-body")!;
  let open: string | null = null;
  let from: HTMLElement | null = null;

  function paint(key: string) {
    const view = scene.view;
    const shell = cardShell(toneVars(), key, HEIGHT - 22, {
      season: view.season,
      burnt: view.incense?.burnt ?? 0,
      lit: view.incense?.lit ?? false,
      disc: view.disc,
    });
    svg.innerHTML = toSvg(shell, true);
  }

  function show(key: string, button: HTMLElement) {
    if (open === key) return hide();
    if (open !== null) fills.get(open)?.leave?.();
    open = key;
    from = button;
    card.dataset.key = key;
    card.setAttribute("aria-label", button.getAttribute("aria-label") || key);
    paint(key);
    body.replaceChildren();
    fills.get(key)?.make(body, scene.view);
    layer.hidden = false;
    card.classList.remove("in");
    void card.offsetWidth;
    card.classList.add("in");
    card.focus({ preventScroll: true });
  }

  function hide() {
    if (open === null) return;
    fills.get(open)?.leave?.();
    open = null;
    layer.hidden = true;
    from?.focus({ preventScroll: true });
  }

  card.querySelector(".card-close")!.addEventListener("click", hide);
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open !== null) hide();
  });
  // drawing follows the hour, the season and the incense
  scene.on((view) => {
    if (open === null) return;
    paint(open);
    fills.get(open)?.update?.(view);
  });

  return {
    show,
    hide,
    get open() {
      return open;
    },
    fill: (key: string, filler: Fill) => fills.set(key, filler),
  };
}
