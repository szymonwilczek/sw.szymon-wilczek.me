// Social cards in spilled ink

import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const font = (file: string) => fs.readFileSync(path.resolve("./src/assets/fonts", file));

const FONTS = [
  { name: "Literata", data: font("Literata72-Light.ttf"), weight: 300 as const },
  { name: "Literata", data: font("Literata72-Light-ext.ttf"), weight: 300 as const },
  { name: "Literata", data: font("Literata72-Regular.ttf"), weight: 400 as const },
  { name: "Literata", data: font("Literata72-Regular-ext.ttf"), weight: 400 as const },
  { name: "Kalam", data: font("Kalam-Light.ttf"), weight: 300 as const },
  { name: "Typus Mono 95", data: font("TypusMono95-Regular.ttf"), weight: 400 as const },
  { name: "Yuji Syuku", data: font("YujiSyuku-seals.ttf"), weight: 400 as const },
];

const PAPER = "#dad8cf";
const INK = "#202826";
const TONE = "#185068";
const DIM = "#56625e";
const RED = "#9c3a2e";

const FILTERS = `
<filter id="tremble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>
<filter id="wash" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="5"/><feDisplacementMap in="SourceGraphic" scale="6"/><feGaussianBlur stdDeviation="0.9"/></filter>
<filter id="bleed" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="14"/><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="fibre" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.8 0.05" numOctaves="2" seed="2"/><feColorMatrix type="matrix" values="0 0 0 0 0.13  0 0 0 0 0.16  0 0 0 0 0.15  0 0 0 0.5 -0.18"/></filter>`;

const POOL_EDGE =
  "M712 0 C704 60 772 84 748 146 C724 206 668 226 706 288 C744 344 812 324 842 384 C872 446 816 498 884 536 C950 572 1016 514 1076 552 C1124 582 1162 624 1200 618";

const pool = (drops: string) => `
<g transform="translate(-16 12)" filter="url(#bleed)" fill="${TONE}" opacity="0.55">
<path d="M690 -60 L690 0 C680 64 752 84 726 146 C700 210 640 226 682 292 C724 352 796 326 826 388 C858 452 796 506 868 548 C940 590 1010 526 1072 566 C1122 598 1160 640 1200 630 L1260 680 L1260 -60 Z"/>
</g>
<g filter="url(#wash)" fill="${INK}" opacity="0.9">
<path d="${POOL_EDGE} L1260 680 L1260 -60 L712 -60 Z"/>
${drops}
</g>
<g filter="url(#tremble)" fill="none" stroke="${INK}" stroke-width="1.5" opacity="0.8">
<path d="${POOL_EDGE}"/>
</g>`;

const INK_LAYERS = {
  home: pool(`
<circle cx="640" cy="92" r="5"/>
<circle cx="618" cy="302" r="7"/>
<circle cx="664" cy="470" r="4"/>
<circle cx="596" cy="418" r="3"/>
<circle cx="690" cy="40" r="3"/>`),
  essay: `
<g transform="translate(330 0) scale(0.72)">${pool(`
<circle cx="672" cy="96" r="6"/>
<circle cx="660" cy="320" r="8"/>
<circle cx="760" cy="480" r="5"/>`)}
</g>
<g filter="url(#wash)" fill="${INK}" opacity="0.85">
<path d="M88 452 C200 444 360 446 520 440 C540 440 540 450 520 451 C360 458 200 458 88 460 Z"/>
</g>`,
};

type Layout = keyof typeof INK_LAYERS;

const paperCache = new Map<Layout, string>();

function paper(layout: Layout): string {
  let uri = paperCache.get(layout);
  if (!uri) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs>${FILTERS}</defs><rect width="1200" height="630" fill="${PAPER}"/><rect width="1200" height="630" filter="url(#fibre)" opacity="0.5"/>${INK_LAYERS[layout]}</svg>`;
    const png = new Resvg(svg).render().asPng();
    uri = `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    paperCache.set(layout, uri);
  }
  return uri;
}

type El = { type: string; props: Record<string, unknown> };

const el = (type: string, style: Record<string, unknown>, children?: unknown): El => ({
  type,
  props: { style, children },
});

const seal = (size: number) =>
  el(
    "div",
    {
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: RED,
      color: PAPER,
      borderRadius: 3,
      transform: "rotate(-4deg)",
      fontFamily: "Yuji Syuku",
      fontSize: Math.round(size * 0.62),
    },
    "狼",
  );

const mono = (fontSize: number, text: string) =>
  el("div", { fontFamily: "Typus Mono 95", fontSize, letterSpacing: 0.7, color: DIM }, text);

async function render(layout: Layout, children: El[]): Promise<Uint8Array<ArrayBuffer>> {
  const card = el(
    "div",
    {
      position: "relative",
      width: 1200,
      height: 630,
      display: "flex",
      backgroundImage: `url(${paper(layout)})`,
      backgroundSize: "1200px 630px",
      color: INK,
      fontFamily: "Literata",
    },
    children,
  );
  const svg = await satori(card, { width: 1200, height: 630, fonts: FONTS });
  return new Uint8Array(new Resvg(svg).render().asPng());
}

export function homeCard(host: string): Promise<Uint8Array<ArrayBuffer>> {
  return render("home", [
    el(
      "div",
      {
        position: "absolute",
        left: 88,
        top: 120,
        width: 560,
        display: "flex",
        flexDirection: "column",
        gap: 22,
      },
      [
        mono(18, "~/garden"),
        el(
          "div",
          {
            display: "flex",
            flexDirection: "column",
            fontWeight: 300,
            fontSize: 84,
            lineHeight: 1.02,
          },
          [el("span", {}, "Szymon"), el("span", {}, "Wilczek")],
        ),
        el(
          "div",
          { fontFamily: "Kalam", fontWeight: 300, fontSize: 30, color: DIM },
          "Linux, C, GNU Emacs",
        ),
      ],
    ),
    el(
      "div",
      {
        position: "absolute",
        left: 88,
        bottom: 72,
        display: "flex",
        alignItems: "center",
        gap: 18,
      },
      [seal(52), mono(22, host)],
    ),
  ]);
}

export function essayCard(
  host: string,
  title: string,
  category: string,
  date: Date,
): Promise<Uint8Array<ArrayBuffer>> {
  const day = date.toISOString().split("T")[0];
  return render("essay", [
    el(
      "div",
      {
        position: "absolute",
        left: 88,
        top: 96,
        width: 700,
        display: "flex",
        flexDirection: "column",
        gap: 26,
      },
      [
        mono(18, `${category.toLowerCase()} · ${day}`),
        el("div", { fontWeight: 400, fontSize: 64, lineHeight: 1.12 }, title),
      ],
    ),
    el(
      "div",
      {
        position: "absolute",
        left: 88,
        right: 88,
        bottom: 72,
        display: "flex",
        alignItems: "center",
        gap: 18,
      },
      [
        seal(46),
        el("div", { fontFamily: "Kalam", fontWeight: 300, fontSize: 28 }, "Szymon Wilczek"),
        el("div", { marginLeft: "auto", display: "flex" }, [mono(20, host)]),
      ],
    ),
  ]);
}
