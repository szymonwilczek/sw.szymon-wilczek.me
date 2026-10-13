import { crateSleeve, toSvg, toneVars } from "../../utils/tea/ink.js";
import { DISCS } from "./discs";
import type { Fill } from "./cards";
import type { Radio } from "./radio";
import type { View } from "./scene";

const NUM = ["一", "二", "三", "四", "五"];
const FLOOR = [435, 615];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function crateOf(
  fig: HTMLElement,
  scene: { view: View; draw: () => void },
  radio: Radio,
  hide: () => void,
) {
  let pick = radio.disc;
  let body: HTMLElement | null = null;
  let flying = false;

  function credit(k: number) {
    const d = DISCS[k];
    if (!d.credit) return `<p class="card-small card-dim">${esc(d.by)}</p>`;
    const c = d.credit;
    return `<p class="card-small">a record by ${esc(d.by)}, <a href="${c.url}" target="_blank" rel="noopener">from itch.io</a>
      <br><span class="card-dim">under <a href="${c.licenceUrl}" target="_blank" rel="noopener">${c.licence}</a></span></p>`;
  }

  function paint() {
    if (!body) return;
    const h = scene.view.hour;
    body.innerHTML = `<ol class="crate-list">${DISCS.map((d, k) => {
      const open = k === pick,
        on = k === radio.disc;
      return `<li${open ? ' class="picked"' : ""}>
        <button type="button" class="crate-name" data-k="${k}" aria-expanded="${open}"><span class="card-kanji-s">${NUM[k]}</span> ${d.jp} · ${esc(d.title)}${on ? ` <span class="card-small card-dim">· on the player</span>` : ""}</button>
        ${
          open
            ? `<p class="card-small">${esc(d.about(h))}</p>${credit(k)}
          <button type="button" class="card-knob crate-put">${on ? radio.label() : "置 · put it on"}</button>`
            : ""
        }</li>`;
    }).join("")}</ol>`;
    body.querySelectorAll<HTMLButtonElement>(".crate-name").forEach((b) =>
      b.addEventListener("click", () => {
        pick = Number(b.dataset.k);
        paint();
        body?.querySelector<HTMLButtonElement>(`.crate-name[data-k="${pick}"]`)?.focus();
      }),
    );
    body.querySelector(".crate-put")?.addEventListener("click", () => {
      if (pick === radio.disc) {
        radio.toggle();
        paint();
      } else put(pick);
    });
  }

  function put(k: number) {
    hide();
    if (flying) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scene.view.disc = k;
      scene.draw();
      radio.put(k);
      return;
    }
    flying = true;
    const out = crateSleeve(toneVars(), k);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${out.W} ${out.H}`);
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("sheet");
    svg.innerHTML = toSvg(out, false);
    [...fig.querySelectorAll(":scope > svg")].pop()!.after(svg);
    scene.view.disc = k;
    scene.view.lifted = k;
    scene.draw();
    const g = svg.lastElementChild as SVGGElement;
    g.style.transformBox = "fill-box";
    g.style.transformOrigin = "center";
    const [dx, dy] = [FLOOR[0] - out.from[0], FLOOR[1] - out.from[1]];
    g.animate(
      [
        { transform: "none" },
        { transform: `translate(${dx}px, ${dy}px) rotate(-7deg) scale(0.9, 0.52)` },
      ],
      { duration: 1100, easing: "cubic-bezier(.45,.05,.3,1)", fill: "forwards" },
    ).finished.then(() => {
      scene.view.lifted = null;
      scene.draw();
      svg.remove();
      flying = false;
      radio.put(k);
    });
  }

  const fill: Fill = {
    make(b) {
      body = b;
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
    choose(k: number | null) {
      pick = k ?? radio.disc;
      paint();
    },
  };
}
