import { crateSleeve, toSvg, toneVars } from "../../utils/tea/ink.js";
import { DISCS } from "./discs";
import type { Fill } from "./cards";
import type { Radio } from "./radio";
import type { View } from "./scene";

const NUMERALS = ["一", "二", "三", "四", "五"];
const FLOOR = [435, 615];

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function crateOf(
  figure: HTMLElement,
  scene: { view: View; draw: () => void },
  radio: Radio,
  hide: () => void,
) {
  let pick = radio.disc;
  let body: HTMLElement | null = null;
  let flying = false;

  function credit(index: number) {
    const disc = DISCS[index];
    if (!disc.credit) return `<p class="card-small card-dim">${escapeHtml(disc.by)}</p>`;
    const creditInfo = disc.credit;
    return `<p class="card-small">a record by ${escapeHtml(disc.by)}, <a href="${creditInfo.url}" target="_blank" rel="noopener">from itch.io</a>
      <br><span class="card-dim">under <a href="${creditInfo.licenceUrl}" target="_blank" rel="noopener">${creditInfo.licence}</a></span></p>`;
  }

  function paint() {
    if (!body) return;
    const hour = scene.view.hour;
    body.innerHTML = `<ol class="crate-list">${DISCS.map((disc, index) => {
      const open = index === pick,
        playing = index === radio.disc;
      return `<li${open ? ' class="picked"' : ""}>
        <button type="button" class="crate-name" data-k="${index}" aria-expanded="${open}"><span class="card-kanji-s">${NUMERALS[index]}</span> ${disc.jp} · ${escapeHtml(disc.title)}${playing ? ` <span class="card-small card-dim">· on the player</span>` : ""}</button>
        ${
          open
            ? `<p class="card-small">${escapeHtml(disc.about(hour))}</p>${credit(index)}
          <button type="button" class="card-knob crate-put">${playing ? radio.label() : "置 · put it on"}</button>`
            : ""
        }</li>`;
    }).join("")}</ol>`;
    body.querySelectorAll<HTMLButtonElement>(".crate-name").forEach((button) =>
      button.addEventListener("click", () => {
        pick = Number(button.dataset.k);
        paint();
        body?.querySelector<HTMLButtonElement>(`.crate-name[data-k="${pick}"]`)?.focus();
      }),
    );
    body.querySelector(".crate-put")?.addEventListener("click", () => {
      if (pick === radio.disc) {
        radio.toggle();
        paint();
      } else pullOut(pick);
    });
  }

  function pullOut(index: number) {
    hide();
    if (flying) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scene.view.disc = index;
      scene.draw();
      radio.put(index);
      return;
    }
    flying = true;
    const sleeve = crateSleeve(toneVars(), index);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${sleeve.W} ${sleeve.H}`);
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("sheet");
    svg.innerHTML = toSvg(sleeve, false);
    [...figure.querySelectorAll(":scope > svg")].pop()!.after(svg);
    scene.view.disc = index;
    scene.view.lifted = index;
    scene.draw();
    const group = svg.lastElementChild as SVGGElement;
    group.style.transformBox = "fill-box";
    group.style.transformOrigin = "center";
    const [shiftX, shiftY] = [FLOOR[0] - sleeve.from[0], FLOOR[1] - sleeve.from[1]];
    group
      .animate(
        [
          { transform: "none" },
          { transform: `translate(${shiftX}px, ${shiftY}px) rotate(-7deg) scale(0.9, 0.52)` },
        ],
        { duration: 1100, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" },
      )
      .finished.then(() => {
        scene.view.lifted = null;
        scene.draw();
        svg.remove();
        flying = false;
        radio.put(index);
      });
  }

  const fill: Fill = {
    make(panel) {
      body = panel;
      paint();
    },
    update: paint,
    leave() {
      body = null;
    },
  };
  radio.onChange(paint);

  return {
    fill,
    choose(index: number | null) {
      pick = index ?? radio.disc;
      paint();
    },
  };
}
