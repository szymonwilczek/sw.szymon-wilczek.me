// The still water, drawn at build time into its own .svg files under /art/

import { MOMIJI } from "./momiji";
import { smooth } from "./stamp";
import { LAYOUTS, makeWater } from "./water";

export const ART = ["water-wide", "water-tall"] as const;
export type ArtName = (typeof ART)[number];

const json = (value: unknown) =>
  JSON.stringify(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;");

const svgDoc = (attrs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`;

const stones = (list: Array<{ shadow: string; d: string; facet: string; moss?: string }>) =>
  list
    .map(
      (stone) =>
        `<g class="stone"><path class="stone-shadow" d="${stone.shadow}"/><path class="stone-body" d="${stone.d}"/><path class="stone-facet" d="${stone.facet}"/>${stone.moss ? `<path class="stone-moss" d="${stone.moss}"/>` : ""}</g>`,
    )
    .join("");

function water(name: "wide" | "tall") {
  const layout = LAYOUTS[name];
  const pond = makeWater(layout);
  const [sealX, sealY] = name === "wide" ? [900, 30] : [300, 20];
  return svgDoc(
    `viewBox="0 0 ${layout.W} ${layout.H}" data-lines="${json(pond.lines.map((line) => line.pts))}" data-calm="${json(pond.calm)}"`,
    `<path class="water-bank" d="${pond.bank}"/>` +
      `<path class="water-bed" d="${pond.edge}"/>` +
      `<path class="water-edge" d="${pond.edge}"/>` +
      `<g class="water-lines">${pond.lines.map((line) => `<path d="${smooth(line.pts, false)}" stroke-width="${line.w}" opacity="${line.o}"/>`).join("")}</g>` +
      `<g class="water-glints">${pond.calm.map(([x, y, length]) => `<path d="M${x} ${y} q${length / 2} -1.2 ${length} 0"/>`).join("")}</g>` +
      `<clipPath id="pond-${name}"><path d="${pond.edge}"/></clipPath>` +
      `<g class="water-rings" clip-path="url(#pond-${name})"/>` +
      pond.pads
        .map(
          (pad) =>
            `<g class="pad" transform="translate(${pad.x} ${pad.y})"><path class="pad-leaf" d="${pad.d}"/><path class="pad-vein" d="${pad.vein}"/></g>`,
        )
        .join("") +
      stones(pond.stones) +
      `<g class="water-leaf" transform="translate(${layout.leaf[0]} ${layout.leaf[1]}) rotate(-23)"><g transform="scale(0.13)">` +
      `<path class="leaf-stem" d="${MOMIJI.stem}"/><path class="leaf-blade" d="${MOMIJI.outline}"/><path class="leaf-ink" d="${MOMIJI.outline}" transform="translate(5 -4)"/></g></g>` +
      `<g class="water-seal" transform="translate(${sealX} ${sealY}) rotate(-6) scale(0.8)"><path d="M4 5 Q23 2 42 4 Q45 23 43 42 Q23 45 3 43 Q1 23 4 5 Z"/><text x="23" y="31" text-anchor="middle">波</text></g>`,
  );
}

export function drawArt(name: ArtName) {
  return water(name === "water-wide" ? "wide" : "tall");
}

export const artUrl = (name: ArtName) => `/art/${name}.svg`;
