// The still water and the raked sand, drawn at build time into their own .svg
// files under /art/.

import { MOMIJI } from "./momiji";
import { makeSand, smooth } from "./sand";
import { bladePath, makeField } from "./susuki";
import { LAYOUTS, makeWater } from "./water";

export const ART = ["water-wide", "water-tall", "sand", "grass-wide", "grass-tall"] as const;
export type ArtName = (typeof ART)[number];

const json = (v: unknown) => JSON.stringify(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const doc = (attrs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

const stones = (list: Array<{ shadow: string; d: string; facet: string; moss?: string }>) =>
  list
    .map(
      (s) =>
        `<g class="stone"><path class="stone-shadow" d="${s.shadow}"/><path class="stone-body" d="${s.d}"/><path class="stone-facet" d="${s.facet}"/>${s.moss ? `<path class="stone-moss" d="${s.moss}"/>` : ""}</g>`,
    )
    .join("");

function water(name: "wide" | "tall") {
  const L = LAYOUTS[name];
  const w = makeWater(L);
  const [sx, sy] = name === "wide" ? [900, 30] : [300, 20];
  return doc(
    `viewBox="0 0 ${L.W} ${L.H}" data-lines="${json(w.lines.map((l) => l.pts))}" data-calm="${json(w.calm)}"`,
    `<path class="water-bank" d="${w.bank}"/>` +
      `<path class="water-bed" d="${w.edge}"/>` +
      `<path class="water-edge" d="${w.edge}"/>` +
      `<g class="water-lines">${w.lines.map((l) => `<path d="${smooth(l.pts, false)}" stroke-width="${l.w}" opacity="${l.o}"/>`).join("")}</g>` +
      `<g class="water-glints">${w.calm.map(([x, y, len]) => `<path d="M${x} ${y} q${len / 2} -1.2 ${len} 0"/>`).join("")}</g>` +
      `<clipPath id="pond-${name}"><path d="${w.edge}"/></clipPath>` +
      `<g class="water-rings" clip-path="url(#pond-${name})"/>` +
      w.pads
        .map(
          (p) =>
            `<g class="pad" transform="translate(${p.x} ${p.y})"><path class="pad-leaf" d="${p.d}"/><path class="pad-vein" d="${p.vein}"/></g>`,
        )
        .join("") +
      stones(w.stones) +
      `<g class="water-leaf" transform="translate(${L.leaf[0]} ${L.leaf[1]}) rotate(-23)"><g transform="scale(0.13)">` +
      `<path class="leaf-stem" d="${MOMIJI.stem}"/><path class="leaf-blade" d="${MOMIJI.outline}"/><path class="leaf-ink" d="${MOMIJI.outline}" transform="translate(5 -4)"/></g></g>` +
      `<g class="water-seal" transform="translate(${sx} ${sy}) rotate(-6) scale(0.8)"><path d="M4 5 Q23 2 42 4 Q45 23 43 42 Q23 45 3 43 Q1 23 4 5 Z"/><text x="23" y="31" text-anchor="middle">波</text></g>`,
  );
}

function sand() {
  const s = makeSand();
  return doc(
    `viewBox="0 0 1000 190" data-lines="${json([...s.lines, ...s.rings].map((l) => l.pts))}"`,
    `<defs><clipPath id="sand-clip"><path d="${s.edge}"/></clipPath></defs>` +
      `<path class="sand-bed" d="${s.edge}"/>` +
      `<g class="sand-grains">${s.grains.map((g) => `<circle cx="${g.x}" cy="${g.y}" r="${g.r}"/>`).join("")}</g>` +
      `<g class="sand-lines">${[...s.lines, ...s.rings].map((l) => `<path d="${smooth(l.pts, false)}" stroke-width="${l.w}" opacity="${l.o}"/>`).join("")}</g>` +
      `<g class="sand-kept" clip-path="url(#sand-clip)"/>` +
      stones(s.stones) +
      `<g class="sand-rake" aria-hidden="true">${'<circle r="1.8"/>'.repeat(5)}</g>` +
      `<g class="sand-leaf" transform="translate(806 97) rotate(-28) scale(0.14)">` +
      `<path class="sand-leaf-stem" d="${MOMIJI.stem}"/><path class="sand-leaf-blade" d="${MOMIJI.outline}"/><path class="sand-leaf-ink" d="${MOMIJI.outline}" transform="translate(5 -4)"/></g>`,
  );
}

function grass(tall: boolean) {
  const f = makeField(tall);
  const rest = f.blades.map((b) => bladePath(b, 0));
  const { x, y, r } = f.moon;
  return doc(
    `viewBox="0 0 ${f.W} ${f.H}"`,
    `<circle class="moon" cx="${x}" cy="${y}" r="${r}"/>` +
      `<path class="moon-rabbit" d="${f.moon.rabbit}"/>` +
      `<g class="blades">${f.blades.map((b, i) => `<path d="${rest[i].d}" stroke-width="${b.w}" opacity="${b.o}"/>`).join("")}</g>` +
      `<g class="plumes">${rest.map((q) => (q.plume ? `<path d="${q.plume}"/>` : "")).join("")}</g>` +
      `<path class="ground" d="${f.ground}"/>` +
      `<g class="grass-seal" transform="translate(${x - r - 52} ${y - 22}) rotate(-6) scale(0.8)"><path d="M4 5 Q23 2 42 4 Q45 23 43 42 Q23 45 3 43 Q1 23 4 5 Z"/><text x="23" y="31" text-anchor="middle">兎</text></g>`,
  );
}

export function drawArt(name: ArtName) {
  if (name === "sand") return sand();
  if (name.startsWith("grass")) return grass(name === "grass-tall");
  return water(name === "water-wide" ? "wide" : "tall");
}

export const artUrl = (name: ArtName) => `/art/${name}.svg`;
