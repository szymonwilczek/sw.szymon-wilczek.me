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
import { recordPlayer, DISC_LOOK, sleeve, crateSleeve, crate } from "./ink/engawa/records.js";
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

// veranda of old house
function sceneEngawa(tones, hour, mini, seasonKey, opts = {}) {
  const width = 1100,
    height = 640,
    light = hourLight(tones, hour, seasonKey, opts.sun),
    look = seasonLook(tones, seasonKey),
    groups = [],
    clips = [],
    randFor = (name) => rng(hash("terrace/engawa/" + name));
  const { mp: moonAt } = skyLayer(groups, tones, light, "engawa", width, 360);
  const far = newGroup(),
    rand = randFor("far");
  groups.push(far);
  ridge(
    far,
    rand,
    -20,
    width + 20,
    330,
    90,
    look.snow ? mix(light.far, SNOW, 0.35) : light.far,
    0.85,
  );
  ridge(
    far,
    rand,
    300,
    width + 20,
    365,
    55,
    look.snow ? mix(light.mid, SNOW, 0.3) : light.mid,
    0.9,
    tones.inkSoft,
  );
  mist(
    far,
    rand,
    260,
    1000,
    352,
    22,
    mix(light.low, tones.paper, 0.4),
    0.35 + 0.4 * (light.hc < 9 ? 1 : 0),
  );

  const gardenWash = newGroup({ still: true }),
    gardenGround = newGroup(),
    garden = newGroup({ still: true }),
    gardenRand = randFor("garden");
  groups.push(gardenWash, gardenGround, garden);
  addSolid(
    gardenGround,
    wobblyBox(gardenRand, -20, 362, width + 20, height + 20, 3),
    mix(look.ground, light.low, 0.08),
    1,
  );
  const mounds = [
    [880, 398, 64, 24],
    [1070, 432, 80, 30],
    [640, 468, 56, 22],
    [700, 452, 40, 18],
  ];
  mounds.forEach(([x, y, rx, ry]) => {
    inked(
      garden,
      gardenRand,
      smooth(
        [
          [x - rx, y + 4],
          [x - rx * 0.7, y - ry * 0.8],
          [x, y - ry],
          [x + rx * 0.75, y - ry * 0.7],
          [x + rx, y + 4],
        ],
        false,
      ) + " Z",
      look.mound,
      tones.ink,
      1.1,
    );
    for (let k = 0; k < 8; k++)
      addLine(
        garden,
        wobblySegment(
          gardenRand,
          [x + jitter(gardenRand, rx * 0.7), y - ry * 0.4 + jitter(gardenRand, ry * 0.3)],
          [x + jitter(gardenRand, rx * 0.7) + 4, y - ry * 0.4 + jitter(gardenRand, ry * 0.3) - 2],
          0.2,
          1,
        ),
        tones.ink,
        0.9,
        0.45,
        true,
      );
  });
  addWash(
    garden,
    gardenRand,
    mistPath(gardenRand, 560, 1120, 420, 60),
    look.snow ? tones.stone : tones.mossDk,
    look.snow ? 0.25 : 0.5,
    "url(#bk-bleed)",
  );
  addWash(
    garden,
    gardenRand,
    mistPath(gardenRand, 820, 1120, 520, 140),
    look.snow ? tones.stone : tones.mossDk,
    look.snow ? 0.2 : 0.45,
    "url(#bk-bleed)",
  );
  addLine(
    garden,
    wobblyLine(
      gardenRand,
      [
        [860, 395],
        [950, 430],
        [1010, 470],
        [1100, 520],
      ],
      1.5,
    ),
    tones.ink,
    1,
    0.35,
  );
  const steps = [
    [900, 440, 26, 10],
    [960, 474, 30, 11],
    [1030, 510, 34, 12],
  ];
  steps.forEach(([x, y, rx, ry]) => stone(garden, gardenRand, x, y, rx, ry, tones));

  // tree
  brushStroke(
    garden,
    gardenRand,
    [
      [985, 420],
      [978, 360],
      [990, 300],
      [970, 250],
    ],
    10,
    tones.ink,
    0.9,
    { head: 0.9, tip: 0.5 },
  );
  brushStroke(
    garden,
    gardenRand,
    [
      [982, 330],
      [1030, 300],
      [1070, 300],
    ],
    5,
    tones.ink,
    0.85,
    { tip: 0.3 },
  );
  brushStroke(
    garden,
    gardenRand,
    [
      [985, 290],
      [940, 262],
      [900, 262],
    ],
    4.5,
    tones.ink,
    0.85,
    { tip: 0.3 },
  );
  if (look.crown)
    maple(
      garden,
      gardenRand,
      985,
      270,
      look.s === "natsu" ? 125 : 115,
      look.s === "natsu" ? 260 : look.s === "haru" ? 210 : 170,
      Object.assign({}, tones, look.crown),
    );
  else {
    const ends = [
      [1070, 300],
      [900, 262],
      [970, 250],
      [1030, 302],
      [945, 264],
    ];
    ends.forEach(([x, y], i) => {
      for (let k = 0; k < 3; k++) {
        const angle = -Math.PI / 2 + (i % 2 ? 0.9 : -0.9) * (0.3 + gardenRand()),
          length = 26 + gardenRand() * 30;
        const end = [x + Math.cos(angle) * length, y + Math.sin(angle) * length];
        brushStroke(
          garden,
          gardenRand,
          [[x, y], [lerp(x, end[0], 0.5) + jitter(gardenRand, 4), lerp(y, end[1], 0.5)], end],
          2.2,
          tones.ink,
          0.85,
          { tip: 0.2 },
        );
        if (k === 0)
          snowCap(
            garden,
            gardenRand,
            [
              [lerp(x, end[0], 0.15), lerp(y, end[1], 0.15) - 2],
              [lerp(x, end[0], 0.6), lerp(y, end[1], 0.6) - 2],
            ],
            2.6,
          );
      }
    });
    snowCap(
      garden,
      gardenRand,
      [
        [990, 327],
        [1030, 297],
        [1068, 296],
      ],
      3.4,
    );
    snowCap(
      garden,
      gardenRand,
      [
        [978, 287],
        [940, 259],
        [904, 258],
      ],
      3.2,
    );
  }
  const lights = newGroup({ washO: 1 }),
    lightsRand = randFor("lights");
  lantern(garden, gardenRand, 820, 452, 0.62, tones, light.lamp > 0.5);
  if (look.snow) {
    mounds.forEach(([x, y, rx, ry]) =>
      snowCap(
        garden,
        gardenRand,
        [
          [x - rx * 0.8, y - ry * 0.35],
          [x - rx * 0.5, y - ry * 0.85],
          [x, y - ry - 1],
          [x + rx * 0.55, y - ry * 0.78],
          [x + rx * 0.8, y - ry * 0.3],
        ],
        ry * 0.5,
      ),
    );
    steps.forEach(([x, y, rx, ry]) =>
      snowCap(garden, gardenRand, arcTop(x, y - 1, rx * 0.85, ry * 0.9), ry * 0.55),
    );
    snowCap(
      garden,
      gardenRand,
      [
        [802, 404],
        [811, 399],
        [820, 391],
        [829, 399],
        [838, 404],
      ],
      5,
    );
  }
  [gardenWash.wash, garden.wash] = [garden.wash, []];
  const house = newGroup({ still: true }),
    houseRand = randFor("house");
  groups.push(house);
  const eaveY = (x) => lerp(70, 22, (x + 10) / 1120),
    beamY = (x) => lerp(108, 74, (x + 10) / 820);
  inked(
    house,
    houseRand,
    wobblyPolygon(
      houseRand,
      [
        [-10, -10],
        [width + 10, -10],
        [width + 10, eaveY(width + 10)],
        [-10, eaveY(-10)],
      ],
      1,
    ),
    mix(tones.woodDk, tones.ink, 0.25),
    tones.ink,
    1.4,
  );
  for (let x = 20; x < width; x += 38) {
    addLine(
      house,
      wobblySegment(houseRand, [x, eaveY(x) - 2], [x - 34, -10], 0.6, 2),
      tones.ink,
      2.2,
      0.6,
      true,
    );
    inked(
      house,
      houseRand,
      wobblyBox(houseRand, x - 4, eaveY(x) - 7, x + 4, eaveY(x) + 1, 0.4),
      tones.woodLt,
      tones.ink,
      0.8,
    );
  }
  if (look.snow) {
    snowCap(
      house,
      houseRand,
      [
        [-10, eaveY(-10) + 1],
        [360, eaveY(360) + 2],
        [740, eaveY(740) + 1],
        [width + 10, eaveY(width + 10) + 2],
      ],
      7,
    );
    for (let x = 40; x < width; x += 52 + houseRand() * 40) {
      const y = eaveY(x) + 3,
        length = 8 + houseRand() * 22;
      addSolid(
        house,
        wobblyPolygon(
          houseRand,
          [
            [x - 2.5, y],
            [x + 2.5, y],
            [x + 0.3, y + length],
          ],
          0.2,
        ),
        mix(SNOW, "#bcd0e2", 0.4),
        0.95,
      );
      addLine(
        house,
        wobblySegment(houseRand, [x - 2, y], [x, y + length], 0.1, 1),
        "#8fa3ba",
        0.6,
        0.6,
        true,
      );
    }
  }
  const floor = { A: [-10, 548], B: [835, 490], C: [912, height + 10], D: [-10, height + 10] },
    edgeY = (x) => lerp(548, 490, (x + 10) / 845);
  inked(
    house,
    houseRand,
    wobblyBox(houseRand, -10, beamY(-10) - 22, 140, 548, 0.8),
    tones.fusuma,
    tones.ink,
    1.2,
  );
  for (let y = beamY(-10); y < 548; y += 46)
    addLine(
      house,
      wobblySegment(houseRand, [-10, y], [140, y - 6], 0.4, 2),
      tones.woodDk,
      0.9,
      0.7,
      true,
    );
  for (let x = 18; x < 140; x += 34)
    addLine(
      house,
      wobblySegment(houseRand, [x, beamY(x) - 18], [x, 546], 0.4, 3),
      tones.woodDk,
      0.9,
      0.7,
      true,
    );
  if (light.lamp > 0.05)
    addSolid(
      lights,
      wobblyBox(lightsRand, -8, beamY(-10) - 18, 136, 544, 0.6),
      tones.glow,
      0.5 * light.lamp,
    );
  inked(
    house,
    houseRand,
    wobblyPolygon(
      houseRand,
      [
        [-10, beamY(-10) - 14],
        [840, beamY(840) - 12],
        [840, beamY(840) + 4],
        [-10, beamY(-10) + 6],
      ],
      0.6,
    ),
    tones.wood,
    tones.ink,
    1.3,
  );
  [
    [150, 26],
    [790, 16],
  ].forEach(([x, span]) =>
    inked(
      house,
      houseRand,
      wobblyBox(houseRand, x - span / 2, beamY(x) - 10, x + span / 2, edgeY(x) + 4, 0.6),
      x < 400 ? tones.wood : mix(tones.wood, tones.ink, 0.1),
      tones.ink,
      1.4,
    ),
  );
  // reed blind
  const blindLeft = 168,
    blindRight = 470,
    blindBottom = look.blind || beamY(blindLeft) + 20;
  if (look.blind) {
    addWash(
      house,
      houseRand,
      wobblyPolygon(
        houseRand,
        [
          [blindLeft, beamY(blindLeft) + 4],
          [blindRight, beamY(blindRight) + 4],
          [blindRight, blindBottom - 6],
          [blindLeft, blindBottom - 2],
        ],
        0.6,
      ),
      tones.bamboo,
      0.55,
    );
    for (let y = 0; y < blindBottom - beamY(blindLeft) - 6; y += 4.5)
      addLine(
        house,
        wobblySegment(
          houseRand,
          [blindLeft, beamY(blindLeft) + 6 + y],
          [blindRight, beamY(blindRight) + 6 + y],
          0.3,
          3,
        ),
        mix(tones.bamboo, tones.ink, 0.35),
        0.6,
        0.5,
        true,
      );
  }
  inked(
    house,
    houseRand,
    wobblyPolygon(
      houseRand,
      [
        [blindLeft - 4, blindBottom - 8],
        [blindRight + 4, blindBottom - 12],
        [blindRight + 4, blindBottom + 6],
        [blindLeft - 4, blindBottom + 10],
      ],
      0.8,
    ),
    tones.bamboo,
    tones.ink,
    1.2,
  );
  [240, 400].forEach((x) => cordTie(house, houseRand, x, blindBottom - 1, 0.6, tones));
  // wind chime
  const chimeX = 610,
    chimeY = beamY(chimeX);
  if (look.chime) {
    const chime = newGroup({
        anim: mini ? "none" : "sway 4.5s ease-in-out infinite",
        to: `${chimeX}px ${chimeY}px`,
      }),
      chimeRand = randFor("chime");
    groups.push(chime);
    addLine(
      chime,
      wobblySegment(chimeRand, [chimeX, chimeY], [chimeX, chimeY + 52], 0.3, 2),
      tones.ink,
      0.8,
      0.8,
      true,
    );
    inked(
      chime,
      chimeRand,
      smooth(
        [
          [chimeX - 15, chimeY + 70],
          [chimeX - 13, chimeY + 56],
          [chimeX, chimeY + 50],
          [chimeX + 13, chimeY + 56],
          [chimeX + 15, chimeY + 70],
        ],
        false,
      ) + " Z",
      mix(tones.mountLt, tones.paper, 0.4),
      tones.ink,
      1.1,
    );
    addLine(
      chime,
      wobblySegment(chimeRand, [chimeX, chimeY + 62], [chimeX, chimeY + 92], 0.3, 2),
      tones.ink,
      0.7,
      0.8,
      true,
    );
    inked(
      chime,
      chimeRand,
      wobblyBox(chimeRand, chimeX - 7, chimeY + 92, chimeX + 7, chimeY + 140, 0.4),
      tones.paper,
      tones.ink,
      0.9,
    );
    addText(chime, {
      t: look.chime,
      tr: `translate(${chimeX} ${chimeY + 114})`,
      fs: 12,
      font: "'Yuji Syuku', serif",
      fill: tones.red,
      o: 0.9,
    });
  } else
    inked(
      house,
      houseRand,
      wobblyBox(houseRand, chimeX - 3, chimeY - 2, chimeX + 3, chimeY + 5, 0.2),
      tones.iron,
      tones.ink,
      0.8,
    );
  // floor
  const floorGroup = newGroup(),
    floorRand = randFor("floor");
  groups.push(floorGroup);
  const boardMap = quadMap(floor.A, floor.B, floor.C, floor.D);
  slab(
    floorGroup,
    floorRand,
    wobblyPolygon(floorRand, [floor.A, floor.B, floor.C, floor.D], 1),
    tones.woodLt,
    tones,
  );
  for (let k = 1; k < 9; k++) {
    const depth = Math.pow(k / 9, 1.3);
    addLine(
      floorGroup,
      wobblyLine(floorRand, [boardMap(0, depth), boardMap(0.5, depth), boardMap(1, depth)], 0.6),
      tones.woodDk,
      0.9,
      0.6,
      true,
    );
  }
  for (let k = 0; k < 7; k++) {
    const across = floorRand(),
      band = Math.floor(floorRand() * 8) / 9;
    const from = boardMap(across, Math.pow(band, 1.3)),
      to = boardMap(across + 0.01, Math.pow(band + 1 / 9, 1.3));
    addLine(floorGroup, wobblySegment(floorRand, from, to, 0.3, 1), tones.woodDk, 0.8, 0.55, true);
  }
  addLine(
    floorGroup,
    wobblyLine(floorRand, [floor.A, boardMap(0.5, 0), floor.B], 0.6),
    tones.ink,
    2.4,
    0.9,
  );
  const reach = light.up ? lerp(0.85, 0.15, light.alt) : 0;
  addSolid(
    floorGroup,
    wobblyPolygon(
      floorRand,
      [boardMap(0, reach), boardMap(1, reach), boardMap(1, 1.02), boardMap(0, 1.02)],
      1,
    ),
    tones.ink,
    0.13 * (1 - light.night),
  );
  if (light.up)
    addWash(
      floorGroup,
      floorRand,
      wobblyPolygon(
        floorRand,
        [boardMap(0, 0.01), boardMap(1, 0.01), boardMap(1, reach), boardMap(0, reach)],
        1,
      ),
      mix(light.sunC, tones.paper, 0.4),
      0.35 * (0.4 + light.gold),
      "url(#bk-bleed)",
    );
  if (look.snow)
    snowCap(
      floorGroup,
      floorRand,
      [boardMap(0.62, 0.02), boardMap(0.8, 0.01), boardMap(0.99, 0.015), boardMap(1, 0.12)],
      4,
    );
  inked(
    floorGroup,
    floorRand,
    wobblyRing(floorRand, 960, 600, 46, 16, 2, 10),
    tones.stone,
    tones.ink,
    1.3,
  );
  if (look.snow) snowCap(floorGroup, floorRand, arcTop(960, 599, 40, 14), 6);
  [
    [940, 594],
    [968, 602],
  ].forEach(([x, y]) => {
    inked(
      floorGroup,
      floorRand,
      wobblyPolygon(
        floorRand,
        [
          [x - 9, y - 4],
          [x + 9, y - 6],
          [x + 11, y + 2],
          [x - 7, y + 4],
        ],
        0.4,
      ),
      tones.wood,
      tones.ink,
      1,
    );
    addLine(
      floorGroup,
      wobblyLine(
        floorRand,
        [
          [x - 5, y - 2],
          [x + 1, y - 5],
          [x + 6, y - 2],
        ],
        0.2,
      ),
      tones.red,
      1.4,
      0.95,
      true,
    );
  });
  // things on the boards
  const things = newGroup(),
    thingsRand = randFor("things");
  groups.push(things);
  if (light.up) {
    const shadowShift = Math.max(
      -260,
      Math.min(260, (150 - lerp(-80, width + 80, light.st)) * 0.5 * (1.2 - light.alt)),
    );
    addWash(
      things,
      thingsRand,
      wobblyPolygon(
        thingsRand,
        [
          [137, edgeY(137) + 2],
          [163, edgeY(163) + 2],
          [163 + shadowShift, edgeY(163) + 70 * (1 - light.alt) + 12],
          [137 + shadowShift, edgeY(137) + 70 * (1 - light.alt) + 16],
        ],
        1,
      ),
      tones.ink,
      0.22 * (1 - light.night),
      "url(#bk-bleed)",
    );
  }

  if (opts.lifted == null)
    sleeve(
      things,
      thingsRand,
      [
        [400, 600],
        [462, 592],
        [470, 630],
        [404, 638],
      ],
      tones,
      opts.disc ?? 0,
    );
  teaCup(groups, things, thingsRand, 360, 586, tones, mini);
  koro(groups, things, thingsRand, 424, 566, tones, mini, opts.burnt, opts.unlit);
  recordPlayer(things, thingsRand, 548, 548, 1, tones, light, opts.disc ?? 0);
  crate(groups, randFor("crate"), tones, opts.disc ?? 0, opts.lifted);

  // hung from the beam right of the player
  const lampX = 700,
    under = [lampX, edgeY(lampX)],
    cast = ([px, py], scale) => [px + (px - under[0]) * scale, py + (py - under[1]) * scale],
    shade = [
      cast([470, 550], 0.42),
      cast([482, 589], 0.1),
      cast([644, 566], 0.1),
      [644, 566],
      [616, 540],
      [470, 550],
    ],
    lampPool = newGroup({ washO: 1, clip: "url(#engawa-lamp-shade)" });
  clips.push({
    id: "engawa-lamp-shade",
    d: polygonPath([
      [-20, -20],
      [width + 20, -20],
      [width + 20, height + 20],
      [-20, height + 20],
      [-20, shade[0][1]],
      ...shade,
      shade[0],
      [-20, shade[0][1] + 0.5],
    ]),
  });
  hangingLamp(
    things,
    lights,
    lampPool,
    thingsRand,
    lampX,
    beamY(lampX),
    tones,
    opts.lamp ?? light.lamp,
    0.35 + 0.65 * light.night,
    boardMap,
    edgeY,
  );

  // what the season puts in the air, and what has come down on the boards
  if (look.fall) {
    const air = newGroup(),
      airRand = randFor("air/" + look.s);
    groups.push(air);
    const count = look.snow ? (mini ? 90 : 160) : mini ? 14 : 24;
    falling(
      air,
      airRand,
      look.s,
      look.fall,
      count,
      look.snow ? 0 : 560,
      width,
      look.snow ? 60 : 200,
      look.snow ? height : 560,
    );
    if (!look.snow) {
      falling(air, airRand, look.s, look.fall, 9, 560, 1100, 380, 560);
      for (let k = 0; k < 5; k++) {
        const [x, y] = boardMap(0.55 + airRand() * 0.4, 0.05 + airRand() * 0.35);
        falling(air, airRand, look.s, look.fall, 1, x, x + 2, y, y + 2);
      }
    }
  }
  if (light.lamp > 0.5) lampGlow(lights, lightsRand, 820, 410, 34, 26, tones, light.lamp);
  if (light.night > 0.4 && look.s === "natsu")
    fireflies(lights, lightsRand, 860, 1090, 380, 500, 9, light.night);
  veil(groups, width, height, light);
  groups.push(lampPool, lights);
  if (light.mUp && light.night > 0.3 && moonAt[0] > 860) {
    const moonGroup = newGroup({ washO: 1 });
    moonDisc(moonGroup, lightsRand, moonAt[0], moonAt[1], 17, 0.55, light, light.night * 0.9);
    groups.push(moonGroup);
  }
  if (!mini) ensoDial(groups, tones, light, 1050, 98, 32);
  return { W: width, H: height, groups, clips };
}

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
