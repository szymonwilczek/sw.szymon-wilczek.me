import {
  THEME_VARS,
  mix,
  toneVars,
  TONE_CSS,
  FILTERS,
  groupSvg,
  toSvg,
  hash,
  rng,
  setPrecision,
  roundCoord,
  lerp,
  smooth,
  polygonPath,
} from "./ink/core.js";
import {
  TREMBLE_FILTER,
  WASH_FILTER,
  jitter,
  wobblyPolygon,
  wobblyBox,
  wobblyLine,
  wobblySegment,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  addText,
  inked,
  quadMap,
  brushPath,
  brushStroke,
  brushWash,
  dryBrush,
  mistPath,
  mist,
  oblique,
  projectAll,
} from "./ink/pen.js";
import {
  stone,
  steppingStones,
  maple,
  lantern,
  thatchStrokes,
  cordTie,
  steam,
} from "./ink/garden.js";
import { face, post, gableRoof, plaque } from "./ink/architecture.js";
import { stoneBody, sekiStone } from "./ink/seki.js";
import {
  leafPath,
  leafSpray,
  culmGeometry,
  culmPart,
  cutFace,
  culmTop,
  CULMS,
  edgeHit,
  bambooClump,
  sceneBamboo,
} from "./ink/bamboo.js";
import {
  obliqueScaled,
  CLAYS,
  GLAZES,
  GLAZE_NAMES,
  GLAZE_KANJI,
  PAINTS,
  radiusAt,
  PROFILES,
  piece,
  demoSpec,
} from "./ink/ceramics.js";
import { wheel, spin, wetClay, fingertip, arrowLine, bucket, brushTool } from "./ink/tools.js";
import {
  WORKSHOP_WIDTH,
  noren,
  workshopWalls,
  dryingBench,
  noborigama,
  workshopInside,
} from "./ink/workshop.js";
import { sceneGarden16 } from "./ink/roji.js";
import { note, kanji, frames, hotspot, sceneWorkshop } from "./ink/kobo/steps.js";
import { sceneWheel, sceneShapes } from "./ink/kobo/wheel.js";
import { chamber, heatBar, tongs, sceneKiln } from "./ink/kobo/kiln.js";
import { sceneGlazes, scenePaint } from "./ink/kobo/glaze.js";
import { dashed, sceneShelf, scenePieceCard } from "./ink/kobo/shelf.js";
import {
  SKY,
  smoothstep,
  clockLabel,
  STARLIGHT,
  SEASONS,
  solarHour,
  hourLight,
  skyWash,
  arcAt,
  sunDisc,
  moonDisc,
  stars,
  ridge,
  skyLayer,
  veil,
  ensoDial,
} from "./ink/engawa/sky.js";
import { slab, lampGlow, fireflies } from "./ink/engawa/terrace.js";
import { recordPlayer, DISC_LOOK, sleeve, crateSleeve } from "./ink/engawa/records.js";
import {
  teaCup,
  hangingLamp,
  seasonLook,
  SNOW,
  snowCap,
  arcTop,
  falling,
  koro,
} from "./ink/engawa/house.js";
import { sceneEngawa } from "./ink/engawa/scene.js";

// cards
function washi(group, rand, x, y, width, height, tones, tilt) {
  const points = [],
    slant = tilt || 0,
    at = (px, py) => [x + px + py * slant, y + py - px * slant];
  for (let i = 0; i <= 10; i++)
    points.push(at((width * i) / 10 + jitter(rand, 1.5), jitter(rand, 1.2)));
  for (let i = 1; i <= 8; i++) points.push(at(width + jitter(rand, 1.6), (height * i) / 9));
  for (let i = 0; i <= 22; i++)
    points.push(at(width - (width * i) / 22, height + jitter(rand, 5) + Math.sin(i * 1.7) * 2.5));
  for (let i = 8; i >= 1; i--) points.push(at(jitter(rand, 1.6), (height * i) / 9));
  const outline = polygonPath(points);
  addWash(
    group,
    rand,
    polygonPath(points.map(([dx, dy]) => [dx + 7, dy + 9])),
    tones.pool,
    0.9,
    "url(#bk-pool)",
  );
  addSolid(group, outline, mix(tones.paper, tones.gold, 0.08), 1, TREMBLE_FILTER);
  addWash(
    group,
    rand,
    outline,
    mix(tones.paper, tones.tape || tones.gold, 0.25),
    0.35,
    "url(#bk-bleed)",
  );
  for (let k = 0; k < Math.round((width * height) / 9000); k++) {
    const speck = at(rand() * width, rand() * height);
    addLine(
      group,
      wobblyLine(
        rand,
        [
          speck,
          [speck[0] + 6 + rand() * 10, speck[1] + jitter(rand, 4)],
          [speck[0] + 12 + rand() * 12, speck[1] + jitter(rand, 5)],
        ],
        0.5,
      ),
      tones.inkSoft,
      0.5,
      0.18,
      true,
    );
  }
  addLine(group, outline, tones.ink, 0.9, 0.55);
  return at;
}
function hanko(group, rand, x, y, size, glyphs, tones) {
  addSolid(
    group,
    wobblyBox(rand, x - size / 2, y - size / 2, x + size / 2, y + size / 2, size * 0.04),
    tones.red,
    0.88,
    TREMBLE_FILTER,
  );
  addText(group, {
    t: glyphs,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: size * (glyphs.length > 1 ? 0.42 : 0.66),
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
    wm: glyphs.length > 1 ? "vertical-rl" : "horizontal-tb",
  });
}
// left-aligned lines
function paragraph(group, text, x, y, width, fontSize, tones, props) {
  const maxChars = Math.floor(width / (fontSize * 0.47)),
    lines = [""];
  text.split(" ").forEach((word) => {
    if ((lines[lines.length - 1] + " " + word).trim().length > maxChars) lines.push(word);
    else lines[lines.length - 1] = (lines[lines.length - 1] + " " + word).trim();
  });
  lines.forEach((line, i) =>
    addText(
      group,
      Object.assign(
        {
          t: line,
          tr: `translate(${roundCoord(x)} ${roundCoord(y + i * fontSize * 1.45)})`,
          fs: fontSize,
          fill: tones.ink,
          o: 0.85,
          an: "start",
        },
        props || {},
      ),
    ),
  );
  return y + lines.length * fontSize * 1.45;
}
// object drawn by its own scene code
function vignette(groups, x, y, scale, draw) {
  const layers = [],
    group = newGroup();
  layers.push(group);
  draw(layers, group);
  layers.forEach((layer) => {
    layer.tf = `translate(${roundCoord(x)}px, ${roundCoord(y)}px) scale(${scale})`;
    layer.to = "0px 0px";
    layer.anim = "none";
    groups.push(layer);
  });
}
// frame every card shares
function cardFrame(groups, tones, key, x, y, width, height, jp, en, seal) {
  const group = newGroup(),
    rand = rng(hash("card/" + key));
  groups.push(group);
  washi(group, rand, x, y, width, height, tones, 0);
  const points = [];
  for (let i = 0; i <= 22; i++) {
    const angle = -2.2 + (i / 22) * 5.6;
    points.push([x + 200 + Math.cos(angle) * 118, y + 150 + Math.sin(angle) * 104]);
  }
  brushWash(group, rand, points, 20, tones.inkSoft, 0.22, { tip: 0.2 });
  addText(group, {
    t: jp,
    tr: `translate(${roundCoord(x + width - 46)} ${roundCoord(y + 40 + jp.length * 22)})`,
    fs: 40,
    font: "'Yuji Syuku', serif",
    fill: tones.ink,
    wm: "vertical-rl",
    o: 0.92,
  });
  brushStroke(
    group,
    rand,
    [
      [x + width - 28, y + 26],
      [x + width - 18, y + 36],
    ],
    2.6,
    tones.ink,
    0.7,
  );
  brushStroke(
    group,
    rand,
    [
      [x + width - 18, y + 26],
      [x + width - 28, y + 36],
    ],
    2.6,
    tones.ink,
    0.7,
  );
  addText(group, {
    t: en,
    tr: `translate(${roundCoord(x + 36)} ${roundCoord(y + 296)})`,
    fs: 30,
    fill: tones.ink,
    an: "start",
  });
  addLine(
    group,
    wobblyLine(
      rand,
      [
        [x + 36, y + 318],
        [x + 200, y + 316],
        [x + width - 120, y + 319],
      ],
      0.8,
    ),
    tones.ink,
    1,
    0.35,
  );
  if (seal) hanko(group, rand, x + width - 50, y + height - 56, 38, seal, tones);
  const textGroup = newGroup();
  groups.push(textGroup);
  return {
    g: textGroup,
    r: rng(hash("card/" + key + "/t")),
    x0: x + 36,
    w: width - 72,
    y0: y + 352,
  };
}
function knob(group, rand, x, y, jp, en, tones, active) {
  inked(
    group,
    rand,
    wobblyRing(rand, x, y, 21, 21, 1, 10),
    active ? mix(tones.red, tones.paper, 0.75) : mix(tones.paper, tones.stone, 0.25),
    tones.ink,
    1.1,
  );
  addText(group, {
    t: jp,
    tr: `translate(${roundCoord(x)} ${roundCoord(y)})`,
    fs: 20,
    font: "'Yuji Syuku', serif",
    fill: active ? tones.red : tones.ink,
  });
  addText(group, {
    t: en,
    tr: `translate(${roundCoord(x)} ${roundCoord(y + 36)})`,
    fs: 14,
    fill: tones.ink,
    o: 0.7,
  });
}
// one card for the site
const CARD = {
  record: [
    "蓄音機",
    "the record player",
    null,
    (layers, group, tones) => {
      const rand = rng(hash("vig/rec"));
      recordPlayer(group, rand, 0, 0, 1, tones, hourLight(tones, 17.6, "aki"));
      sleeve(
        group,
        rand,
        [
          [-118, -26],
          [-80, -36],
          [-76, 2],
          [-114, 10],
        ],
        tones,
        0,
      );
    },
    200,
    168,
    1.45,
  ],
  incense: [
    "香炉",
    "incense",
    "香",
    (layers, group, tones, opts) =>
      koro(layers, group, rng(hash("vig/koro")), 0, 0, tones, true, opts.burnt ?? 0, !opts.lit),
    200,
    268,
    1.25,
  ],
  tree: [
    "七十二候",
    "the season, small",
    "候",
    (layers, group, tones, opts) => {
      const rand = rng(hash("vig/maple")),
        look = seasonLook(tones, opts.season);
      brushStroke(
        group,
        rand,
        [
          [20, 210],
          [110, 160],
          [210, 140],
          [300, 96],
        ],
        7,
        tones.ink,
        0.9,
        { head: 0.9, tip: 0.3 },
      );
      brushStroke(
        group,
        rand,
        [
          [150, 152],
          [190, 190],
          [240, 200],
        ],
        3.5,
        tones.ink,
        0.85,
        { tip: 0.3 },
      );
      if (look.crown) {
        const crownTones = Object.assign({}, tones, look.crown);
        maple(group, rand, 230, 120, 70, 70, crownTones);
        maple(group, rand, 210, 196, 40, 30, crownTones);
      } else {
        snowCap(
          group,
          rand,
          [
            [40, 196],
            [110, 156],
            [210, 136],
            [296, 92],
          ],
          4,
        );
      }
      if (look.s === "aki")
        [
          [110, 60],
          [140, 44],
          [170, 32],
          [126, 76],
          [150, 90],
        ].forEach(([gooseX, gooseY]) =>
          addLine(
            group,
            wobblyLine(
              rand,
              [
                [gooseX - 8, gooseY + 3],
                [gooseX, gooseY],
                [gooseX + 9, gooseY + 4],
              ],
              0.4,
            ),
            tones.ink,
            1.6,
            0.85,
            true,
          ),
        );
    },
    40,
    60,
    1,
  ],
  crate: [
    "音盤",
    "the record crate",
    "箱",
    (layers, group, tones, opts) => {
      const rand = rng(hash("vig/crate"));
      addWash(
        group,
        rand,
        wobblyRing(rand, 0, 74, 170, 14, 1, 12),
        tones.pool,
        0.7,
        "url(#bk-pool)",
      );
      DISC_LOOK.forEach((_, slot) => {
        const tilt = ((slot - 2) * 9 * Math.PI) / 180,
          lift = slot === (opts.disc ?? 0) ? 16 : 0,
          cx = (slot - 2) * 46,
          toDisc = ([u, v]) => [
            cx + u * Math.cos(tilt) - v * Math.sin(tilt),
            70 - lift + u * Math.sin(tilt) + v * Math.cos(tilt),
          ],
          sleeveGroup = newGroup();
        layers.push(sleeveGroup);
        sleeve(
          sleeveGroup,
          rand,
          [
            [-36, -96],
            [36, -98],
            [37, -24],
            [-35, -22],
          ].map(toDisc),
          tones,
          slot,
        );
      });
    },
    222,
    214,
    1.15,
  ],
  sky: [
    "灯籠",
    "today's sky",
    "空",
    (layers, group, tones) => lantern(group, rng(hash("vig/lantern")), 0, 0, 1, tones, true),
    200,
    262,
    2,
  ],
  tea: [
    "茶",
    "the tea",
    "茶",
    (layers, group, tones) => teaCup(layers, group, rng(hash("vig/tea")), 0, 0, tones, false),
    210,
    280,
    2,
  ],
};
function cardShell(tones, key, height, opts) {
  const [jp, en, seal, draw, vignetteX, vignetteY, vignetteScale] = CARD[key],
    groups = [];
  cardFrame(groups, tones, key, 6, 6, 520, height, jp, en, seal);
  vignette(groups, 6 + vignetteX, 6 + vignetteY, vignetteScale, (layers, group) =>
    draw(layers, group, tones, opts || {}),
  );
  return { W: 540, H: height + 22, groups, clips: [], y0: 358 };
}

export {
  THEME_VARS,
  mix,
  toneVars,
  setPrecision,
  TONE_CSS,
  FILTERS,
  groupSvg,
  toSvg,
  leafPath,
  roundCoord,
  leafSpray,
  jitter,
  addSolid,
  addLine,
  TREMBLE_FILTER,
  culmGeometry,
  culmPart,
  lerp,
  wobblyPolygon,
  addWash,
  WASH_FILTER,
  wobblyLine,
  smooth,
  cutFace,
  culmTop,
  CULMS,
  edgeHit,
  bambooClump,
  newGroup,
  wobblyRing,
  rng,
  hash,
  sceneBamboo,
  addText,
  dryBrush,
  fingertip,
  brushWash,
  brushPath,
  brushStroke,
  CLAYS,
  piece,
  radiusAt,
  GLAZES,
  PAINTS,
  hotspot,
  inked,
  kanji,
  note,
  wheel,
  wobblyBox,
  GLAZE_NAMES,
  GLAZE_KANJI,
  PROFILES,
  demoSpec,
  spin,
  wetClay,
  arrowLine,
  bucket,
  brushTool,
  WORKSHOP_WIDTH,
  noren,
  projectAll,
  wobblySegment,
  workshopWalls,
  face,
  post,
  dryingBench,
  noborigama,
  chamber,
  workshopInside,
  sceneGarden16,
  steppingStones,
  stone,
  oblique,
  gableRoof,
  thatchStrokes,
  ridge,
  plaque,
  sekiStone,
  stoneBody,
  mist,
  mistPath,
  frames,
  sceneWorkshop,
  obliqueScaled,
  sceneWheel,
  sceneShapes,
  heatBar,
  tongs,
  sceneKiln,
  sceneGlazes,
  scenePaint,
  dashed,
  sceneShelf,
  scenePieceCard,
  sceneEngawa,
  hourLight,
  SEASONS,
  solarHour,
  SKY,
  smoothstep,
  seasonLook,
  maple,
  skyLayer,
  stars,
  STARLIGHT,
  skyWash,
  arcAt,
  sunDisc,
  moonDisc,
  SNOW,
  snowCap,
  lantern,
  arcTop,
  cordTie,
  quadMap,
  slab,
  sleeve,
  crateSleeve,
  teaCup,
  steam,
  koro,
  recordPlayer,
  hangingLamp,
  lampGlow,
  falling,
  fireflies,
  veil,
  polygonPath,
  ensoDial,
  clockLabel,
  washi,
  hanko,
  paragraph,
  vignette,
  cardFrame,
  knob,
  cardShell,
  CARD,
};
