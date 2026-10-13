import fs from "node:fs";
import path from "node:path";
import { create } from "fontkitten";
import { Resvg } from "@resvg/resvg-js";

const PUBLIC = path.resolve("public");
const SEAL_FONT = path.resolve("src/assets/fonts/YujiSyuku-seals.ttf");
const THEMES = JSON.parse(fs.readFileSync(path.resolve("src/data/au-themes.json"), "utf8"));

const SWATCH_PAPER = 0;
const SWATCH_RED = 3;
const swatchOf = (id) => THEMES.find((theme) => theme.id === id).swatch;
const DAY = {
  paper: swatchOf("salina-day")[SWATCH_PAPER],
  red: swatchOf("salina-day")[SWATCH_RED],
};
const NIGHT = {
  paper: swatchOf("salina-night")[SWATCH_PAPER],
  red: swatchOf("salina-night")[SWATCH_RED],
};

const BOARD = 64;
const CENTRE = BOARD / 2;
const TILT_DEGREES = -4; // the seal leans like the one in the header
const SEAL_OUTLINE = "M7 9 Q32 5 57 8 Q61 32 58 57 Q32 61 6 58 Q3 32 7 9 Z";
const INNER_RULE = "M12 14 Q32 11 52 13 Q54 32 52 51 Q32 54 12 52 Q10 32 12 14 Z";
const INNER_RULE_WIDTH = 1.3;
const INNER_RULE_OPACITY = 0.65;
const BLEED_OFFSET = 1.5; // the ink soaked into the paper beside the seal
const BLEED_OPACITY = 0.35;
const GLYPH = "狼";
const GLYPH_SIZE = 31;
const GLYPH_BASELINE = 44;

const TREMBLE = { frequency: 0.18, octaves: 2, seed: 7, scale: 1.4 };
const BLEED = { frequency: 0.08, octaves: 3, seed: 9, scale: 5, blur: 1.1 };
const TREMBLE_MARGIN = 10; // filter region, percent past each edge
const BLEED_MARGIN = 30;

const FAVICON_SIZES = [16, 32, 48];
const APPLE_TOUCH_SIZE = 180;
const MANIFEST_SIZES = [192, 512];

function glyphPath() {
  const font = create(fs.readFileSync(SEAL_FONT));
  const glyph = font.glyphForCodePoint(GLYPH.codePointAt(0));
  const scale = GLYPH_SIZE / font.unitsPerEm;
  const left = CENTRE - (glyph.advanceWidth * scale) / 2;
  return `<path d="${glyph.path.toSVG()}" transform="translate(${left} ${GLYPH_BASELINE}) scale(${scale} ${-scale})"/>`;
}

const filters = () => {
  const region = (margin) =>
    `x="-${margin}%" y="-${margin}%" width="${100 + 2 * margin}%" height="${100 + 2 * margin}%"`;
  return `<filter id="tremble" ${region(TREMBLE_MARGIN)}><feTurbulence type="fractalNoise" baseFrequency="${TREMBLE.frequency}" numOctaves="${TREMBLE.octaves}" seed="${TREMBLE.seed}"/><feDisplacementMap in="SourceGraphic" scale="${TREMBLE.scale}"/></filter>
<filter id="bleed" ${region(BLEED_MARGIN)}><feTurbulence type="fractalNoise" baseFrequency="${BLEED.frequency}" numOctaves="${BLEED.octaves}" seed="${BLEED.seed}"/><feDisplacementMap in="SourceGraphic" scale="${BLEED.scale}"/><feGaussianBlur stdDeviation="${BLEED.blur}"/></filter>`;
};

function seal({ red, paper, tilted, tile }) {
  const lean = tilted ? ` transform="rotate(${TILT_DEGREES} ${CENTRE} ${CENTRE})"` : "";
  const background = tile ? `<rect width="${BOARD}" height="${BOARD}" ${paper.fill}/>` : "";
  return `${background}
<path filter="url(#bleed)" d="${SEAL_OUTLINE}" ${red.fill} opacity="${BLEED_OPACITY}" transform="translate(${BLEED_OFFSET} ${BLEED_OFFSET})"/>
<g filter="url(#tremble)"${lean}>
<path d="${SEAL_OUTLINE}" ${red.fill}/>
<path d="${INNER_RULE}" fill="none" ${paper.stroke} stroke-width="${INNER_RULE_WIDTH}" opacity="${INNER_RULE_OPACITY}"/>
<g ${paper.fill}>${glyphPath()}</g>
</g>`;
}

const svg = (body, style = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOARD} ${BOARD}">${style}<defs>${filters()}</defs>${body}</svg>\n`;

const painted = (colour) => ({ fill: `fill="${colour}"`, stroke: `stroke="${colour}"` });
const classed = (name) => ({ fill: `class="${name}"`, stroke: `class="${name}-line"` });

function faviconSvg() {
  const style = `<style>.red{fill:${DAY.red}}.paper{fill:${DAY.paper}}.paper-line{stroke:${DAY.paper}}
@media (prefers-color-scheme: dark){.red{fill:${NIGHT.red}}.paper{fill:${NIGHT.paper}}.paper-line{stroke:${NIGHT.paper}}}</style>`;
  return svg(
    seal({ red: classed("red"), paper: classed("paper"), tilted: true, tile: false }),
    style,
  );
}

const daySvg = ({ tilted, tile }) =>
  svg(seal({ red: painted(DAY.red), paper: painted(DAY.paper), tilted, tile }));

const png = (source, size) =>
  new Resvg(source, { fitTo: { mode: "width", value: size } }).render().asPng();

const ICO_HEADER = 6;
const ICO_ENTRY = 16;
const ICO_TYPE_ICON = 1;
const ICO_COLOUR_PLANES = 1;
const ICO_BITS_PER_PIXEL = 32;
const ICO_MAX_SIDE = 256;
function ico(images) {
  const header = Buffer.alloc(ICO_HEADER);
  header.writeUInt16LE(ICO_TYPE_ICON, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = ICO_HEADER + ICO_ENTRY * images.length;
  const entries = images.map(({ size, data }) => {
    const entry = Buffer.alloc(ICO_ENTRY);
    entry.writeUInt8(size % ICO_MAX_SIDE, 0);
    entry.writeUInt8(size % ICO_MAX_SIDE, 1);
    entry.writeUInt16LE(ICO_COLOUR_PLANES, 4);
    entry.writeUInt16LE(ICO_BITS_PER_PIXEL, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    return entry;
  });
  return Buffer.concat([header, ...entries, ...images.map(({ data }) => data)]);
}

const manifest = {
  name: "Szymon Wilczek",
  short_name: "Wilczek",
  icons: MANIFEST_SIZES.map((size) => ({
    src: `/icon-${size}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
  })),
  theme_color: DAY.paper,
  background_color: DAY.paper,
  display: "browser",
};

const write = (file, data) => {
  fs.writeFileSync(path.join(PUBLIC, file), data);
  console.log(`wrote public/${file}`);
};

write("favicon.svg", faviconSvg());
const leaning = daySvg({ tilted: true, tile: false });
write("favicon.ico", ico(FAVICON_SIZES.map((size) => ({ size, data: png(leaning, size) }))));
const tile = daySvg({ tilted: false, tile: true });
write("apple-touch-icon.png", png(tile, APPLE_TOUCH_SIZE));
for (const size of MANIFEST_SIZES) write(`icon-${size}.png`, png(tile, size));
write("site.webmanifest", JSON.stringify(manifest, null, 2) + "\n");
