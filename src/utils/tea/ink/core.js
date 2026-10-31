// colours, svg output, seeded randomness and the small maths every drawing shares

const SCENE_WIDTH = 1100;

const THEME_VARS = {
  paper: "var(--paper)",
  tape: "var(--tape)",
  leaf: "var(--leaf)",
  sea: "var(--sea)",
  fgMain: "var(--fg-main)",
  bgMain: "var(--bg-main)",
  red: "var(--red)",
  redWarmer: "var(--red-warmer)",
  accent0: "var(--accent-0)",
  cursor: "var(--cursor)",
  fgLink: "var(--fg-link)",
};
const mix = (from, into, amount) =>
  `color-mix(in oklab, ${from}, ${into} ${Math.round(amount * 100)}%)`;
const lightDark = (light, dark) => `light-dark(${light}, ${dark})`;

function toneMix(vars = THEME_VARS) {
  const wood = mix(vars.tape, vars.redWarmer, 0.38),
    plaster = mix(vars.tape, vars.paper, 0.45);
  return {
    ink: mix(vars.fgMain, vars.paper, 0.1),
    inkSoft: mix(vars.fgMain, vars.paper, 0.45),
    wood,
    woodDk: mix(wood, vars.fgMain, 0.35),
    woodLt: mix(wood, vars.paper, 0.4),
    plaster,
    plasterDk: mix(plaster, vars.fgMain, 0.1),
    fusuma: mix(vars.paper, vars.tape, 0.3),
    tatami: mix(vars.leaf, vars.tape, 0.5),
    heri: mix(vars.sea, vars.fgMain, 0.55),
    iron: mix(vars.fgMain, vars.sea, 0.3),
    deep: lightDark(mix(vars.fgMain, vars.bgMain, 0.2), mix(vars.bgMain, "#000", 0.5)),
    glow: mix(vars.cursor, vars.paper, 0.5),
    glowLine: lightDark(mix(vars.paper, vars.cursor, 0.2), mix(vars.fgMain, vars.cursor, 0.3)),
    mount: mix(vars.sea, vars.fgMain, 0.32),
    mountLt: mix(vars.sea, vars.paper, 0.35),
    cloth: mix(vars.sea, vars.fgMain, 0.4),
    gold: mix(vars.accent0, vars.paper, 0.25),
    bamboo: mix(vars.leaf, vars.accent0, 0.5),
    rope: mix(vars.tape, vars.fgMain, 0.35),
    fukusa: mix(vars.red, vars.paper, 0.4),
    pool: lightDark(mix(vars.paper, vars.fgMain, 0.14), mix(vars.paper, vars.fgMain, 0.3)),
    fibre: mix(vars.fgMain, vars.tape, 0.55),
    paper: vars.paper,
    red: vars.red,
    silk: { A: vars.fgLink, B: vars.red },
    stone: mix(vars.fgMain, vars.paper, 0.62),
    stoneDk: mix(vars.fgMain, vars.paper, 0.38),
    moss: mix(vars.leaf, vars.paper, 0.35),
    mossDk: mix(vars.leaf, vars.fgMain, 0.25),
    earth: mix(vars.tape, vars.redWarmer, 0.18),
    thatch: mix(vars.tape, vars.leaf, 0.22),
    thatchDk: mix(mix(vars.tape, vars.leaf, 0.22), vars.fgMain, 0.45),
    maple: mix(vars.red, vars.redWarmer, 0.35),
    lacquer: lightDark(mix(vars.fgMain, vars.red, 0.12), mix(vars.fgMain, vars.red, 0.25)),
    brass: mix(vars.accent0, vars.tape, 0.35),
    kura: lightDark(mix(vars.paper, vars.fgMain, 0.04), mix(vars.paper, vars.fgMain, 0.12)),
    water: mix(vars.sea, vars.fgMain, 0.5),
    glowSoft: mix(vars.paper, vars.accent0, 0.16),
    mistC: mix(vars.paper, vars.bgMain, 0.4),
    cord: mix(vars.fgMain, vars.red, 0.15),
  };
}

const TONES = toneMix();
const toneVars = () =>
  Object.fromEntries(
    Object.entries(TONES).map(([key, value]) => [
      key,
      typeof value === "string"
        ? `var(--tk-${key})`
        : Object.fromEntries(
            Object.keys(value).map((shade) => [shade, `var(--tk-${key}${shade})`]),
          ),
    ]),
  );
const TONE_CSS = Object.entries(TONES)
  .flatMap(([key, value]) =>
    typeof value === "string"
      ? [[key, value]]
      : Object.entries(value).map(([shade, color]) => [key + shade, color]),
  )
  .map(([key, value]) => `--tk-${key}: ${value};`)
  .join(" ");

const FILTERS = `<filter id="bk-tremble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter><filter id="bk-wash" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="5"/><feDisplacementMap in="SourceGraphic" scale="6"/><feGaussianBlur stdDeviation="0.9"/></filter><filter id="bk-bleed" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="11"/><feGaussianBlur stdDeviation="1.6"/></filter><filter id="bk-pool" x="-30%" y="-80%" width="160%" height="260%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="14"/><feGaussianBlur stdDeviation="4"/></filter>`;

const escapeXml = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function groupSvg(group, attrs = "") {
  if (group.groups)
    return `<g class="${group.cls}"${attrs}>${group.groups.map((child) => groupSvg(child)).join("")}</g>`;
  if (group.cls) attrs += ` class="${group.cls}"`;

  // the same at every hour: a page may keep it apart from what the hour redraws
  if (group.still) attrs += " data-still";
  const style = [
    group.tf !== "none" && `transform:${group.tf}`,
    group.to !== "0px 0px" && `transform-origin:${group.to}`,
    group.anim !== "none" && `animation:${group.anim}`,
    group.op !== 1 && `opacity:${group.op}`,
    group.vars,
  ]
    .filter(Boolean)
    .join(";");
  const wash = group.wash
    .map(
      (part) =>
        `<path d="${part.d}" fill="${part.fill}" opacity="${part.o}" fill-rule="evenodd" transform="${part.t}" filter="${part.f}"/>`,
    )
    .join("");
  const solid = group.solid
    .map(
      (part) =>
        `<path d="${part.d}" fill="${part.fill}" opacity="${part.o}" fill-rule="evenodd"${part.f ? ` filter="${part.f}"` : ""}/>`,
    )
    .join("");
  const line = group.line
    .map(
      (part) =>
        `<path d="${part.d}" fill="none" stroke="${part.c}" stroke-width="${part.w}" opacity="${part.o}" stroke-linecap="round" stroke-linejoin="round"${part.f ? ` filter="${part.f}"` : ""}/>`,
    )
    .join("");
  const text = group.text
    .map(
      (part) =>
        `<text transform="${part.tr}" font-size="${part.fs}" fill="${part.fill}" opacity="${part.o}" text-anchor="${part.an || "middle"}" dominant-baseline="central" style="font-family:${part.font};writing-mode:${part.wm};letter-spacing:${part.ls}">${escapeXml(part.t)}</text>`,
    )
    .join("");
  return `<g${attrs}${group.clip ? ` clip-path="${group.clip}"` : ""}${style ? ` style="${style}"` : ""}>${group.defs || ""}${wash ? `<g opacity="${group.washO}">${wash}</g>` : ""}${solid}${line}${text}</g>`;
}

function toSvg(scene, filters = false) {
  const clips = (scene.clips || [])
    .map((clip) => `<clipPath id="${clip.id}"><path d="${clip.d}"/></clipPath>`)
    .join("");
  const defs = (filters ? FILTERS : "") + clips;
  return (
    (defs ? `<defs>${defs}</defs>` : "") + scene.groups.map((group) => groupSvg(group)).join("")
  );
}

function hash(text) {
  let acc = 2166136261;
  for (const char of text) {
    acc ^= char.charCodeAt(0);
    acc = Math.imul(acc, 16777619);
  }
  return acc >>> 0;
}

function rng(seed) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

let PRECISION = 1;
const setPrecision = (precision) => (PRECISION = precision);
const roundCoord = (value) => Math.round(value * PRECISION) / PRECISION;
const lerp = (a, b, t) => a + (b - a) * t;
function smooth(points, closed) {
  const padded = closed
    ? [points[points.length - 1], ...points, points[0], points[1]]
    : [points[0], ...points, points[points.length - 1]];
  let path = `M${roundCoord(padded[1][0])} ${roundCoord(padded[1][1])}`;
  for (let i = 1; i < padded.length - 2; i++) {
    const [x0, y0] = padded[i - 1],
      [x1, y1] = padded[i],
      [x2, y2] = padded[i + 1],
      [x3, y3] = padded[i + 2];
    path += ` C${roundCoord(x1 + (x2 - x0) / 6)} ${roundCoord(y1 + (y2 - y0) / 6)} ${roundCoord(x2 - (x3 - x1) / 6)} ${roundCoord(y2 - (y3 - y1) / 6)} ${roundCoord(x2)} ${roundCoord(y2)}`;
  }
  return closed ? path + " Z" : path;
}

export {
  SCENE_WIDTH,
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
};
