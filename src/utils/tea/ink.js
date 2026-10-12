const C = {
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
const mix = (a, b, t) => `color-mix(in oklab, ${a}, ${b} ${Math.round(t * 100)}%)`;
const dk = (light, dark) => `light-dark(${light}, ${dark})`;

function toneMix(c = C) {
  const wood = mix(c.tape, c.redWarmer, 0.38),
    plaster = mix(c.tape, c.paper, 0.45);
  return {
    ink: mix(c.fgMain, c.paper, 0.1),
    inkSoft: mix(c.fgMain, c.paper, 0.45),
    wood,
    woodDk: mix(wood, c.fgMain, 0.35),
    woodLt: mix(wood, c.paper, 0.4),
    plaster,
    plasterDk: mix(plaster, c.fgMain, 0.1),
    fusuma: mix(c.paper, c.tape, 0.3),
    tatami: mix(c.leaf, c.tape, 0.5),
    heri: mix(c.sea, c.fgMain, 0.55),
    iron: mix(c.fgMain, c.sea, 0.3),
    deep: dk(mix(c.fgMain, c.bgMain, 0.2), mix(c.bgMain, "#000", 0.5)),
    glow: mix(c.cursor, c.paper, 0.5),
    glowLine: dk(mix(c.paper, c.cursor, 0.2), mix(c.fgMain, c.cursor, 0.3)),
    mount: mix(c.sea, c.fgMain, 0.32),
    mountLt: mix(c.sea, c.paper, 0.35),
    cloth: mix(c.sea, c.fgMain, 0.4),
    gold: mix(c.accent0, c.paper, 0.25),
    bamboo: mix(c.leaf, c.accent0, 0.5),
    rope: mix(c.tape, c.fgMain, 0.35),
    fukusa: mix(c.red, c.paper, 0.4),
    pool: dk(mix(c.paper, c.fgMain, 0.14), mix(c.paper, c.fgMain, 0.3)),
    fibre: mix(c.fgMain, c.tape, 0.55),
    paper: c.paper,
    red: c.red,
    silk: { A: c.fgLink, B: c.red },
    stone: mix(c.fgMain, c.paper, 0.62),
    stoneDk: mix(c.fgMain, c.paper, 0.38),
    moss: mix(c.leaf, c.paper, 0.35),
    mossDk: mix(c.leaf, c.fgMain, 0.25),
    earth: mix(c.tape, c.redWarmer, 0.18),
    thatch: mix(c.tape, c.leaf, 0.22),
    thatchDk: mix(mix(c.tape, c.leaf, 0.22), c.fgMain, 0.45),
    maple: mix(c.red, c.redWarmer, 0.35),
    lacquer: dk(mix(c.fgMain, c.red, 0.12), mix(c.fgMain, c.red, 0.25)),
    brass: mix(c.accent0, c.tape, 0.35),
    kura: dk(mix(c.paper, c.fgMain, 0.04), mix(c.paper, c.fgMain, 0.12)),
    water: mix(c.sea, c.fgMain, 0.5),
    glowSoft: mix(c.paper, c.accent0, 0.16),
    mistC: mix(c.paper, c.bgMain, 0.4),
    cord: mix(c.fgMain, c.red, 0.15),
  };
}

const TONES = toneMix();
const tones2 = () =>
  Object.fromEntries(
    Object.entries(TONES).map(([k, v]) => [
      k,
      typeof v === "string"
        ? `var(--tk-${k})`
        : Object.fromEntries(Object.keys(v).map((s) => [s, `var(--tk-${k}${s})`])),
    ]),
  );
const TONE_CSS = Object.entries(TONES)
  .flatMap(([k, v]) =>
    typeof v === "string" ? [[k, v]] : Object.entries(v).map(([s, x]) => [k + s, x]),
  )
  .map(([k, v]) => `--tk-${k}: ${v};`)
  .join(" ");

const FILTERS = `<filter id="bk-tremble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter><filter id="bk-wash" x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="5"/><feDisplacementMap in="SourceGraphic" scale="6"/><feGaussianBlur stdDeviation="0.9"/></filter><filter id="bk-bleed" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="9"/><feDisplacementMap in="SourceGraphic" scale="11"/><feGaussianBlur stdDeviation="1.6"/></filter><filter id="bk-pool" x="-30%" y="-80%" width="160%" height="260%"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="14"/><feGaussianBlur stdDeviation="4"/></filter>`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function groupSvg(g, attrs = "") {
  if (g.groups)
    return `<g class="${g.cls}"${attrs}>${g.groups.map((x) => groupSvg(x)).join("")}</g>`;
  if (g.cls) attrs += ` class="${g.cls}"`;

  // the same at every hour: a page may keep it apart from what the hour redraws
  if (g.still) attrs += " data-still";
  const style = [
    g.tf !== "none" && `transform:${g.tf}`,
    g.to !== "0px 0px" && `transform-origin:${g.to}`,
    g.anim !== "none" && `animation:${g.anim}`,
    g.op !== 1 && `opacity:${g.op}`,
    g.vars,
  ]
    .filter(Boolean)
    .join(";");
  const wash = g.wash
    .map(
      (w) =>
        `<path d="${w.d}" fill="${w.fill}" opacity="${w.o}" fill-rule="evenodd" transform="${w.t}" filter="${w.f}"/>`,
    )
    .join("");
  const solid = g.solid
    .map(
      (s) =>
        `<path d="${s.d}" fill="${s.fill}" opacity="${s.o}" fill-rule="evenodd"${s.f ? ` filter="${s.f}"` : ""}/>`,
    )
    .join("");
  const line = g.line
    .map(
      (l) =>
        `<path d="${l.d}" fill="none" stroke="${l.c}" stroke-width="${l.w}" opacity="${l.o}" stroke-linecap="round" stroke-linejoin="round"${l.f ? ` filter="${l.f}"` : ""}/>`,
    )
    .join("");
  const text = g.text
    .map(
      (t) =>
        `<text transform="${t.tr}" font-size="${t.fs}" fill="${t.fill}" opacity="${t.o}" text-anchor="${t.an || "middle"}" dominant-baseline="central" style="font-family:${t.font};writing-mode:${t.wm};letter-spacing:${t.ls}">${esc(t.t)}</text>`,
    )
    .join("");
  return `<g${attrs}${g.clip ? ` clip-path="${g.clip}"` : ""}${style ? ` style="${style}"` : ""}>${wash ? `<g opacity="${g.washO}">${wash}</g>` : ""}${solid}${line}${text}</g>`;
}

function toSvg(out, filters = false) {
  const clips = (out.clips || [])
    .map((c) => `<clipPath id="${c.id}"><path d="${c.d}"/></clipPath>`)
    .join("");
  const defs = (filters ? FILTERS : "") + clips;
  return (defs ? `<defs>${defs}</defs>` : "") + out.groups.map((g) => groupSvg(g)).join("");
}

function hash(s) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let PREC = 1;
const setPrec = (p) => (PREC = p);
const f1 = (n) => Math.round(n * PREC) / PREC;
const lerp = (a, b, t) => a + (b - a) * t;
function smooth(pts, closed) {
  const p = closed
    ? [pts[pts.length - 1], ...pts, pts[0], pts[1]]
    : [pts[0], ...pts, pts[pts.length - 1]];
  let d = `M${f1(p[1][0])} ${f1(p[1][1])}`;
  for (let i = 1; i < p.length - 2; i++) {
    const [x0, y0] = p[i - 1],
      [x1, y1] = p[i],
      [x2, y2] = p[i + 1],
      [x3, y3] = p[i + 2];
    d += ` C${f1(x1 + (x2 - x0) / 6)} ${f1(y1 + (y2 - y0) / 6)} ${f1(x2 - (x3 - x1) / 6)} ${f1(y2 - (y3 - y1) / 6)} ${f1(x2)} ${f1(y2)}`;
  }
  return closed ? d + " Z" : d;
}

const poly = (pts) => "M" + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(" L") + " Z";
// ink kit
const TREM = "url(#bk-tremble)";
const WASH = "url(#bk-wash)";
const J = (r, a) => (r() - 0.5) * 2 * a;
function wpoly(r, pts, j) {
  const p = pts.map(([x, y]) => [x + J(r, j * 0.5), y + J(r, j * 0.5)]);
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < p.length; i++) {
    const a = p[i],
      b = p[(i + 1) % p.length];
    d += ` Q${f1((a[0] + b[0]) / 2 + J(r, j))} ${f1((a[1] + b[1]) / 2 + J(r, j))} ${f1(b[0])} ${f1(b[1])}`;
  }
  return d + " Z";
}

const wbox = (r, x0, y0, x1, y1, j) =>
  wpoly(
    r,
    [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1],
    ],
    j,
  );

const wline = (r, pts, j) =>
  smooth(
    pts.map(([x, y]) => [x + J(r, j), y + J(r, j)]),
    false,
  );

const wseg = (r, a, b, j, n) =>
  wline(
    r,
    Array.from({ length: (n || 3) + 1 }, (_, i) => [
      lerp(a[0], b[0], i / (n || 3)),
      lerp(a[1], b[1], i / (n || 3)),
    ]),
    j,
  );

const wring = (r, cx, cy, rx, ry, j, n) =>
  smooth(
    Array.from({ length: n || 12 }, (_, i) => {
      const a = (i / (n || 12)) * Math.PI * 2;
      return [cx + Math.cos(a) * (rx + J(r, j)), cy + Math.sin(a) * (ry + J(r, j))];
    }),
    true,
  );

function G(o) {
  return Object.assign(
    {
      tf: "none",
      tr: "none",
      to: "0px 0px",
      op: 1,
      anim: "none",
      vars: "",
      clip: "",
      washO: 0.58,
      wash: [],
      solid: [],
      line: [],
      text: [],
    },
    o || {},
  );
}

function Wa(g, r, d, fill, o, f) {
  g.wash.push({
    d,
    fill,
    o: o ?? 1,
    f: f || WASH,
    t: `translate(${f1(1 + r() * 2)} ${f1(0.8 + r() * 1.8)})`,
  });
}

function Ln(g, d, c, w, o, plain) {
  g.line.push({ d, c, w: w ?? 1.3, o: o ?? 1, f: plain ? "" : TREM });
}

function So(g, d, fill, o, f) {
  g.solid.push({ d, fill, o: o ?? 1, f: f || "" });
}

function Tx(g, o) {
  g.text.push(
    Object.assign(
      {
        tr: "",
        fs: 14,
        font: "Kalam, cursive",
        fill: "#000",
        o: 1,
        wm: "horizontal-tb",
        ls: "0",
        an: "middle",
      },
      o,
    ),
  );
}

function inked(g, r, d, fill, ink, w) {
  Wa(g, r, d, fill);
  Ln(g, d, ink, w ?? 1.3);
}

const quadMap = (a, b, c2, d) => (s, t) => {
  const tx = lerp(a[0], b[0], s),
    ty = lerp(a[1], b[1], s),
    bx = lerp(d[0], c2[0], s),
    by = lerp(d[1], c2[1], s);
  return [lerp(tx, bx, t), lerp(ty, by, t)];
};

// brush stroke
function brushD(r, pts, w, o) {
  o = o || {};
  const P = [];
  for (let i = 0; i < pts.length - 1; i++)
    for (let k = 0; k < 4; k++)
      P.push([lerp(pts[i][0], pts[i + 1][0], k / 4), lerp(pts[i][1], pts[i + 1][1], k / 4)]);
  P.push(pts[pts.length - 1]);
  const n = P.length,
    L = [],
    R = [],
    ta = o.tailAt ?? 0.7,
    tip = o.tip ?? 0.1;
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)],
      b = P[Math.min(n - 1, i + 1)],
      l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l,
      ny = (b[0] - a[0]) / l,
      t = i / (n - 1);
    const head = o.blunt ? 1 : Math.min(1, (o.head ?? 0.4) + t * 5);
    const tail = t > ta ? lerp(1, tip, (t - ta) / (1 - ta)) : 1;
    const ww = (w * head * tail * (0.86 + 0.28 * r())) / 2;
    L.push([P[i][0] + nx * ww, P[i][1] + ny * ww]);
    R.push([P[i][0] - nx * ww, P[i][1] - ny * ww]);
  }
  return smooth(L.concat(R.reverse()), true);
}
function Br(g, r, pts, w, color, op, o) {
  So(g, brushD(r, pts, w, o), color, op ?? 0.92, TREM);
}
function BrW(g, r, pts, w, color, op, o) {
  Wa(g, r, brushD(r, pts, w, o), color, op ?? 0.8, "url(#bk-bleed)");
}
function dry(g, r, pts, w, color, op) {
  for (let k = 0; k < 5; k++) {
    const off = (k / 4 - 0.5) * w;
    const q = pts.map(([x, y], i) => {
      const a = pts[Math.max(0, i - 1)],
        b = pts[Math.min(pts.length - 1, i + 1)],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [x - ((b[1] - a[1]) / l) * off, y + ((b[0] - a[0]) / l) * off];
    });
    const cut = Math.floor(q.length * (0.55 + r() * 0.45));
    Ln(
      g,
      wline(r, q.slice(0, Math.max(2, cut)), 0.4),
      color,
      0.6 + r() * 0.9,
      (op ?? 0.8) * (0.5 + r() * 0.5),
      true,
    );
  }
}
// band of mist
function mistD(r, x0, x1, y, h) {
  const n = 22,
    pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2,
      c = Math.cos(a),
      s = Math.sin(a);
    pts.push([
      (x0 + x1) / 2 + (c * (x1 - x0)) / 2 + J(r, 6),
      y + s * (h / 2) * (0.7 + 0.3 * Math.abs(c)) + J(r, h * 0.12),
    ]);
  }
  return smooth(pts, true);
}
function mist(g, r, x0, x1, y, h, fill, op, edge) {
  Wa(g, r, mistD(r, x0, x1, y, h), fill, op ?? 0.8, "url(#bk-bleed)");
  if (edge) Ln(g, mistD(r, x0 + 4, x1 - 4, y, h * 0.92), edge, 0.9, 0.55);
}
const OB = (ox, oy, kx, ky) => (x, z, y) => [
  ox + x + z * (kx ?? 0.6),
  oy - z * (ky ?? 0.42) - (y || 0),
];
const quad = (P, pts) => pts.map(([x, z, y]) => P(x, z, y));
function stone(g, r, cx, cy, rx, ry, K, op) {
  const d = wring(r, cx, cy, rx, ry, Math.min(rx, ry) * 0.12, 10);
  Wa(g, r, d, K.stone, op ?? 0.95);
  Wa(
    g,
    r,
    wring(r, cx + rx * 0.15, cy + ry * 0.3, rx * 0.75, ry * 0.5, 0.6, 8),
    K.stoneDk,
    0.4,
    "url(#bk-bleed)",
  );
  const top = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * (1.05 + (i / 6) * 0.95);
    top.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  Ln(g, wline(r, top, 0.6), K.ink, 1.2, 0.8);
}
function steppingStones(g, r, pts, K, sz) {
  pts.forEach(([x, y], i) => {
    const s = (sz || 1) * (0.85 + r() * 0.35);
    stone(g, r, x, y, 22 * s, 9 * s, K);
  });
}
function maple(g, r, cx, cy, rad, n, K) {
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2,
      d = Math.sqrt(r()) * rad,
      x = cx + Math.cos(a) * d,
      y = cy + Math.sin(a) * d * 0.6;
    So(
      g,
      wring(r, x, y, 2.4 + r() * 3, 2 + r() * 2.4, 0.5, 6),
      r() < 0.25 ? K.redWarmer || K.maple : K.maple,
      0.4 + r() * 0.45,
      "url(#bk-bleed)",
    );
  }
}
function lantern(g, r, x, yb, s, K, lit) {
  const S = (v) => v * s;
  Wa(g, r, wring(r, x + S(8), yb + S(3), S(34), S(7), 1, 10), K.pool, 0.7, "url(#bk-pool)");
  inked(
    g,
    r,
    wpoly(
      r,
      [
        [x - S(20), yb],
        [x + S(20), yb],
        [x + S(15), yb - S(10)],
        [x - S(15), yb - S(10)],
      ],
      0.8,
    ),
    K.stone,
    K.ink,
    1.2,
  );
  inked(g, r, wbox(r, x - S(6), yb - S(48), x + S(6), yb - S(10), 0.6), K.stone, K.ink, 1.1);
  inked(
    g,
    r,
    wpoly(
      r,
      [
        [x - S(17), yb - S(48)],
        [x + S(17), yb - S(48)],
        [x + S(13), yb - S(56)],
        [x - S(13), yb - S(56)],
      ],
      0.6,
    ),
    K.stone,
    K.ink,
    1.1,
  );
  inked(g, r, wbox(r, x - S(13), yb - S(80), x + S(13), yb - S(56), 0.6), K.stone, K.ink, 1.2);
  So(
    g,
    wbox(r, x - S(7), yb - S(76), x + S(7), yb - S(60), 0.4),
    lit ? K.glow : K.deep,
    lit ? 0.9 : 0.85,
  );
  if (lit) Wa(g, r, wring(r, x, yb - S(68), S(22), S(18), 1, 10), K.glowSoft, 0.5, "url(#bk-pool)");
  inked(
    g,
    r,
    smooth(
      [
        [x - S(30), yb - S(78)],
        [x - S(14), yb - S(86)],
        [x, yb - S(98)],
        [x + S(14), yb - S(86)],
        [x + S(30), yb - S(78)],
        [x + S(26), yb - S(82)],
        [x, yb - S(90)],
        [x - S(26), yb - S(82)],
      ],
      true,
    ),
    K.stone,
    K.ink,
    1.3,
  );
  inked(g, r, wring(r, x, yb - S(104), S(5), S(6), 0.4, 8), K.stone, K.ink, 1);
  So(g, wring(r, x - S(14), yb - S(84), S(9), S(3), 0.6, 8), K.moss, 0.6, "url(#bk-bleed)");
}
function thatchStrokes(g, r, P0, P1, Q0, Q1, n, K) {
  // strokes run from the ridge edge
  for (let i = 0; i < n; i++) {
    const f = (i + r() * 0.8) / n,
      a = [lerp(P0[0], P1[0], f), lerp(P0[1], P1[1], f)],
      b = [lerp(Q0[0], Q1[0], f), lerp(Q0[1], Q1[1], f)];
    const s = r() * 0.3,
      e = 0.55 + r() * 0.45;
    Ln(
      g,
      wseg(
        r,
        [lerp(a[0], b[0], s), lerp(a[1], b[1], s)],
        [lerp(a[0], b[0], e), lerp(a[1], b[1], e)],
        0.6,
        2,
      ),
      i % 3 ? K.thatchDk : K.ink,
      0.7,
      0.35 + r() * 0.3,
      true,
    );
  }
}
function cordTie(g, r, x, y, s, K) {
  const S = (v) => v * s;
  Ln(
    g,
    wline(
      r,
      [
        [x - S(14), y - S(6)],
        [x - S(4), y],
        [x + S(8), y - S(5)],
        [x + S(14), y + S(2)],
      ],
      0.4,
    ),
    K.ink,
    S(3.4),
    0.9,
    true,
  );
  Ln(
    g,
    wline(
      r,
      [
        [x - S(14), y - S(6)],
        [x - S(4), y],
        [x + S(8), y - S(5)],
        [x + S(14), y + S(2)],
      ],
      0.4,
    ),
    K.red,
    S(2),
    1,
    true,
  );
  [
    [-1, 1],
    [1, 1],
  ].forEach(([sx]) => {
    Ln(
      g,
      wline(
        r,
        [
          [x, y],
          [x + sx * S(5), y + S(9)],
          [x + sx * S(3), y + S(18)],
        ],
        0.4,
      ),
      K.red,
      S(1.8),
      0.95,
      true,
    );
  });
  inked(g, r, wring(r, x, y + S(1), S(3.4), S(3), 0.2, 6), K.red, K.ink, 0.8);
}
function steam(groups, r, x, y, K, n) {
  for (let k = 0; k < (n || 3); k++) {
    const g = G({
      anim: `steam ${5 + k * 1.3}s ease-in-out ${-k * 1.7}s infinite`,
      to: `${x}px ${y}px`,
      washO: 0.5,
    });
    const sx = x + J(r, 6);
    Ln(
      g,
      wline(
        r,
        [
          [sx, y],
          [sx - 7, y - 18],
          [sx + 5, y - 38],
          [sx - 4, y - 58],
          [sx + 6, y - 78],
        ],
        1.5,
      ),
      K.inkSoft,
      1.6,
      0.5,
    );
    groups.push(g);
  }
}
// shared pieces of architecture
function face(g, r, P, pts, fill, K, w, j) {
  const d = wpoly(r, quad(P, pts), j ?? 0.8);
  So(g, d, mix(fill, K.paper, 0.25), 1);
  inked(g, r, d, fill, K.ink, w ?? 1.2);
}
function postV(g, r, P, x, z, y0, y1, K, w) {
  Ln(g, wseg(r, P(x, z, y0), P(x, z, y1), 0.5, 3), K.woodDk, w ?? 4.5, 0.9, true);
  Ln(g, wseg(r, P(x, z, y0), P(x, z, y1), 0.5, 3), K.ink, 1, 0.8);
}
function gableRoof(g, r, P, X, Z, Hh, RH, ov, K, kind) {
  const e = Hh - 4,
    top = Hh + RH,
    zm = Z / 2;
  const thatch = kind === "thatch",
    fill = thatch ? K.thatch : K.iron;
  So(
    g,
    wpoly(
      r,
      quad(P, [
        [-ov, zm, top],
        [X + ov, zm, top],
        [X + ov, Z + ov, e],
        [-ov, Z + ov, e],
      ]),
      1.5,
    ),
    mix(fill, K.ink, 0.15),
    1,
  );
  face(
    g,
    r,
    P,
    [
      [X + ov * 0.4, -ov, e],
      [X + ov * 0.4, Z + ov, e],
      [X + ov * 0.4, zm, top - 6],
    ],
    thatch ? K.earth : K.kura,
    K,
    1.1,
    1,
  );
  face(
    g,
    r,
    P,
    [
      [-ov, -ov, e],
      [X + ov, -ov, e],
      [X + ov, zm, top],
      [-ov, zm, top],
    ],
    fill,
    K,
    1.3,
    1.5,
  );
  if (thatch) {
    thatchStrokes(
      g,
      r,
      P(-ov, zm, top),
      P(X + ov, zm, top),
      P(-ov, -ov, e),
      P(X + ov, -ov, e),
      Math.round(X / 2.2),
      K,
    );
    face(
      g,
      r,
      P,
      [
        [-ov, -ov, e],
        [X + ov, -ov, e],
        [X + ov, -ov, e - 14],
        [-ov, -ov, e - 14],
      ],
      K.thatchDk,
      K,
      1.2,
      0.8,
    );
    for (let x = -ov + 3; x < X + ov; x += 4 + r() * 3)
      Ln(g, wseg(r, P(x, -ov, e - 1), P(x + J(r, 1), -ov, e - 13), 0.3, 1), K.ink, 0.6, 0.45, true);
    Br(
      g,
      r,
      [P(-ov - 4, zm, top + 3), P(X / 2, zm, top + 5), P(X + ov + 4, zm, top + 3)],
      9,
      K.ink,
      0.9,
      { blunt: true, tip: 0.6 },
    );
    for (let x = 10; x < X; x += 34) {
      const a = P(x, zm, top + 4);
      Ln(
        g,
        `M${f1(a[0] - 6)} ${f1(a[1] - 9)} L${f1(a[0] + 6)} ${f1(a[1] + 3)} M${f1(a[0] + 6)} ${f1(a[1] - 9)} L${f1(a[0] - 6)} ${f1(a[1] + 3)}`,
        K.ink,
        1.6,
        0.85,
      );
    }
  } else {
    for (let x = -ov + 6; x < X + ov; x += 7)
      Ln(g, wseg(r, P(x, zm, top - 1), P(x, -ov, e + 1), 0.4, 2), K.ink, 0.9, 0.55, true);
    face(
      g,
      r,
      P,
      [
        [-ov, -ov, e],
        [X + ov, -ov, e],
        [X + ov, -ov, e - 6],
        [-ov, -ov, e - 6],
      ],
      K.ink,
      K,
      1,
      0.5,
    );
    Br(
      g,
      r,
      [P(-ov - 6, zm, top + 1), P(X / 2, zm, top + 2), P(X + ov + 6, zm, top + 1)],
      8,
      K.ink,
      0.95,
      { blunt: true, tip: 0.8 },
    );
    [
      [-ov - 6, 1],
      [X + ov + 6, -1],
    ].forEach(([x, s]) => {
      const a = P(x, zm, top + 2);
      Br(
        g,
        r,
        [
          [a[0], a[1] + 4],
          [a[0] - s * 3, a[1] - 6],
          [a[0] - s * 9, a[1] - 9],
        ],
        6,
        K.ink,
        0.9,
      );
    });
  }
}
function plaque(g, r, x, y, w, h, text, font, fs, K) {
  inked(g, r, wbox(r, x - w / 2, y - h / 2, x + w / 2, y + h / 2, 0.5), K.woodLt, K.ink, 1);
  Tx(g, { t: text, tr: `translate(${f1(x)} ${f1(y)})`, fs, font, fill: K.ink });
}
// flat stone on the path, a rope crossed over it, a small wooden box hanging at the front
function stoneBody(g, r, x, y, s, K) {
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2,
      sn = Math.sin(a),
      cs = Math.cos(a);
    const rx = 13 * s * (1 + J(r, 0.08)),
      up = 9 * s * (0.9 + 0.2 * r());
    pts.push([
      x + cs * rx + (sn < 0 ? -cs * cs * 1.2 * s : 0),
      sn < 0 ? y + sn * up * (1 - 0.15 * cs) : y + sn * 3.5 * s,
    ]);
  }
  const d = smooth(pts, true);
  So(g, wring(r, x + 3 * s, y + 2.5 * s, 14 * s, 3.4 * s, 0.6, 10), K.ink, 0.22, "url(#bk-bleed)");
  So(g, d, mix(K.stone, K.paper, 0.5), 1);
  So(
    g,
    `M${f1(x - 12 * s)} ${f1(y - 1 * s)} Q${f1(x)} ${f1(y + 2 * s)} ${f1(x + 12 * s)} ${f1(y - 2 * s)} Q${f1(x + 10 * s)} ${f1(y + 3 * s)} ${f1(x)} ${f1(y + 3.4 * s)} Q${f1(x - 10 * s)} ${f1(y + 3 * s)} ${f1(x - 12 * s)} ${f1(y - 1 * s)} Z`,
    K.stone,
    0.55,
  );
  Ln(g, d, K.ink, 1.3, 0.9);
  return d;
}
function sekiStone(groups, r, x, y, s, K, open) {
  const g = G(),
    S = (v) => v * s;
  if (!open) {
    stone(g, r, x + S(2), y + S(3), S(24), S(9), K);
    groups.push(g);
    const k = G();
    stoneBody(k, r, x, y, s, K);
    const rope = (pts) => {
      Ln(k, wline(r, pts, 0.2), K.ink, S(2), 0.95, true);
      Ln(k, wline(r, pts, 0.15), K.cord, S(0.8), 0.9, true);
    };
    rope([
      [x - S(12.5), y + S(1)],
      [x - S(9), y - S(5.5)],
      [x - S(1), y - S(8.6)],
      [x + S(7), y - S(6.4)],
      [x + S(12.5), y],
    ]);
    rope([
      [x + S(1.6), y + S(3.4)],
      [x + S(1), y - S(3)],
      [x - S(1), y - S(8.6)],
    ]);
    [-1, 1].forEach((sg) =>
      Ln(
        k,
        wline(
          r,
          [
            [x - S(1), y - S(9)],
            [x + sg * S(4.5), y - S(13)],
            [x + sg * S(7), y - S(11)],
            [x + sg * S(3), y - S(9)],
          ],
          0.15,
        ),
        K.ink,
        S(1.3),
        0.9,
        true,
      ),
    );
    So(k, wring(r, x - S(1), y - S(9), S(1.8), S(1.5), 0.15, 6), K.ink, 0.95);
    groups.push(k);
    const b = G(),
      bx = x + S(2.4),
      by = y + S(2.4);
    Ln(
      b,
      wline(
        r,
        [
          [x + S(1.6), y + S(2.6)],
          [bx, by + S(2)],
        ],
        0.1,
      ),
      K.ink,
      S(1.2),
      0.9,
      true,
    );
    So(b, wbox(r, bx - S(5.5), by + S(2), bx + S(5.5), by + S(13), 0.3), K.wood, 1);
    Ln(b, wbox(r, bx - S(5.5), by + S(2), bx + S(5.5), by + S(13), 0.3), K.ink, 1.1, 0.95);
    Ln(b, wseg(r, [bx - S(5.5), by + S(4.6)], [bx + S(5.5), by + S(4.6)], 0.2, 1), K.ink, 0.7, 0.6);
    So(b, wbox(r, bx - S(2.6), by + S(6.4), bx + S(2.6), by + S(11.4), 0.2), K.brass, 1);
    So(
      b,
      `${wring(r, bx, by + S(8.2), S(1), S(1), 0.1, 6)} ${wbox(r, bx - S(0.4), by + S(8.2), bx + S(0.4), by + S(10.6), 0.1)}`,
      K.deep,
      0.95,
    );
    groups.push(b);
  } else {
    stone(g, r, x + S(2), y + S(3), S(24), S(9), K);
    const rope = [
      [x - S(18), y + S(4)],
      [x - S(9), y + S(8)],
      [x + S(3), y + S(7)],
      [x + S(10), y + S(2)],
      [x + S(4), y - S(1)],
      [x - S(8), y + S(1)],
    ];
    Ln(g, wline(r, rope, 0.3), K.ink, S(2.6), 0.9, true);
    Ln(g, wline(r, rope, 0.2), K.cord, S(1), 0.85, true);
    stoneBody(g, r, x + S(30), y + S(9), s, K);
    groups.push(g);
    const b = G(),
      bx = x - S(14),
      by = y + S(10);
    So(b, wbox(r, bx - S(6), by - S(4), bx + S(6), by + S(5), 0.3), K.wood, 1);
    So(b, wbox(r, bx - S(4.6), by - S(3), bx + S(4.6), by - S(0.5), 0.2), K.deep, 0.9);
    Ln(b, wbox(r, bx - S(6), by - S(4), bx + S(6), by + S(5), 0.3), K.ink, 1.1, 0.95);
    const lid = wpoly(
      r,
      [
        [bx - S(6), by - S(4)],
        [bx + S(6), by - S(4)],
        [bx + S(8), by - S(9)],
        [bx - S(3), by - S(10)],
      ],
      0.3,
    );
    So(b, lid, K.woodLt, 1);
    Ln(b, lid, K.ink, 1, 0.9);
    groups.push(b);
  }
}
// bamboo
function leafD(x, y, ang, L, W) {
  const ux = Math.cos(ang),
    uy = Math.sin(ang),
    nx = -uy,
    ny = ux;
  const tx = x + ux * L,
    ty = y + uy * L;
  const a = [x + ux * L * 0.32 + nx * W, y + uy * L * 0.32 + ny * W],
    b = [x + ux * L * 0.4 - nx * W * 0.75, y + uy * L * 0.4 - ny * W * 0.75];
  return `M${f1(x)} ${f1(y)} Q${f1(a[0])} ${f1(a[1])} ${f1(tx)} ${f1(ty)} Q${f1(b[0])} ${f1(b[1])} ${f1(x)} ${f1(y)} Z`;
}
function leafSpray(g, r, x, y, s, K, dir) {
  const n = 2 + Math.floor(r() * 3),
    leaf = mix(K.mossDk, K.ink, 0.35);
  for (let k = 0; k < n; k++) {
    const ang = Math.PI * (0.5 - dir * (0.12 + 0.3 * (k / Math.max(1, n - 1))) + J(r, 0.05));
    const d = leafD(x, y, ang, s * (18 + r() * 9), s * (2.8 + r() * 1.2));
    So(g, d, leaf, 0.72);
    Ln(g, d, K.ink, 0.6, 0.6);
  }
}
function culmGeo(c) {
  const { x0, y0, h, lean, w } = c;
  const at = (t) => [x0 + lean * t * t, y0 - h * t];
  const wid = (t) => w * (1 - 0.35 * t);
  return {
    at,
    wid,
    edge: (t, sg) => {
      const [x, y] = at(t);
      return [x + (sg * wid(t)) / 2, y];
    },
  };
}
function culmPart(g, r, c, K, t0, t1, cutLow, cutTop) {
  const G0 = culmGeo(c),
    n = c.nodes;
  const l0 = t0,
    r0 = t0 + (cutLow || 0),
    l1 = t1,
    r1 = t1 + (cutTop || 0);
  const side = (a, b, sg) => Array.from({ length: 7 }, (_, i) => G0.edge(lerp(a, b, i / 6), sg));
  const L = side(l0, l1, -1),
    R = side(r0, r1, 1);
  const body = wpoly(r, [...L, ...R.slice().reverse()], 0.3);
  Wa(g, r, body, mix(K.bamboo, K.mossDk, 0.22), 0.9);
  Ln(g, wline(r, L, 0.25), K.ink, 1.2, 0.9);
  Ln(g, wline(r, R, 0.25), K.ink, 1.2, 0.9);
  Ln(
    g,
    wline(r, side(l0 + (l1 - l0) * 0.05, l1 - (l1 - l0) * 0.05, -0.45), 0.2),
    K.paper,
    1.4,
    0.45,
    true,
  );
  for (let k = 1; k < n; k++) {
    const t = k / n;
    if (t <= Math.max(l0, r0) + 0.01 || t >= Math.min(l1, r1) - 0.01) continue;
    const a = G0.edge(t, -1.25),
      b = G0.edge(t, 1.25),
      m = G0.at(t);
    Ln(g, wline(r, [a, [m[0], m[1] + 1.2], b], 0.15), K.ink, 1.4, 0.9);
    Ln(g, wline(r, [G0.edge(t + 0.012, -1), G0.edge(t + 0.012, 1)], 0.15), K.ink, 0.7, 0.55);
  }
  return { L, R };
}
// the hollow you see at a slanted cut
function cutFace(g, r, a, b, w, K) {
  const cx = (a[0] + b[0]) / 2,
    cy = (a[1] + b[1]) / 2,
    ux = (b[0] - a[0]) / 2,
    uy = (b[1] - a[1]) / 2;
  const ring = (k) =>
    Array.from({ length: 16 }, (_, i) => {
      const t = (i / 16) * Math.PI * 2;
      return [
        cx + ux * Math.cos(t) * k + 0 * uy,
        cy + uy * Math.cos(t) * k - Math.sin(t) * w * 0.32 * k,
      ];
    });
  const outer = smooth(ring(1), true),
    inner = smooth(ring(0.72), true);
  So(g, outer, mix(K.bamboo, K.paper, 0.55), 1);
  So(g, inner, mix(K.deep, K.bamboo, 0.25), 0.9);
  Ln(g, outer, K.ink, 1.1, 0.95);
  Ln(g, inner, K.ink, 0.7, 0.6);
}
function culmTop(g, r, c, K, s) {
  const G0 = culmGeo(c),
    top = G0.at(1);
  const tw = [
    top,
    [top[0] + c.lean * 0.12, top[1] - 10 * s],
    [top[0] + c.lean * 0.2 + 3 * s, top[1] - 22 * s],
  ];
  Ln(g, wline(r, tw, 0.2), K.ink, 1.3, 0.85);
  leafSpray(g, r, tw[2][0], tw[2][1], s, K, c.lean >= 0 ? 1 : -1);
  [1, 2].forEach((k) => {
    const t = 1 - k / c.nodes,
      p = G0.edge(t, k % 2 ? 1 : -1),
      sg = k % 2 ? 1 : -1;
    const end = [p[0] + sg * 14 * s, p[1] - 9 * s];
    Ln(g, wline(r, [p, [p[0] + sg * 7 * s, p[1] - 6 * s], end], 0.2), K.ink, 1, 0.8);
    leafSpray(g, r, end[0], end[1], s * 0.9, K, sg);
  });
}
const CULMS = [
  [-38, 120, -10, 7],
  [-24, 176, -6, 8],
  [-8, 240, -2, 10],
  [8, 214, 6, 9],
  [24, 252, 12, 10],
  [40, 190, 18, 8],
  [54, 140, 22, 7],
];
// where an edge of a culm meets the swipe line
function edgeHit(c, line, sg) {
  const G0 = culmGeo(c),
    [a, b] = line,
    f = (t) => {
      const [x, y] = G0.edge(t, sg);
      return y - (a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]));
    };
  let lo = 0,
    hi = 1;
  if (f(lo) * f(hi) > 0) return null;
  for (let k = 0; k < 30; k++) {
    const m = (lo + hi) / 2;
    if (f(lo) * f(m) <= 0) hi = m;
    else lo = m;
  }
  return (lo + hi) / 2;
}
// cut: { line: [a, b], phase }
function bambooClump(groups, r, x, y, K, s, cut) {
  s = s || 1;
  const base = G();
  Wa(
    base,
    r,
    wring(r, x + 10 * s, y + 4 * s, 64 * s, 10 * s, 2, 12),
    K.pool,
    0.55,
    "url(#bk-pool)",
  );
  Wa(base, r, wring(r, x + 6 * s, y + 2 * s, 50 * s, 7 * s, 2, 12), K.moss, 0.35, "url(#bk-pool)");
  groups.push(base);
  const late = [],
    lr = rng(hash("bamboo/fall"));
  CULMS.map((q, i) => [q, i])
    .sort((a, b) => a[0][3] - b[0][3])
    .forEach(([[dx, h, lean, w], i]) => {
      const c = {
        x0: x + dx * s,
        y0: y + (i % 2) * 3 * s,
        h: h * s,
        lean: lean * s,
        w: w * s,
        nodes: Math.max(4, Math.round(h / 30)),
      };
      const g = G();
      const tl = cut && edgeHit(c, cut.line, -1),
        tr = cut && edgeHit(c, cut.line, 1);
      if (tl != null && tr != null && tl > 0.04 && tr > 0.04 && Math.max(tl, tr) < 0.96) {
        const k = culmPart(g, r, c, K, 0, tl, 0, tr - tl);
        groups.push(g);
        const f = G();
        cutFace(f, r, k.L[6], k.R[6], c.w, K);
        groups.push(f);
        const right = i % 2 === 0,
          sg = right ? 1 : -1,
          piv = right ? k.R[6] : k.L[6],
          j = Math.floor(i / 2);
        let tf,
          vars = "";
        if (cut.phase === "down") {
          const tx = x - sg * (100 - j * 22) * s,
            ty = y + (10 + ((i * 5) % 7) * 7) * s;
          vars = `--tx:${f1(tx - piv[0])}px;--ty:${f1(ty - piv[1])}px;--r:${f1(sg * (70 + lr() * 34))}deg;--d:${f1(((i * 7) % 4) * 0.05)}s`;
          tf = "translate(var(--tx), var(--ty)) rotate(var(--r))";
        } else tf = `rotate(${sg * (6 + lr() * 14)}deg)`;
        const p = G({ tf, vars, to: `${f1(piv[0])}px ${f1(piv[1])}px`, cls: "fall" });
        culmPart(p, r, c, K, tl, 1, tr - tl, 0);
        culmTop(p, r, c, K, s);
        late.push([cut.phase === "down" ? 0 : 1, p]);
      } else {
        culmPart(g, r, c, K, 0, 1);
        culmTop(g, r, c, K, s);
        groups.push(g);
      }
    });
  late.forEach(([, p]) => groups.push(p));
}
// the toy
function sceneBamboo(K) {
  const r = rng(hash("tea/bamboo")),
    W = 1100,
    H = 560,
    groups = [],
    clips = [];
  const cx = [190, 560, 920],
    y = 470,
    s = 1.45,
    line = (c) => [
      [c - 170, 362],
      [c + 170, 318],
    ];
  const frame = G();
  [0, 1, 2].forEach((k) => {
    Tx(frame, {
      t: ["一", "二", "三"][k],
      tr: `translate(${cx[k] - 150} 40)`,
      fs: 22,
      font: "'Yuji Syuku', serif",
      fill: K.ink,
      o: 0.8,
    });
  });
  groups.push(frame);
  bambooClump(groups, rng(hash("bb")), cx[0], y, K, s);
  bambooClump(groups, rng(hash("bb")), cx[1], y, K, s, { phase: "fall", line: line(cx[1]) });
  bambooClump(groups, rng(hash("bb")), cx[2], y, K, s, { phase: "down", line: line(cx[2]) });
  // fingers trail
  const sw = G(),
    [a, b] = line(cx[1]);
  BrW(sw, r, [a, [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5) - 3], b], 10, K.gold, 0.55);
  Br(sw, r, [a, [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5) - 3], b], 2.4, K.ink, 0.5, {
    tip: 0.05,
    head: 0.1,
  });
  Ln(sw, wring(r, b[0] + 14, b[1] - 2, 11, 11, 0.4, 12), K.ink, 1, 0.55);
  groups.push(sw);
  const fallen = G();
  [
    [cx[2] - 150, y + 30, 0.2],
    [cx[2] - 70, y + 50, 2.9],
    [cx[2] + 130, y + 44, 0.5],
    [cx[2] + 20, y + 62, 2.6],
    [cx[2] - 110, y + 70, 0.9],
  ].forEach(([x, yy, ang]) => {
    const d = leafD(x, yy, ang, 18, 3.4);
    Wa(fallen, r, d, mix(K.mossDk, K.gold, 0.4), 0.9);
    Ln(fallen, d, K.ink, 0.7, 0.7);
  });
  groups.push(fallen);
  return { W, H, groups, clips };
}
// the same oblique projection, zoomed in
const ZP = (ox, oy, s) => (x, z, y) => [ox + (x + z * 0.6) * s, oy - (z * 0.42 + (y || 0)) * s];
const CLAYS = (K) => [
  mix(K.earth, K.paper, 0.25),
  mix(K.earth, K.red, 0.3),
  mix(K.earth, K.ink, 0.45),
  mix(K.paper, K.plaster, 0.25),
];
const GLAZES = (K) => [
  mix(K.ink, K.lacquer, 0.3),
  mix(K.paper, K.plaster, 0.35),
  mix(K.gold, K.earth, 0.5),
  mix(K.moss, K.paper, 0.45),
  mix(K.water, K.ink, 0.2),
  mix(K.moss, K.bamboo, 0.15),
  mix(K.red, K.earth, 0.35),
];
const GLAZE_NAMES = ["tenmoku", "shino", "ame", "seiji", "ruri", "oribe", "shu"];
const PAINTS = (K) => [mix(K.water, K.ink, 0.45), mix(K.earth, K.ink, 0.55), K.red, K.paper];
function radAt(prof, y) {
  for (let i = 1; i < prof.length; i++)
    if (y <= prof[i][1])
      return lerp(
        prof[i - 1][0],
        prof[i][0],
        (y - prof[i - 1][1]) / Math.max(1e-6, prof[i][1] - prof[i - 1][1]),
      );
  return prof[prof.length - 1][0];
}
const PROF = {
  cup: {
    prof: [
      [22, 0],
      [25, 0.15],
      [27, 0.6],
      [26, 1],
    ],
    H: 62,
    handle: true,
  },
  yunomi: {
    prof: [
      [20, 0],
      [24, 0.2],
      [25, 0.7],
      [23, 1],
    ],
    H: 70,
  },
  bowl: {
    prof: [
      [22, 0],
      [36, 0.2],
      [48, 0.6],
      [52, 1],
    ],
    H: 44,
  },
  hira: {
    prof: [
      [26, 0],
      [50, 0.4],
      [64, 1],
    ],
    H: 28,
  },
  plate: {
    prof: [
      [40, 0],
      [62, 0.35],
      [80, 0.8],
      [84, 1],
    ],
    H: 12,
  },
};
function piece(g, r, cx, cy, s, K, spec) {
  const prof = spec.prof,
    rw = prof[prof.length - 1][0] * s,
    h = spec.H * s,
    top = cy - h,
    q = rng(spec.fire || 1);
  const R = (v) => radAt(prof, 1 - v) * s,
    el = 0.3,
    shallow = h < rw * 0.45;
  const clay = CLAYS(K)[spec.clay || 0];
  let glaze = spec.glaze && !spec.glaze.none ? GLAZES(K)[spec.glaze.c] : null;
  if (glaze) glaze = mix(glaze, q() < 0.5 ? K.ink : K.paper, q() * 0.12);
  const side = (sg, v0, v1) =>
    Array.from({ length: 13 }, (_, i) => {
      const v = lerp(v0, v1, i / 12);
      return [cx + sg * R(v), top + v * h];
    });
  const arc = (rad, y, n, lower) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const u = -1 + (2 * i) / n;
      return [cx + u * rad, y + (lower ? 1 : -1) * rad * el * Math.sqrt(Math.max(0, 1 - u * u))];
    });
  const front = (u, v) => [
    cx + u * R(v) * 0.97,
    top + v * h + R(v) * el * Math.sqrt(Math.max(0, 1 - u * u)),
  ];
  const rf = R(1);
  const paint = () =>
    (spec.paint || []).forEach((st) => {
      const pts = st.pts.map(([u, v]) => (shallow ? inside(u, v) : front(u, v)));
      Br(g, r, pts, st.w * s, PAINTS(K)[st.c], 0.88, { tip: 0.25, head: 0.15 });
    });
  const inside = (u, v) => {
    const y = v * 2 - 1,
      k = Math.sqrt(Math.max(0, 1 - y * y));
    return [cx + u * k * rw * 0.82, top + y * rw * el * 0.78];
  };
  // shadow, foot ring, then the body
  So(g, wring(r, cx + 5 * s, cy + rf * el + 6 * s, rw * 0.95, rw * el * 0.6, 0.4, 12), K.ink, 0.16);
  const fu = Array.from({ length: 11 }, (_, i) => -0.8 + i * 0.16),
    fy = (u) => cy + rf * el * Math.sqrt(1 - u * u);
  const footTop = fu.map((u) => [cx + u * rf, fy(u) - 1]),
    footBot = fu.map((u) => [cx + u * rf * 0.97, fy(u) + 5 * s]);
  So(g, wpoly(r, [...footTop, ...footBot.reverse()], 0.2), mix(clay, K.ink, 0.15), 1);
  Ln(
    g,
    wline(r, [footTop[0], ...footBot.slice().reverse(), footTop[footTop.length - 1]], 0.2),
    K.ink,
    0.9,
    0.85,
  );
  const bodyPts = [
    ...side(-1, 0, 1),
    ...arc(rf, cy, 14, true).slice(1, -1),
    ...side(1, 0, 1).reverse(),
  ];
  const body = wpoly(r, bodyPts, 0.2);
  So(g, body, clay, 1);
  for (let k = 0; k < 7; k++) {
    const u = J(q, 0.8),
      v = 0.75 + q() * 0.2,
      p = front(u, v);
    So(g, wring(r, p[0], p[1], 0.5 + q(), 0.4 + q() * 0.6, 0.1, 5), mix(clay, K.ink, 0.5), 0.6);
  }
  if (glaze) {
    const dip = spec.glaze.dip,
      drips = spec.glaze.drips || [];
    const edge = Array.from({ length: 41 }, (_, i) => {
      const u = -1 + i / 20,
        p = front(u, dip);
      let y = p[1] + Math.sin(u * 8 + (spec.fire || 0)) * 1.2 * s;
      drips.forEach(([du, L, w]) => {
        const k = (u - du) / w;
        y += L * h * Math.exp(-k * k * 3);
      });
      return [
        cx + u * R(dip) * 0.995,
        Math.min(y, cy + rf * el * Math.sqrt(Math.max(0, 1 - u * u)) - 2 * s),
      ];
    });
    const gl = wpoly(r, [...side(-1, 0, dip), ...edge, ...side(1, 0, dip).reverse()], 0.2);
    So(g, gl, glaze, 0.97);
    Ln(g, wline(r, edge, 0.2), mix(glaze, K.ink, 0.4), 0.8, 0.6);
    // what the kiln did
    for (let k = 0; k < 4 + Math.floor(q() * 8); k++) {
      const p = front(J(q, 0.8), q() * dip * 0.9);
      So(
        g,
        wring(r, p[0], p[1], 0.5 + q() * 0.9, 0.5 + q() * 0.7, 0.1, 5),
        mix(glaze, q() < 0.5 ? K.ink : K.paper, 0.5),
        0.7,
      );
    }
  }
  if (!shallow) paint();
  if (spec.seal) {
    const p = front(0.62, 0.8);
    So(g, wbox(r, p[0] - 3 * s, p[1] - 3 * s, p[0] + 3 * s, p[1] + 3 * s, 0.2), K.red, 0.85);
  }
  const sheen = side(-1, 0.1, shallow ? 0.6 : 0.75).map(([x, y]) => [x + rw * 0.16, y]);
  Ln(g, wline(r, sheen, 0.2), K.paper, 1.8 * s, 0.3, true);
  Ln(g, wline(r, bodyPts, 0.2), K.ink, 1.2, 0.95);
  // mouth, inside wall and, if it is shallow enough, floor
  const mouth = wring(r, cx, top, rw, rw * el, 0.25, 22);
  const inner = glaze ? mix(glaze, K.ink, 0.22) : mix(clay, K.ink, 0.15);
  So(g, mouth, inner, 1);
  if (shallow) {
    const fr = R(1) * 0.95;
    So(
      g,
      wring(r, cx, top + h * 0.85, fr, fr * el, 0.2, 16),
      glaze ? mix(glaze, K.paper, 0.06) : clay,
      1,
    );
  }
  So(
    g,
    wring(r, cx - rw * 0.05, top - rw * el * 0.12, rw * 0.9, rw * el * 0.8, 0.2, 18),
    glaze ? mix(glaze, K.paper, 0.08) : mix(clay, K.paper, 0.1),
    0.35,
  );
  if (shallow) paint();
  Ln(g, mouth, K.ink, 1.2, 0.95);
  Ln(g, wring(r, cx, top + 1.2 * s, rw * 0.94, rw * el * 0.88, 0.2, 18), K.ink, 0.5, 0.35);
  if (spec.handle) {
    const a = [cx + R(0.22), top + 0.22 * h],
      b = [cx + R(0.72), top + 0.72 * h],
      o = rw * 0.55;
    const hp = [
      a,
      [a[0] + o * 0.75, a[1] - 3 * s],
      [a[0] + o, lerp(a[1], b[1], 0.45)],
      [b[0] + o * 0.55, b[1] + 2 * s],
      b,
    ];
    Br(g, r, hp, 7 * s, glaze || clay, 1, { blunt: true, tip: 0.9, head: 0.9 });
    Ln(
      g,
      wline(
        r,
        hp.map(([x, y], i) => [x + (i && i < 4 ? 3.2 * s : 0), y]),
        0.2,
      ),
      K.ink,
      1,
      0.85,
    );
    Ln(
      g,
      wline(
        r,
        hp.map(([x, y], i) => [x - (i && i < 4 ? 3.2 * s : 0), y]),
        0.2,
      ),
      K.ink,
      1,
      0.85,
    );
  }
  if (spec.kin) {
    const pts = spec.kin.map(([u, v]) => front(u, v));
    Ln(g, wline(r, pts, 0.3), K.gold, 2.2 * s, 0.95, true);
    Ln(g, wline(r, pts, 0.3), K.ink, 0.5, 0.45);
  }
}
// guest's piece
function demoSpec(name, kind) {
  const q = rng(hash("piece/" + name)),
    base = PROF[kind || ["cup", "yunomi", "bowl", "hira", "plate"][Math.floor(q() * 5)]];
  const prof = base.prof.map(([rr, y], i) => [rr * (1 + J(q, 0.08)), y]);
  const paint = [];
  if (q() < 0.6) {
    const v = 0.2 + q() * 0.3;
    paint.push({
      pts: [
        [-0.7, v + J(q, 0.05)],
        [-0.2, v - 0.08],
        [0.3, v + 0.06],
        [0.7, v - 0.02],
      ],
      w: 2 + q() * 3,
      c: Math.floor(q() * 3),
    });
  }
  if (q() < 0.4) {
    const u = J(q, 0.5);
    paint.push({
      pts: [
        [u, 0.12],
        [u + 0.05, 0.3],
        [u - 0.02, 0.5],
      ],
      w: 3 + q() * 2,
      c: Math.floor(q() * 3),
    });
  }
  return {
    prof,
    H: base.H * (1 + J(q, 0.1)),
    handle: base.handle,
    clay: Math.floor(q() * 4),
    fire: Math.floor(q() * 1e6),
    glaze: {
      c: Math.floor(q() * 7),
      dip: 0.45 + q() * 0.35,
      drips: Array.from({ length: Math.floor(q() * 4) }, () => [
        J(q, 0.8),
        0.1 + q() * 0.2,
        0.06 + q() * 0.06,
      ]),
    },
    kin:
      q() < 0.2
        ? [
            [J(q, 0.4), 0],
            [J(q, 0.4), 0.2],
            [J(q, 0.4), 0.45],
          ]
        : null,
    paint,
    seal: true,
  };
}
// kick wheel
function wheel(g, r, cx, cy, s, K) {
  const S = (v) => v * s;
  So(g, wring(r, cx + S(6), cy + S(74), S(78), S(14), 0.5, 14), K.ink, 0.14);
  const fly = wring(r, cx, cy + S(62), S(70), S(18), 0.5, 18);
  So(g, wbox(r, cx - S(70), cy + S(62), cx + S(70), cy + S(70), 0.4), K.woodDk, 1);
  So(g, fly, K.wood, 1);
  Ln(g, fly, K.ink, 1.2, 0.9);
  Ln(
    g,
    wline(
      r,
      [
        [cx - S(70), cy + S(62)],
        [cx - S(70), cy + S(70)],
      ],
      0.2,
    ),
    K.ink,
    1,
    0.8,
  );
  Ln(
    g,
    wline(
      r,
      [
        [cx + S(70), cy + S(62)],
        [cx + S(70), cy + S(70)],
      ],
      0.2,
    ),
    K.ink,
    1,
    0.8,
  );
  inked(g, r, wbox(r, cx - S(5), cy + S(4), cx + S(5), cy + S(60), 0.3), K.woodDk, K.ink, 1);
  So(g, wbox(r, cx - S(46), cy, cx + S(46), cy + S(7), 0.3), K.woodDk, 1);
  const head = wring(r, cx, cy, S(46), S(13), 0.3, 18);
  So(g, head, K.woodLt, 1);
  Ln(g, head, K.ink, 1.2, 0.95);
  Ln(g, wring(r, cx, cy, S(30), S(8.5), 0.3, 16), K.ink, 0.6, 0.4);
}
// spin mark round the wheel head
function spin(g, r, cx, cy, rx, ry, K) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const t = Math.PI * (0.15 + (i / 11) * 0.7);
    return [cx + Math.cos(t) * rx, cy + Math.sin(t) * ry];
  });
  Ln(g, wline(r, pts, 0.3), K.ink, 1, 0.45);
  const e = pts[0];
  Ln(
    g,
    `M${f1(e[0] + 6)} ${f1(e[1] - 6)} L${f1(e[0])} ${f1(e[1])} L${f1(e[0] + 9)} ${f1(e[1] + 2)}`,
    K.ink,
    1,
    0.5,
  );
}
// lump of clay at some stage of the throw
function wetClay(g, r, cx, cy, s, K, prof, H) {
  piece(g, r, cx, cy, s, K, { prof, H, clay: 0, glaze: { none: true }, fire: 3 });
}
function fingertip(g, r, x, y, K, label) {
  Ln(g, wring(r, x, y, 11, 11, 0.4, 12), K.ink, 1, 0.6);
  Wa(g, r, wring(r, x, y, 14, 14, 1, 12), K.gold, 0.35, "url(#bk-bleed)");
  if (label)
    Tx(g, {
      t: label,
      tr: `translate(${f1(x)} ${f1(y - 20)})`,
      fs: 13,
      font: "Kalam, cursive",
      fill: K.ink,
      o: 0.6,
    });
}
function arrowLine(g, r, pts, K, o) {
  Br(g, r, pts, 2, K.ink, o ?? 0.55, { tip: 0.05, head: 0.1 });
  const a = pts[pts.length - 2],
    b = pts[pts.length - 1],
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const w = (d) => [b[0] - 9 * Math.cos(ang + d), b[1] - 9 * Math.sin(ang + d)];
  Ln(
    g,
    `M${f1(w(0.5)[0])} ${f1(w(0.5)[1])} L${f1(b[0])} ${f1(b[1])} L${f1(w(-0.5)[0])} ${f1(w(-0.5)[1])}`,
    K.ink,
    1.3,
    o ?? 0.55,
  );
}
// glaze bucket, seen a little from above
function bucket(g, r, cx, cy, s, K, glaze, label) {
  const S = (v) => v * s;
  So(g, wring(r, cx + S(3), cy + S(4), S(30), S(8), 0.3, 10), K.ink, 0.15);
  const body = wpoly(
    r,
    [
      [cx - S(30), cy - S(36)],
      [cx - S(26), cy],
      [cx + S(26), cy],
      [cx + S(30), cy - S(36)],
    ],
    0.4,
  );
  So(g, body, K.wood, 1);
  Ln(g, body, K.ink, 1.1, 0.9);
  [0.3, 0.75].forEach((t) =>
    Ln(
      g,
      wline(
        r,
        [
          [cx - S(30 - 4 * t), cy - S(36 * (1 - t))],
          [cx, cy - S(36 * (1 - t)) + S(4)],
          [cx + S(30 - 4 * t), cy - S(36 * (1 - t))],
        ],
        0.2,
      ),
      K.rope,
      2,
      0.9,
      true,
    ),
  );
  const top = wring(r, cx, cy - S(36), S(30), S(8), 0.2, 14);
  So(g, top, K.woodDk, 1);
  So(g, wring(r, cx, cy - S(35), S(27), S(6.5), 0.2, 14), glaze, 1);
  Ln(g, top, K.ink, 1.1, 0.9);
  if (label)
    Tx(g, {
      t: label,
      tr: `translate(${f1(cx)} ${f1(cy + S(20))})`,
      fs: 12,
      font: "Kalam, cursive",
      fill: K.ink,
      o: 0.6,
    });
}
// brush, held at an angle
function brushTool(g, r, x, y, ang, L, K, ink) {
  const ux = Math.cos(ang),
    uy = Math.sin(ang),
    e = [x + ux * L, y + uy * L],
    m = [x + ux * L * 0.18, y + uy * L * 0.18];
  Br(g, r, [m, e], 5, K.bamboo, 0.95, { blunt: true, tip: 0.9 });
  Ln(g, wline(r, [m, e], 0.2), K.ink, 0.7, 0.5);
  Br(g, r, [[x, y], m], 7, ink || K.ink, 0.95, { tip: 0.05, head: 0.9 });
}
// pottery workshop, its climbing kiln, and the shelf in the waiting room
const KX = 300,
  KZ = 140,
  KH = 100;
// short indigo curtain in the doorway, split in three
function noren(g, r, P, x0, x1, yTop, drop, K, text) {
  const ind = mix(K.water, K.ink, 0.45),
    n = 3,
    w = (x1 - x0) / n;
  for (let k = 0; k < n; k++) {
    const a = x0 + k * w + 0.6,
      b = x0 + (k + 1) * w - 0.6;
    const d = wpoly(
      r,
      quad(P, [
        [a, 0, yTop],
        [b, 0, yTop],
        [b, 0, yTop - drop - J(r, 1)],
        [a, 0, yTop - drop - J(r, 1)],
      ]),
      0.5,
    );
    So(g, d, ind, 0.95);
    Ln(g, d, K.ink, 0.9, 0.85);
  }
  Ln(g, wseg(r, P(x0 - 4, 0, yTop + 1), P(x1 + 4, 0, yTop + 1), 0.3, 2), K.woodDk, 2.4, 0.95, true);
  const c = P((x0 + x1) / 2, 0, yTop - drop * 0.45),
    sz = Math.abs(P(0, 0, 0)[1] - P(0, 0, drop)[1]) * 0.42;
  Tx(g, {
    t: text,
    tr: `translate(${f1(c[0])} ${f1(c[1])})`,
    fs: sz,
    font: "'Yuji Syuku', serif",
    fill: K.paper,
    o: 0.9,
  });
}
function workshopWalls(g, r, P, K) {
  face(
    g,
    r,
    P,
    [
      [KX, 0, 0],
      [KX, KZ, 0],
      [KX, KZ, KH],
      [KX, 0, KH],
    ],
    K.plasterDk,
    K,
  );
  face(
    g,
    r,
    P,
    [
      [0, 0, 0],
      [KX, 0, 0],
      [KX, 0, KH],
      [0, 0, KH],
    ],
    K.plaster,
    K,
  );
  face(
    g,
    r,
    P,
    [
      [0, 0, 0],
      [KX, 0, 0],
      [KX, 0, 46],
      [0, 0, 46],
    ],
    K.wood,
    K,
    1.1,
  );
  face(
    g,
    r,
    P,
    [
      [KX, 0, 0],
      [KX, KZ, 0],
      [KX, KZ, 46],
      [KX, 0, 46],
    ],
    mix(K.wood, K.ink, 0.15),
    K,
    1.1,
  );
  for (let x = 7; x < KX; x += 9)
    Ln(g, wseg(r, P(x, 0, 1), P(x, 0, 45), 0.3, 2), K.woodDk, 0.8, 0.55, true);
  for (let z = 7; z < KZ; z += 9)
    Ln(g, wseg(r, P(KX, z, 1), P(KX, z, 45), 0.3, 2), K.woodDk, 0.8, 0.5, true);
  // the doorway, open, with the noren
  face(
    g,
    r,
    P,
    [
      [118, 0, 0],
      [186, 0, 0],
      [186, 0, 76],
      [118, 0, 76],
    ],
    K.deep,
    K,
    1,
  );
  noren(g, r, P, 118, 186, 76, 34, K, "陶");
  [
    [32, 84],
    [222, 272],
  ].forEach(([a, b]) => {
    face(
      g,
      r,
      P,
      [
        [a, 0, 54],
        [b, 0, 54],
        [b, 0, 82],
        [a, 0, 82],
      ],
      K.deep,
      K,
      0.9,
    );
    for (let x = a + 6; x < b; x += 7)
      Ln(g, wseg(r, P(x, 0, 55), P(x, 0, 81), 0.2, 1), K.bamboo, 1.6, 0.9, true);
  });
  [0, 118, 186, KX].forEach((x) => postV(g, r, P, x, 0, 0, KH, K, 5));
  postV(g, r, P, KX, KZ, 0, KH, K, 5);
  Ln(g, wseg(r, P(0, 0, 46), P(KX, 0, 46), 0.3, 2), K.woodDk, 3, 0.9, true);
}
// a long plank on two blocks, with bisque drying in the sun
function dryingBench(g, r, P, x0, x1, z, K, s) {
  face(
    g,
    r,
    P,
    [
      [x0, z, 12],
      [x1, z, 12],
      [x1, z + 10, 12],
      [x0, z + 10, 12],
    ],
    K.woodLt,
    K,
    1,
  );
  face(
    g,
    r,
    P,
    [
      [x0, z, 9],
      [x1, z, 9],
      [x1, z, 12],
      [x0, z, 12],
    ],
    K.wood,
    K,
    0.9,
  );
  [x0 + 6, x1 - 10].forEach((x) =>
    face(
      g,
      r,
      P,
      [
        [x, z, 0],
        [x + 5, z, 0],
        [x + 5, z, 9],
        [x, z, 9],
      ],
      K.woodDk,
      K,
      0.8,
    ),
  );
  ["cup", "bowl", "yunomi", "hira", "bowl"].forEach((k, i) => {
    const p = P(lerp(x0 + 10, x1 - 10, i / 4), z + 5, 12);
    piece(
      g,
      r,
      p[0],
      p[1] - 1,
      s,
      K,
      Object.assign({ clay: [0, 3, 0, 1, 3][i], glaze: { none: true }, fire: 11 + i }, PROF[k]),
    );
  });
}
// climbing kiln
function noborigama(groups, r, bx, by, K, lit) {
  const n = 4,
    W0 = 92,
    HH = 46,
    DZ = 46,
    RISE = 17,
    brick = mix(K.earth, K.kura, 0.35);
  const P = (x, z, y) => [bx + x + z * 0.6, by - z * 0.42 - y];
  const g = G();
  Wa(
    g,
    r,
    wpoly(
      r,
      quad(P, [
        [-30, -30, 0],
        [W0 + 30, -30, 0],
        [W0 + 30, n * DZ + 40, n * RISE],
        [-30, n * DZ + 40, n * RISE],
      ]),
      4,
    ),
    K.earth,
    0.3,
    "url(#bk-pool)",
  );
  groups.push(g);
  // chimney at the top end of the slope
  const ch = G(),
    CZ = n * DZ + 4,
    CY = n * RISE,
    cx0 = W0 / 2 - 10;
  face(
    ch,
    r,
    P,
    [
      [cx0, CZ, CY],
      [cx0 + 20, CZ, CY],
      [cx0 + 20, CZ, CY + 140],
      [cx0, CZ, CY + 140],
    ],
    brick,
    K,
    1.1,
  );
  face(
    ch,
    r,
    P,
    [
      [cx0 + 20, CZ, CY],
      [cx0 + 20, CZ + 20, CY],
      [cx0 + 20, CZ + 20, CY + 140],
      [cx0 + 20, CZ, CY + 140],
    ],
    mix(brick, K.ink, 0.2),
    K,
    1.1,
  );
  for (let y = 10; y < 140; y += 10)
    Ln(ch, wseg(r, P(cx0, CZ, CY + y), P(cx0 + 20, CZ, CY + y), 0.2, 1), K.ink, 0.5, 0.35);
  groups.push(ch);
  const smoke = G({ washO: 0.5 }),
    s0 = P(cx0 + 12, CZ + 8, CY + 146);
  const sm = [
    s0,
    [s0[0] - 12, s0[1] - 40],
    [s0[0] + 10, s0[1] - 80],
    [s0[0] - 6, s0[1] - 120],
    [s0[0] - 40, s0[1] - 160],
  ];
  BrW(smoke, r, sm, lit ? 24 : 12, mix(K.inkSoft, K.paper, 0.5), lit ? 0.55 : 0.3);
  Br(smoke, r, sm, 1.4, K.inkSoft, 0.35, { tip: 0.1, head: 0.05 });
  groups.push(smoke);
  for (let i = n - 1; i >= 0; i--) {
    const z0 = i * DZ,
      y0 = i * RISE,
      k = G();
    const arch = (z, m) =>
      Array.from({ length: (m || 12) + 1 }, (_, j) => {
        const a = Math.PI * (j / (m || 12));
        return P((W0 / 2) * (1 - Math.cos(a)), z, y0 + Math.sin(a) * HH);
      });
    const fr = arch(z0),
      bk = arch(z0 + DZ);
    // barrel roof, then the front face of this chamber
    So(k, wpoly(r, [...fr.slice(3), ...bk.slice(3).reverse()], 0.4), mix(brick, K.paper, 0.18), 1);
    for (let j = 1; j < 4; j++)
      Ln(k, wline(r, arch(z0 + (DZ * j) / 4).slice(4), 0.3), K.ink, 0.6, 0.4);
    Ln(k, wline(r, bk.slice(4), 0.4), K.ink, 1, 0.8);
    Ln(k, wline(r, [fr[12], bk[12]], 0.3), K.ink, 1, 0.85);
    const frD = wpoly(r, [...fr, P(0, z0, y0)], 0.4);
    So(k, frD, mix(brick, K.ink, 0.1), 1);
    Ln(k, wline(r, fr, 0.4), K.ink, 1.3, 0.95);
    Ln(k, wline(r, [fr[0], fr[12]], 0.3), K.ink, 1, 0.9);
    // bricked-up door in the face, with a stoking hole in it
    const glow = lit && i < 3,
      sh = P(W0 * 0.93, z0 + DZ * 0.5, y0 + HH * 0.42);
    if (glow) Wa(k, r, wring(r, sh[0], sh[1], 16, 12, 2, 10), K.gold, 0.6, "url(#bk-bleed)");
    So(k, wring(r, sh[0], sh[1], 4, 5.5, 0.3, 9), glow ? mix(K.gold, K.red, 0.4) : K.deep, 1);
    Ln(k, wring(r, sh[0], sh[1], 4, 5.5, 0.3, 9), K.ink, 0.9, 0.9);
    groups.push(k);
  }
  // the firebox at the foot
  const fb = G(),
    m = P(W0 / 2, -10, 0);
  if (lit) Wa(fb, r, wring(r, m[0], m[1] - 10, 30, 20, 3, 10), K.gold, 0.65, "url(#bk-bleed)");
  inked(
    fb,
    r,
    wpoly(
      r,
      [
        [m[0] - 32, m[1] + 4],
        [m[0] - 26, m[1] - 24],
        [m[0] + 26, m[1] - 24],
        [m[0] + 32, m[1] + 4],
      ],
      0.6,
    ),
    mix(brick, K.ink, 0.1),
    K.ink,
    1.2,
  );
  So(
    fb,
    wpoly(
      r,
      [
        [m[0] - 12, m[1] + 2],
        [m[0] - 10, m[1] - 15],
        [m[0] + 10, m[1] - 15],
        [m[0] + 12, m[1] + 2],
      ],
      0.4,
    ),
    lit ? mix(K.gold, K.red, 0.35) : K.deep,
    1,
  );
  groups.push(fb);
}
// what you see from above when the workshop roof is lifted
function workshopInside(groups, r, P, K, sc) {
  sc = sc || 1;
  const g = G();
  groups.push(g);
  face(
    g,
    r,
    P,
    [
      [0, 0, 0],
      [KX, 0, 0],
      [KX, KZ, 0],
      [0, KZ, 0],
    ],
    mix(K.earth, K.paper, 0.35),
    K,
    1,
    1,
  );
  for (let k = 0; k < 60; k++) {
    const p = P(r() * KX, r() * KZ, 0);
    So(g, wring(r, p[0], p[1], 0.6 * sc, 0.4 * sc, 0.1, 5), K.earth, 0.4);
  }
  face(
    g,
    r,
    P,
    [
      [0, 0, 0],
      [0, KZ, 0],
      [0, KZ, KH],
      [0, 0, KH],
    ],
    K.plasterDk,
    K,
  );
  face(
    g,
    r,
    P,
    [
      [0, KZ, 0],
      [KX, KZ, 0],
      [KX, KZ, KH],
      [0, KZ, KH],
    ],
    K.plaster,
    K,
  );
  const wall = groups.length;
  // shelves of bisque along the back wall
  [30, 58].forEach((y, row) => {
    const plank = G();
    groups.push(plank);
    face(
      plank,
      r,
      P,
      [
        [14, KZ, y],
        [150, KZ, y],
        [150, KZ - 12, y],
        [14, KZ - 12, y],
      ],
      K.woodLt,
      K,
      0.9,
    );
    for (let i = 0; i < 6; i++) {
      const p = P(24 + i * 22, KZ - 6, y);
      const pc = G();
      groups.push(pc);
      piece(
        pc,
        r,
        p[0],
        p[1],
        0.28 * sc,
        K,
        Object.assign(
          { clay: (i + row) % 2 ? 0 : 3, glaze: { none: true }, fire: i + row * 7 },
          PROF[["cup", "bowl", "yunomi", "hira", "bowl", "cup"][(i + row) % 6]],
        ),
      );
    }
  });
  // glaze buckets on the right
  GLAZES(K)
    .slice(0, 5)
    .forEach((gc, i) => {
      const p = P(196 + i * 20, KZ - 18 - (i % 2) * 12, 0);
      const bk = G();
      groups.push(bk);
      bucket(bk, r, p[0], p[1], 0.36 * sc, K, gc);
    });
  // the kick wheel in the middle, with a lump of clay
  const wg = G();
  groups.push(wg);
  const wp = P(84, 62, 0);
  wheel(wg, r, wp[0], wp[1] - 18 * sc, 0.42 * sc, K);
  wetClay(
    wg,
    r,
    wp[0],
    wp[1] - 20 * sc,
    0.3 * sc,
    K,
    [
      [18, 0],
      [22, 0.4],
      [16, 1],
    ],
    30,
  );
  So(wg, wring(r, wp[0] - 34 * sc, wp[1] + 6 * sc, 9 * sc, 4 * sc, 0.3, 8), K.woodDk, 0.95);
  // the painting table by the right window
  const t = G();
  groups.push(t);
  face(
    t,
    r,
    P,
    [
      [200, 30, 18],
      [280, 30, 18],
      [280, 70, 18],
      [200, 70, 18],
    ],
    K.woodLt,
    K,
    1,
  );
  [
    [200, 30],
    [280, 30],
  ].forEach(([x, z]) => postV(t, r, P, x, z, 0, 18, K, 3));
  const tp = P(226, 50, 18);
  const tb = G();
  groups.push(tb);
  piece(
    tb,
    r,
    tp[0],
    tp[1],
    0.3 * sc,
    K,
    Object.assign({ clay: 3, glaze: { c: 1, dip: 0.7 }, fire: 4 }, PROF.bowl),
  );
  brushTool(tb, r, tp[0] + 22 * sc, tp[1] - 4 * sc, -0.4, 20 * sc, K, PAINTS(K)[0]);
  [0, 1, 2].forEach((i) => {
    const p = P(256 + i * 7, 42, 18);
    So(tb, wring(r, p[0], p[1], 3 * sc, 1.5 * sc, 0.2, 8), PAINTS(K)[i], 0.95);
  });
  return wall;
}
function sceneGarden16(K, stage, opt = {}) {
  const open = stage === "open";
  const r = rng(hash("tea/garden16")),
    W = 1100,
    H = 690,
    groups = [],
    clips = [];
  const ground = G({ washO: 0.35 });
  [
    [240, 470, 220, 50],
    [700, 640, 240, 34],
    [900, 470, 140, 40],
  ].forEach(([x, y, rx, ry]) =>
    Wa(ground, r, wring(r, x, y, rx, ry, ry * 0.3, 12), K.moss, 0.22, "url(#bk-pool)"),
  );
  for (let i = 0; i < 120; i++) {
    const x = r() * W,
      y = 120 + r() * (H - 130);
    So(
      ground,
      wring(r, x, y, 0.9 + r() * 1.2, 0.7 + r() * 0.8, 0.3, 6),
      K.mossDk,
      0.1 + r() * 0.15,
    );
  }
  groups.push(ground);
  const path = G();
  steppingStones(
    path,
    r,
    [
      [420, 686],
      [446, 648],
      [476, 612],
      [512, 580],
      [550, 552],
      [590, 528],
      [628, 506],
      [380, 664],
      [330, 668],
      [280, 676],
    ],
    K,
    0.9,
  );
  groups.push(path);

  // workshop
  const PW = OB(470, 452),
    WS = G();
  Wa(
    WS,
    r,
    wpoly(
      r,
      quad(PW, [
        [-14, -16, 0],
        [KX + 16, -16, 0],
        [KX + 16, KZ + 12, 0],
        [-14, KZ + 12, 0],
      ]),
      3,
    ),
    K.pool,
    0.6,
    "url(#bk-pool)",
  );
  groups.push(WS);
  if (!open) {
    const walls = G();
    workshopWalls(walls, r, PW, K);
    groups.push(walls);
    const roof = G({ cls: "roji-roof" });
    gableRoof(roof, r, PW, KX, KZ, KH, 72, 20, K, "thatch");
    plaque(roof, r, ...PW(152, -20, KH - 14), 40, 16, "工房", "'Yuji Syuku', serif", 11, K);
    groups.push(roof);
  } else {
    workshopInside(groups, r, PW, K);
    const fW = G();
    face(
      fW,
      r,
      PW,
      [
        [KX, 0, 0],
        [KX, KZ, 0],
        [KX, KZ, 26],
        [KX, 0, 26],
      ],
      mix(K.wood, K.ink, 0.15),
      K,
      1.1,
    );
    face(
      fW,
      r,
      PW,
      [
        [0, 0, 0],
        [118, 0, 0],
        [118, 0, 22],
        [0, 0, 22],
      ],
      K.wood,
      K,
      1.1,
    );
    face(
      fW,
      r,
      PW,
      [
        [186, 0, 0],
        [KX, 0, 0],
        [KX, 0, 22],
        [186, 0, 22],
      ],
      K.wood,
      K,
      1.1,
    );
    [0, 118, 186, KX].forEach((x) => postV(fW, r, PW, x, 0, 0, 22, K, 5));
    [
      [0, KZ],
      [KX, KZ],
    ].forEach(([x, z]) => postV(fW, r, PW, x, z, 0, KH, K, 5));
    plaque(fW, r, ...PW(152, -6, 14), 36, 14, "工房", "'Yuji Syuku', serif", 10, K);
    groups.push(fW);
  }
  const bench = G();
  dryingBench(bench, r, PW, 8, 104, -26, K, 0.3);
  groups.push(bench);
  noborigama(groups, r, 870, 612, K, open);
  const bb = [];
  bambooClump(bb, rng(hash("bb")), 250, 404, K, 1, opt.cut);
  groups.push({ cls: "roji-bamboo", groups: bb });

  // waiting room
  const PM = OB(36, 664),
    MA = G({ cls: "roji-machiai" }),
    MH = 178;
  Wa(
    MA,
    r,
    wpoly(
      r,
      quad(PM, [
        [-10, -10, 0],
        [224, -10, 0],
        [224, 90, 0],
        [-10, 90, 0],
      ]),
      3,
    ),
    K.pool,
    0.6,
    "url(#bk-pool)",
  );
  face(
    MA,
    r,
    PM,
    [
      [0, 0, 0],
      [0, 80, 0],
      [0, 80, MH],
      [0, 0, MH],
    ],
    K.plasterDk,
    K,
  );
  face(
    MA,
    r,
    PM,
    [
      [0, 80, 0],
      [214, 80, 0],
      [214, 80, MH],
      [0, 80, MH],
    ],
    K.plaster,
    K,
  );
  face(
    MA,
    r,
    PM,
    [
      [0, 0, 0],
      [214, 0, 0],
      [214, 80, 0],
      [0, 80, 0],
    ],
    K.earth,
    K,
    1,
    1.2,
  );
  postV(MA, r, PM, 0, 0, 0, MH, K);
  postV(MA, r, PM, 0, 80, 0, MH, K);
  postV(MA, r, PM, 214, 80, 0, MH, K);
  face(
    MA,
    r,
    PM,
    [
      [0, 80, MH],
      [214, 80, MH],
      [214, 84, MH],
      [0, 84, MH],
    ],
    K.wood,
    K,
    1,
  );
  face(
    MA,
    r,
    PM,
    [
      [156, 80, 66],
      [202, 80, 66],
      [202, 80, 116],
      [156, 80, 116],
    ],
    K.glowSoft,
    K,
    0.9,
  );
  for (let x = 162; x < 202; x += 8)
    Ln(MA, wseg(r, PM(x, 80, 67), PM(x, 80, 115), 0.2, 1), K.bamboo, 1.2, 0.8, true);
  groups.push(MA);
  const shelf = G();
  Wa(
    shelf,
    r,
    wpoly(
      r,
      quad(PM, [
        [14, 80, 24],
        [144, 80, 24],
        [144, 80, 168],
        [14, 80, 168],
      ]),
      3,
    ),
    K.glowSoft,
    0.45,
    "url(#bk-bleed)",
  );
  [36, 82, 128].forEach((y, row) => {
    face(
      shelf,
      r,
      PM,
      [
        [16, 80, y],
        [142, 80, y],
        [142, 70, y],
        [16, 70, y],
      ],
      K.woodLt,
      K,
      0.9,
    );
    for (let i = 0; i < 5; i++) {
      const p = PM(28 + i * 26, 75, y);
      const spec = opt.shelf ? opt.shelf(row * 5 + i) : demoSpec("g" + row + i);
      if (spec) piece(shelf, r, p[0], p[1] - 1, 0.24, K, spec);
    }
  });
  groups.push(shelf);
  const MB = G();
  face(
    MB,
    r,
    PM,
    [
      [10, 26, 0],
      [204, 26, 0],
      [204, 26, 18],
      [10, 26, 18],
    ],
    K.woodDk,
    K,
    1.1,
  );
  face(
    MB,
    r,
    PM,
    [
      [10, 26, 18],
      [204, 26, 18],
      [204, 56, 18],
      [10, 56, 18],
    ],
    K.wood,
    K,
    1.1,
  );
  groups.push(MB);

  // one stone, before the workshop door
  if (open) {
    const fs = G();
    stone(fs, r, 664, 506, 30, 11, K);
    groups.push(fs);
  } else {
    const st = [];
    sekiStone(st, r, 640, 504, 1.15, K, false);
    groups.push({ cls: "roji-stone", groups: st });
  }
  const clouds = G({ washO: 0.5 }),
    grey = mix(K.inkSoft, K.paper, 0.55);
  mist(clouds, r, 760, 1110, 128, 34, grey, 0.7, mix(grey, K.ink, 0.25));
  groups.push(clouds);
  return { W, H, groups, clips };
}
// workshop, step by step
const note = (g, x, y, t, K, fs, o) =>
  Tx(g, {
    t,
    tr: `translate(${f1(x)} ${f1(y)})`,
    fs: fs || 15,
    font: "Kalam, cursive",
    fill: K.ink,
    o: o ?? 0.65,
  });
const kan = (g, x, y, t, K, fs) =>
  Tx(g, {
    t,
    tr: `translate(${f1(x)} ${f1(y)})`,
    fs: fs || 24,
    font: "'Yuji Syuku', serif",
    fill: K.ink,
    o: 0.85,
  });
function frames(g, r, labels, K, H) {
  const n = labels.length,
    w = 1100 / n;
  labels.forEach(([j, t], i) => {
    kan(g, i * w + 26, 44, j, K);
    note(g, i * w + 26 + 30 + t.length * 3.6, 44, t, K, 17, 0.75);
    if (i) Ln(g, wseg(r, [i * w, 80], [i * w, H - 30], 0.6, 3), K.ink, 0.8, 0.18);
  });
  return (i) => i * w + w / 2;
}
// hotspot in the workshop
function spot(g, r, x, y, j, t, K) {
  Wa(g, r, wring(r, x, y, 40, 26, 3, 12), K.gold, 0.32, "url(#bk-bleed)");
  inked(g, r, wring(r, x, y - 64, 15, 15, 0.4, 12), K.paper, K.ink, 1);
  kan(g, x, y - 63, j, K, 16);
  note(g, x, y - 38, t, K, 13, 0.7);
}
// inside the workshop, once the roof has lifted
function sceneWorkshop(K) {
  const r = rng(hash("tea/workshop")),
    W = 1100,
    H = 560,
    groups = [];
  const P = ZP(40, 500, 2.55),
    sc = 2.55;
  const ui = G({ cls: "kobo-back" });
  note(ui, 110, 34, "← back to the garden", K, 17, 0.75);
  groups.push(ui);
  const wall = workshopInside(groups, r, P, K, sc);
  const door = G();
  face(
    door,
    r,
    P,
    [
      [160, KZ, 0],
      [190, KZ, 0],
      [190, KZ, 72],
      [160, KZ, 72],
    ],
    K.glowSoft,
    K,
    1,
  );
  const dp = P(175, KZ, 30);
  Wa(door, r, wring(r, dp[0], dp[1], 30, 70, 3, 10), K.gold, 0.4, "url(#bk-bleed)");
  groups.splice(wall, 0, door);
  const front = G();
  face(
    front,
    r,
    P,
    [
      [KX, 0, 0],
      [KX, KZ, 0],
      [KX, KZ, 16],
      [KX, 0, 16],
    ],
    mix(K.wood, K.ink, 0.15),
    K,
    1.1,
  );
  face(
    front,
    r,
    P,
    [
      [0, 0, 0],
      [KX, 0, 0],
      [KX, 0, 12],
      [0, 0, 12],
    ],
    K.wood,
    K,
    1.1,
  );
  [0, KX].forEach((x) => postV(front, r, P, x, 0, 0, 12, K, 9));
  [
    [0, KZ],
    [KX, KZ],
  ].forEach(([x, z]) => postV(front, r, P, x, z, 0, KH, K, 9));
  groups.push(front);

  const spots = [
    ["wheel", 40, 40, 22, "轆", "the wheel"],
    ["shelf", 84, KZ - 12, 66, "棚", "drying shelf"],
    ["glaze", 236, KZ - 24, 14, "釉", "glazes"],
    ["brush", 196, 14, 30, "筆", "brush & seal"],
    ["kiln", 175, KZ, 70, "窯", "out to the kiln"],
  ].map(([id, x, z, y, j, t]) => {
    const [px, py] = P(x, z, y),
      tag = G({ cls: "kobo-" + id });
    spot(tag, r, px, py, j, t, K);
    groups.push(tag);
    return { id, x: Math.round(px), y: Math.round(py) };
  });
  return { W, H, groups, clips: [], spots };
}
// throwing
function sceneWheel(K) {
  const r = rng(hash("tea/wheel")),
    W = 1100,
    H = 470,
    groups = [],
    y = 330,
    s = 1.25;
  const lab = G(),
    X = frames(
      lab,
      r,
      [
        ["一", "centre"],
        ["二", "open"],
        ["三", "pull up"],
        ["四", "shape"],
      ],
      K,
      H,
    );
  groups.push(lab);
  const f = [0, 1, 2, 3].map(() => G());
  f.forEach((g, i) => {
    wheel(g, r, X(i), y, s, K);
  });
  // wobbly lump
  wetClay(
    f[0],
    r,
    X(0) + 3,
    y - 2,
    s,
    K,
    [
      [30, 0],
      [36, 0.35],
      [28, 0.8],
      [14, 1],
    ],
    40,
  );
  fingertip(f[0], r, X(0) - 66, y - 34, K);
  fingertip(f[0], r, X(0) + 66, y - 34, K);
  arrowLine(
    f[0],
    r,
    [
      [X(0) - 100, y - 34],
      [X(0) - 80, y - 34],
    ],
    K,
  );
  arrowLine(
    f[0],
    r,
    [
      [X(0) + 100, y - 34],
      [X(0) + 80, y - 34],
    ],
    K,
  );
  spin(f[0], r, X(0), y + 8, 74, 20, K);
  note(f[0], X(0), y + 124, "hold both sides still while it spins", K);
  // press a thumb into the middle
  wetClay(
    f[1],
    r,
    X(1),
    y - 2,
    s,
    K,
    [
      [30, 0],
      [33, 0.4],
      [32, 0.9],
      [26, 1],
    ],
    34,
  );
  fingertip(f[1], r, X(1), y - 64, K);
  arrowLine(
    f[1],
    r,
    [
      [X(1), y - 120],
      [X(1), y - 80],
    ],
    K,
  );
  spin(f[1], r, X(1), y + 8, 74, 20, K);
  note(f[1], X(1), y + 124, "press down, not too deep", K);
  // pull the wall up between two fingers
  Ln(
    f[2],
    wline(
      r,
      [
        [X(2) - 40, y - 2],
        [X(2) - 42, y - 42],
      ],
      0.4,
    ),
    K.ink,
    1,
    0.25,
  );
  wetClay(
    f[2],
    r,
    X(2),
    y - 2,
    s,
    K,
    [
      [26, 0],
      [27, 0.4],
      [25, 0.9],
      [23, 1],
    ],
    70,
  );
  fingertip(f[2], r, X(2) + 38, y - 70, K);
  arrowLine(
    f[2],
    r,
    [
      [X(2) + 60, y - 30],
      [X(2) + 60, y - 110],
    ],
    K,
  );
  spin(f[2], r, X(2), y + 8, 74, 20, K);
  note(f[2], X(2), y + 124, "drag upward along the wall", K);
  // drag the profile out or in; dots show where your finger can catch it
  const prof = [
    [24, 0],
    [38, 0.25],
    [50, 0.65],
    [54, 1],
  ];
  wetClay(f[3], r, X(3), y - 2, s, K, prof, 46);
  const H3 = 46 * s,
    top3 = y - 2 - H3;
  prof.forEach(([rr, v]) => {
    const p = [X(3) + rr * s, top3 + (1 - v) * H3];
    inked(f[3], r, wring(r, p[0], p[1], 3.5, 3.5, 0.2, 8), K.paper, K.ink, 1);
  });
  fingertip(f[3], r, X(3) + 50 * s + 10, top3 + 0.35 * H3, K);
  arrowLine(
    f[3],
    r,
    [
      [X(3) + 40, top3 + 20],
      [X(3) + 92, top3 + 6],
    ],
    K,
  );
  spin(f[3], r, X(3), y + 8, 74, 20, K);
  note(f[3], X(3), y + 124, "pull out for a bowl, in for a cup", K);
  f.forEach((g) => groups.push(g));
  return { W, H, groups, clips: [] };
}
// what the same lump can become
function sceneShapes(K) {
  const r = rng(hash("tea/shapes")),
    W = 1100,
    H = 420,
    g = G(),
    y = 300;
  [
    ["plate", "press down and out", 0.95],
    ["hira", "a wide shallow bowl", 1.2],
    ["bowl", "a tea bowl", 1.4],
    ["yunomi", "a tall cup", 1.5],
    ["cup", "a cup, with a handle", 1.5],
  ].forEach(([k, t, s], i) => {
    const x = 110 + i * 220;
    wetClay(g, r, x, y, s, K, PROF[k].prof, PROF[k].H);
    note(g, x, y + 80, t, K);
  });
  // handle
  const hx = 990,
    hy = 150;
  Br(
    g,
    r,
    [
      [hx - 60, hy - 60],
      [hx - 40, hy - 40],
      [hx - 30, hy - 12],
    ],
    7,
    CLAYS(K)[0],
    1,
    { blunt: true, tip: 0.6 },
  );
  Ln(
    g,
    wline(
      r,
      [
        [hx - 60, hy - 60],
        [hx - 40, hy - 40],
        [hx - 30, hy - 12],
      ],
      0.3,
    ),
    K.ink,
    0.8,
    0.6,
  );
  fingertip(g, r, hx - 66, hy - 66, K);
  arrowLine(
    g,
    r,
    [
      [hx - 20, hy - 10],
      [hx - 8, y - 70],
    ],
    K,
    0.45,
  );
  note(g, hx - 40, hy - 92, "pull a handle", K, 13);
  return { W, H, groups: [g], clips: [] };
}
// inside one chamber of the kiln
function chamber(g, r, cx, cy, w, h, K, heat) {
  const fl = [mix(K.red, K.ink, 0.2), mix(K.red, K.gold, 0.4), K.gold, mix(K.gold, K.paper, 0.6)][
    heat
  ];
  const arch = Array.from({ length: 17 }, (_, i) => {
    const a = Math.PI * (i / 16);
    return [cx - (Math.cos(a) * w) / 2, cy - Math.sin(a) * h];
  });
  So(
    g,
    wpoly(r, [...arch, [cx + w / 2 + 14, cy + 12], [cx - w / 2 - 14, cy + 12]], 0.5),
    mix(K.earth, K.kura, 0.35),
    1,
  );
  So(g, wpoly(r, arch, 0.4), mix(K.deep, fl, 0.35), 1);
  Wa(g, r, wring(r, cx, cy - h * 0.35, w * 0.45, h * 0.6, 3, 12), fl, 0.75, "url(#bk-bleed)");
  Ln(g, wline(r, arch, 0.4), K.ink, 1.4, 0.95);
  for (let k = 1; k < 4; k++)
    Ln(
      g,
      wline(
        r,
        arch
          .map(([x, y]) => [cx + (x - cx) * (1 + k * 0.07), cy + (y - cy) * (1 + k * 0.08)])
          .slice(1, 16),
        0.3,
      ),
      K.ink,
      0.6,
      0.4,
    );
  Ln(g, wseg(r, [cx - w / 2, cy], [cx + w / 2, cy], 0.4, 2), K.ink, 1.2, 0.9);
  [cy - h * 0.48].forEach((sy) => {
    inked(
      g,
      r,
      wbox(r, cx - w * 0.4, sy, cx + w * 0.4, sy + 5, 0.3),
      mix(K.earth, K.paper, 0.2),
      K.ink,
      0.9,
    );
    [cx - w * 0.3, cx + w * 0.3].forEach((x) =>
      Ln(g, wseg(r, [x, sy + 5], [x, cy], 0.3, 2), K.ink, 3, 0.6, true),
    );
  });
}
function heatBar(g, r, x, y, w, K, at, lo, hi) {
  const cs = [mix(K.red, K.ink, 0.2), mix(K.red, K.gold, 0.4), K.gold, mix(K.gold, K.paper, 0.6)];
  cs.forEach((c, i) =>
    So(g, wbox(r, x + (i * w) / 4, y, x + ((i + 1) * w) / 4, y + 10, 0.2), c, 0.85),
  );
  Ln(g, wbox(r, x, y, x + w, y + 10, 0.3), K.ink, 1, 0.8);
  Ln(g, wbox(r, x + lo * w, y - 4, x + hi * w, y + 14, 0.3), K.ink, 1.4, 0.9);
  Ln(
    g,
    `M${f1(x + at * w)} ${f1(y - 10)} L${f1(x + at * w - 5)} ${f1(y - 18)} L${f1(x + at * w + 5)} ${f1(y - 18)} Z`,
    K.ink,
    1.2,
    0.9,
  );
}
// tongs holding a piece upside down by its foot
function tongs(g, r, x, y, K) {
  Ln(
    g,
    wline(
      r,
      [
        [x - 6, y - 8],
        [x - 18, y - 70],
        [x - 4, y - 120],
      ],
      0.3,
    ),
    K.iron,
    3,
    0.95,
    true,
  );
  Ln(
    g,
    wline(
      r,
      [
        [x + 6, y - 8],
        [x + 18, y - 70],
        [x + 4, y - 120],
      ],
      0.3,
    ),
    K.iron,
    3,
    0.95,
    true,
  );
}
function sceneKiln(K) {
  const r = rng(hash("tea/kiln")),
    W = 1100,
    H = 460,
    groups = [],
    y = 330;
  const lab = G(),
    X = frames(
      lab,
      r,
      [
        ["一", "first firing"],
        ["二", "dip"],
        ["三", "drip"],
        ["四", "glaze firing"],
      ],
      K,
      H,
    );
  groups.push(lab);
  const sp = Object.assign({ clay: 0, fire: 21 }, PROF.bowl);
  // bisque
  const a = G();
  chamber(a, r, X(0), y, 190, 150, K, 2);
  piece(a, r, X(0) - 34, y - 78, 0.5, K, Object.assign({}, sp, { glaze: { none: true } }));
  piece(
    a,
    r,
    X(0) + 34,
    y - 78,
    0.5,
    K,
    Object.assign({ clay: 3, glaze: { none: true }, fire: 2 }, PROF.cup),
  );
  piece(a, r, X(0), y - 2, 0.62, K, Object.assign({}, sp, { glaze: { none: true }, clay: 1 }));
  heatBar(a, r, X(0) - 90, y + 50, 180, K, 0.64, 0.5, 0.75);
  note(a, X(0), y + 92, "tap to stoke · keep it in the band", K);
  groups.push(a);
  // dip it upside down
  const b = G();
  bucket(b, r, X(1), y + 30, 2.4, K, GLAZES(K)[3]);
  const flip = G({ tf: "rotate(180deg)", to: `${f1(X(1))}px ${f1(y - 54)}px` });
  piece(flip, r, X(1), y - 54, 0.85, K, Object.assign({}, sp, { glaze: { c: 3, dip: 0.55 } }));
  groups.push(b, flip);
  const b2 = G();
  tongs(b2, r, X(1), y - 112, K);
  arrowLine(
    b2,
    r,
    [
      [X(1) + 86, y - 120],
      [X(1) + 86, y - 64],
    ],
    K,
  );
  note(b2, X(1), y + 92, "drag down · let go to lift", K);
  groups.push(b2);
  // hold it tilted and the glaze runs in drips
  const c = G();
  piece(
    c,
    r,
    X(2),
    y,
    1.25,
    K,
    Object.assign({}, sp, {
      glaze: {
        c: 2,
        dip: 0.42,
        drips: [
          [-0.4, 0.24, 0.07],
          [0.05, 0.36, 0.06],
          [0.5, 0.18, 0.08],
        ],
      },
    }),
  );
  fingertip(c, r, X(2) + 30, y - 120, K);
  arrowLine(
    c,
    r,
    [
      [X(2) + 30, y - 100],
      [X(2) + 30, y - 66],
    ],
    K,
  );
  note(c, X(2), y + 92, "hold where you want it to run", K);
  groups.push(c);
  // same glaze, three firings
  const d = G();
  [
    [-70, 31],
    [0, 32],
    [70, 33],
  ].forEach(([dx, f], i) =>
    piece(
      d,
      r,
      X(3) + dx,
      y - (i === 1 ? 26 : 0),
      0.55,
      K,
      Object.assign({}, sp, {
        fire: f,
        glaze: { c: 0, dip: 0.6, drips: [[J(rng(f), 0.6), 0.2, 0.08]] },
        kin:
          i === 2
            ? [
                [0.1, 0],
                [0.18, 0.25],
                [0.05, 0.5],
              ]
            : null,
      }),
    ),
  );
  note(d, X(3), y + 72, "the kiln decides the rest", K);
  note(d, X(3), y + 92, "a crack is mended in gold", K, 13, 0.55);
  groups.push(d);
  return { W, H, groups, clips: [] };
}
// glaze shelf
function sceneGlazes(K) {
  const r = rng(hash("tea/glazes")),
    W = 1100,
    H = 300,
    g = G();
  GLAZES(K).forEach((c, i) => {
    const x = 110 + i * 147;
    bucket(g, r, x, 170, 1.7, K, c);
    note(g, x, 222, GLAZE_NAMES[i], K, 16, 0.75);
  });
  ["天目", "志野", "飴", "青磁", "瑠璃", "織部", "朱"].forEach((j, i) =>
    kan(g, 110 + i * 147, 250, j, K, 15),
  );
  return { W, H, groups: [g], clips: [] };
}
// painting on the banding wheel
function scenePaint(K) {
  const r = rng(hash("tea/paint")),
    W = 1100,
    H = 620,
    groups = [],
    g = G();
  const bx = 380,
    by = 470;
  // banding wheel
  So(g, wring(r, bx + 6, by + 38, 150, 22, 0.5, 14), K.ink, 0.14);
  inked(g, r, wbox(r, bx - 24, by + 8, bx + 24, by + 34, 0.4), K.iron, K.ink, 1);
  So(g, wbox(r, bx - 130, by, bx + 130, by + 8, 0.4), mix(K.iron, K.ink, 0.25), 1);
  inked(g, r, wring(r, bx, by, 130, 26, 0.4, 18), mix(K.iron, K.paper, 0.2), K.ink, 1.2);
  spin(g, r, bx, by + 6, 150, 34, K);
  groups.push(g);
  const bw = G();
  piece(
    bw,
    r,
    bx,
    by - 12,
    3.4,
    K,
    Object.assign(
      {
        clay: 3,
        fire: 41,
        glaze: { c: 1, dip: 0.72 },
        paint: [
          {
            pts: [
              [-0.85, 0.32],
              [-0.45, 0.22],
              [-0.05, 0.36],
              [0.35, 0.24],
              [0.7, 0.34],
            ],
            w: 3.4,
            c: 0,
          },
          {
            pts: [
              [-0.3, 0.46],
              [-0.2, 0.56],
              [-0.28, 0.66],
            ],
            w: 2.2,
            c: 0,
          },
          {
            pts: [
              [0.18, 0.44],
              [0.28, 0.54],
              [0.2, 0.66],
            ],
            w: 2.2,
            c: 0,
          },
        ],
      },
      PROF.bowl,
    ),
  );
  groups.push(bw);
  const br = G();
  brushTool(br, r, bx + 134, by - 128, -0.95, 150, K, PAINTS(K)[0]);
  note(br, bx + 160, by - 270, "slow is thick, fast is thin", K);
  groups.push(br);
  // palette: four dishes, each with its name
  const pal = G(),
    names = [
      ["呉須", "gosu blue"],
      ["鬼板", "iron brown"],
      ["弁柄", "bengara red"],
      ["白化粧", "white slip"],
    ];
  PAINTS(K).forEach((c, i) => {
    const x = 760 + (i % 2) * 150,
      y = 120 + Math.floor(i / 2) * 130;
    inked(pal, r, wring(r, x, y, 44, 14, 0.3, 14), K.paper, K.ink, 1.1);
    So(pal, wring(r, x - 2, y + 1, 30, 8, 0.6, 12), c, 0.95);
    kan(pal, x, y + 40, names[i][0], K, 15);
    note(pal, x, y + 60, names[i][1], K, 13, 0.6);
  });
  groups.push(pal);
  // the seal for the foot, and name in hand
  const sl = G(),
    sx = 830,
    sy = 450;
  inked(sl, r, wbox(r, sx - 18, sy - 90, sx + 18, sy - 20, 0.4), K.woodLt, K.ink, 1.1);
  So(sl, wbox(r, sx - 22, sy - 20, sx + 22, sy, 0.4), K.red, 0.9);
  So(sl, wbox(r, sx + 60, sy - 34, sx + 104, sy + 10, 0.6), K.red, 0.88);
  kan(sl, sx + 82, sy - 10, "空", K, 30);
  Tx(sl, {
    t: "空",
    tr: `translate(${sx + 82} ${sy - 10})`,
    fs: 30,
    font: "'Yuji Syuku', serif",
    fill: K.paper,
  });
  note(sl, sx + 40, sy + 46, "a seal from your name", K);
  Tx(sl, {
    t: "Sora",
    tr: `translate(${sx + 40} ${sy + 96})`,
    fs: 30,
    font: "Kalam, cursive",
    fill: K.ink,
    o: 0.85,
  });
  Ln(sl, wseg(r, [sx - 30, sy + 106], [sx + 110, sy + 106], 0.6, 3), K.ink, 0.8, 0.4);
  note(sl, sx + 40, sy + 128, "and your name, written by hand", K, 13, 0.55);
  groups.push(sl);
  return { W, H, groups, clips: [] };
}

// frame of short dashes, for what is not quite there yet
function dashed(g, r, x0, y0, x1, y1, K) {
  const side = (a, b) => {
    const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 12));
    for (let k = 0; k < n; k += 2) {
      const t0 = k / n,
        t1 = Math.min(1, (k + 1) / n);
      const at = (t) => [
        f1(a[0] + (b[0] - a[0]) * t + (r() - 0.5)),
        f1(a[1] + (b[1] - a[1]) * t + (r() - 0.5)),
      ];
      const [p, q] = [at(t0), at(t1)];
      Ln(g, `M${p[0]} ${p[1]}L${q[0]} ${q[1]}`, K.ink, 1, 0.5, true);
    }
  };
  side([x0, y0], [x1, y0]);
  side([x1, y0], [x1, y1]);
  side([x1, y1], [x0, y1]);
  side([x0, y1], [x0, y0]);
}

// shelf in the waiting room
function sceneShelf(K, opt = {}) {
  const r = rng(hash("tea/shelf")),
    W = 1100,
    H = 700,
    groups = [],
    g = G(),
    spots = [];
  note(g, 110, 34, "← back to the garden", K, 17, 0.75);
  inked(g, r, wbox(r, 40, 70, 1060, 680, 1), K.plaster, K.ink, 1.2);
  for (let k = 0; k < 40; k++)
    So(
      g,
      wring(r, 60 + r() * 980, 90 + r() * 570, 1 + r() * 2, 0.6 + r(), 0.3, 6),
      K.plasterDk,
      0.3,
    );
  inked(g, r, wbox(r, 900, 110, 1020, 290, 1), K.glowSoft, K.ink, 1);
  for (let x = 914; x < 1020; x += 16)
    Ln(g, wseg(r, [x, 112], [x, 288], 0.3, 2), K.bamboo, 2.4, 0.85, true);
  groups.push(g);
  const rows = [220, 410, 600];
  const list =
    opt.pieces ||
    rows.flatMap((_, row) => [0, 1, 2, 3, 4, 5].map((i) => demoSpec("shelf" + row + i)));
  const own = opt.pieces ? opt.own || [] : [Object.assign(demoSpec("Sora", "bowl"), { kin: null })];
  // the newest of the guest's own sits apart by the window
  const last = own.length ? own[own.length - 1] : null;
  const all = [
    ...list.map((spec) => ({ spec })),
    ...own.slice(0, -1).map((spec) => ({ spec, own: true })),
  ].slice(-18);
  rows.forEach((y, row) => {
    const sh = G();
    inked(
      sh,
      r,
      wpoly(
        r,
        [
          [70, y],
          [860, y],
          [880, y - 16],
          [90, y - 16],
        ],
        0.5,
      ),
      K.woodLt,
      K.ink,
      1.1,
    );
    inked(sh, r, wbox(r, 70, y, 860, y + 9, 0.4), K.wood, K.ink, 1);
    [100, 830].forEach((x) =>
      inked(sh, r, wbox(r, x - 6, y + 9, x + 6, y + 30, 0.3), K.woodDk, K.ink, 0.9),
    );
    groups.push(sh);
    const ps = G();
    for (let i = 0; i < 6; i++) {
      const k = row * 6 + i,
        at = all[k];
      if (!at) continue;
      const x = 140 + i * 130,
        spec = at.spec,
        s = spec.H < 20 ? 0.62 : 0.75;
      if (opt.sel === k)
        Wa(ps, r, wring(r, x, y - 40, 70, 60, 3, 12), K.gold, 0.45, "url(#bk-bleed)");
      if (at.own) {
        dashed(ps, r, x - 60, y - 120, x + 60, y + 4, K);
        kan(ps, x - 44, y - 104, "仮", K, 14);
      }
      piece(ps, r, x, y - 14, s, K, spec);
      spots.push({ i: k, x, y: y - 50, own: !!at.own });
    }
    groups.push(ps);
  });

  if (!list.length && !own.length) note(g, 465, 400, "nothing on the shelf yet", K, 18, 0.5);

  // author's own piece, waiting for me :)
  if (last) {
    const o = G(),
      ox = 970,
      oy = 600;
    dashed(o, r, ox - 66, oy - 130, ox + 66, oy + 40, K);
    piece(o, r, ox, oy - 14, last.H < 20 ? 0.62 : 0.75, K, last);
    kan(o, ox - 46, oy - 110, "仮", K, 16);
    note(o, ox, oy + 62, "yours · waiting for the host", K, 13, 0.6);
    groups.push(o);
    spots.push({ i: all.length, x: ox, y: oy - 50, own: true });
  }
  return { W, H, groups, clips: [], spots };
}
// one piece taken off the shelf
function scenePieceCard(K) {
  const r = rng(hash("tea/card")),
    W = 1100,
    H = 460,
    g = G();
  const spec = Object.assign(demoSpec("shelf13"), PROF.bowl);
  const views = [-0.6, 0, 0.6];
  views.forEach((t, i) => {
    const sp = Object.assign({}, spec, {
      paint: (spec.paint || [])
        .map((st) => ({
          ...st,
          pts: st.pts.map(([u, v]) => [u + t, v]).filter(([u]) => u > -1 && u < 1),
        }))
        .filter((st) => st.pts.length > 1),
    });
    piece(g, r, 170 + i * 230, 330, i === 1 ? 2.1 : 1.5, K, sp);
  });
  arrowLine(
    g,
    r,
    [
      [210, 410],
      [270, 420],
      [330, 410],
    ],
    K,
    0.45,
  );
  arrowLine(
    g,
    r,
    [
      [590, 410],
      [530, 420],
      [470, 410],
    ],
    K,
    0.45,
  );
  note(g, 400, 445, "drag to turn it in your hands", K, 13, 0.55);
  inked(g, r, wbox(r, 780, 110, 1040, 380, 0.8), K.paper, K.ink, 1.1);
  Tx(g, {
    t: "Hana",
    tr: "translate(910 160)",
    fs: 30,
    font: "Kalam, cursive",
    fill: K.ink,
    o: 0.85,
  });
  So(g, wbox(r, 990, 128, 1022, 160, 0.4), K.red, 0.88);
  Tx(g, { t: "花", tr: "translate(1006 145)", fs: 20, font: "'Yuji Syuku', serif", fill: K.paper });
  [
    [
      `${spec.H < 20 ? "plate" : spec.handle ? "cup" : "bowl"} · ${["buff", "red", "dark", "white"][spec.clay]} clay`,
      210,
    ],
    [`${GLAZE_NAMES[spec.glaze.c]} glaze, dipped`, 240],
    ["fired twice in the climbing kiln", 270],
    ["12 October 2026", 320],
  ].forEach(([t, y]) => note(g, 910, y, t, K, 16, 0.7));
  return { W, H, groups: [g], clips: [] };
}

// the terrace the enso leads to
const SKY = [
  [0, "#1c2132", "#262c40"],
  [4.5, "#262b40", "#4a4560"],
  [5.8, "#6f7896", "#e6b48f"],
  [7, "#a9b8c8", "#f3d9b6"],
  [10, "#bfd0db", "#eeeee4"],
  [14, "#b6ccda", "#f1eee2"],
  [17, "#c3c3c8", "#f0d5a6"],
  [18.8, "#77708c", "#e8956a"],
  [19.8, "#3e4060", "#a8686e"],
  [21, "#22283a", "#3a3a52"],
  [24, "#1c2132", "#262c40"],
];
const sstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const hhmm = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const STARL = "#f3eedf";
const SEASONS = {
  haru: { jp: "春", en: "spring", rise: 5.9, set: 19.3 },
  natsu: { jp: "夏", en: "summer", rise: 4.3, set: 21.0 },
  aki: { jp: "秋", en: "autumn", rise: 7.0, set: 18.0 },
  fuyu: { jp: "冬", en: "winter", rise: 7.7, set: 15.5 },
};
function solarH(h, S) {
  if (!S) return h;
  if (h < S.rise) return (h * 5.6) / S.rise;
  if (h < S.set) return 5.6 + ((h - S.rise) * 14) / (S.set - S.rise);
  return 19.6 + ((h - S.set) * 4.4) / (24 - S.set);
}
function hourLight(K, real, sk, sun) {
  real = ((real % 24) + 24) % 24;
  const S = sun && SEASONS[sk] ? { ...SEASONS[sk], ...sun } : SEASONS[sk],
    h = solarH(real, S);
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1][0] <= h) i++;
  const [h0, a0, b0] = SKY[i],
    [h1, a1, b1] = SKY[i + 1],
    t = (h - h0) / (h1 - h0);
  const top0 = mix(mix(a0, a1, t), K.paper, 0.15),
    low0 = mix(mix(b0, b1, t), K.paper, 0.15);
  const st = (h - 5.6) / (19.6 - 5.6),
    up = st > 0 && st < 1,
    alt = up ? Math.sin(Math.PI * st) : 0;
  const night = h < 12 ? 1 - sstep(4.8, 6.6, h) : sstep(18.6, 20.8, h);
  const gold = Math.min(
    1,
    Math.max(0, 1 - Math.abs(h - 18.5) / 1.4) + 0.6 * Math.max(0, 1 - Math.abs(h - 6.4) / 1.1),
  );
  const mt = ((((h - 18.5) % 24) + 24) % 24) / 12,
    mUp = mt < 1;
  const grey = sk === "fuyu" ? 0.22 : 0,
    top = mix(top0, "#c4c8cf", grey),
    low = mix(low0, "#d8d8d4", grey);
  return {
    h: real,
    hc: h,
    sk,
    S,
    top,
    low,
    st,
    up,
    alt,
    night,
    gold,
    mt,
    mUp,
    malt: mUp ? Math.sin(Math.PI * mt) : 0,
    lamp: Math.max(night, h > 12 ? sstep(17.8, 19.2, h) : 0),
    sunC: mix(mix("#f7e7b8", "#e0603a", gold), K.paper, 0.1),
    far: mix(mix(K.mount, K.paper, 0.35), top, 0.45),
    mid: mix(K.mount, low, 0.25),
    cloud: mix(mix(mix(low, K.paper, 0.5), "#e9967a", 0.55 * gold), top, 0.5 * night),
  };
}
function skyWash(g, r, W, y1, L) {
  for (let k = 0; k < 10; k++)
    So(
      g,
      wbox(r, -20, (y1 * k) / 10 - 8, W + 20, (y1 * (k + 1)) / 10 + 8, 2),
      mix(L.top, L.low, Math.pow(k / 9, 1.4)),
      1,
    );
}
const arcAt = (t, alt, x0, x1, yH, yTop) => [lerp(x0, x1, t), yH - alt * (yH - yTop)];

function sunDisc(g, r, x, y, rad, L) {
  Wa(
    g,
    r,
    wring(r, x, y, rad * 2.8, rad * 2.8, 2, 12),
    mix(L.sunC, L.low, 0.3),
    0.4,
    "url(#bk-pool)",
  );
  So(g, wring(r, x, y, rad, rad, rad * 0.05, 14), L.sunC, 0.95, TREM);
}

function moonDisc(g, r, x, y, rad, bite, L, op) {
  Wa(g, r, wring(r, x, y, rad * 2, rad * 2, 2, 12), STARL, 0.1 * op, "url(#bk-pool)");
  So(g, wring(r, x, y, rad, rad, 0.6, 14), mix(STARL, "#f6e2a8", 0.25), op, TREM);
  So(
    g,
    wring(r, x - rad * 0.3, y - rad * 0.15, rad * 0.28, rad * 0.22, 0.4, 8),
    mix(STARL, L.top, 0.25),
    0.45 * op,
  );
  if (bite)
    So(
      g,
      wring(r, x + rad * bite, y - rad * 0.08, rad * 1.02, rad * 1.04, 0.4, 14),
      L.top,
      0.92 * op,
    );
}
function stars(g, r, W, yH, n, op) {
  for (let k = 0; k < n; k++) {
    const s = 0.7 + r() * 1.3;
    So(g, wring(r, r() * W, r() * yH, s, s, 0, 5), STARL, op * (0.35 + r() * 0.65));
  }
}
function ridge(g, r, x0, x1, y, amp, fill, op, ink) {
  const p1 = r() * 6,
    p2 = r() * 6,
    top = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    top.push([
      lerp(x0, x1, t),
      y - amp * (0.55 + 0.3 * Math.sin(t * 5.3 + p1) + 0.2 * Math.sin(t * 11.7 + p2)),
    ]);
  }
  const d = smooth(top, false) + ` L${f1(x1)} ${f1(y + 80)} L${f1(x0)} ${f1(y + 80)} Z`;
  So(g, d, fill, (op ?? 0.9) * 0.8);
  Wa(g, r, d, fill, op ?? 0.9, "url(#bk-bleed)");
  if (ink) Ln(g, wline(r, top, 0.8), ink, 1, 0.45);
}

function skyLayer(groups, K, L, key, W, yH, moonR) {
  const g = G({ washO: 1 }),
    r = rng(hash("terrace/sky/" + key));
  groups.push(g);
  skyWash(g, r, W, yH + 30, L);
  if (L.night > 0.05) stars(g, rng(hash("stars/" + key)), W, yH * 0.85, 70, L.night);
  const sp = arcAt(L.st, L.alt, -80, W + 80, yH + 10, 70);
  if (L.up) sunDisc(g, r, sp[0], sp[1], 22 + 8 * (1 - L.alt), L);
  const mp = arcAt(L.mt, L.malt, W + 60, -60, yH + 10, 90);
  if (L.mUp) moonDisc(g, r, mp[0], mp[1], moonR || 17, 0.55, L, Math.max(0.25, L.night));
  const rc = rng(hash("clouds/" + key));
  [
    [0.08, 0.42, 120, 14],
    [0.55, 0.9, 175, 10],
    [0.3, 0.52, 60, 8],
  ].forEach(([a, b, y, h]) => mist(g, rc, a * W, b * W, y, h, L.cloud, 0.75));
  return { sp, mp };
}
function veil(groups, W, H, L) {
  const g = G({ washO: 1 }),
    d = poly([
      [0, 0],
      [W, 0],
      [W, H],
      [0, H],
    ]);
  if (L.night > 0) So(g, d, "#141a2c", 0.5 * L.night);
  if (L.gold > 0) So(g, d, "#e8904c", 0.12 * L.gold);
  if (L.hc > 5 && L.hc < 9 && L.night < 0.5) So(g, d, "#9fb4d8", 0.07);
  groups.push(g);
}

function ensoDial(groups, K, L, cx, cy, rad) {
  const g = G(),
    r = rng(hash("enso-dial")),
    inkC = mix(K.ink, STARL, L.night);
  groups.push(g);
  const pts = [];
  for (let i = 0; i <= 28; i++) {
    const a = -Math.PI / 2 + 0.3 + (i / 28) * (Math.PI * 2 - 0.55);
    pts.push([
      cx + Math.cos(a) * rad * (1 + J(r, 0.025)),
      cy + Math.sin(a) * rad * (1 + J(r, 0.025)),
    ]);
  }
  Br(g, r, pts, rad * 0.17, inkC, 0.8, { head: 0.7, tailAt: 0.72, tip: 0.15 });
  const a = -Math.PI / 2 + (L.h / 24) * Math.PI * 2;
  inked(
    g,
    r,
    wring(r, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 6, 6, 0.5, 8),
    K.red,
    inkC,
    1,
  );
  Tx(g, { t: hhmm(L.h), tr: `translate(${f1(cx)} ${f1(cy)})`, fs: 17, fill: inkC, o: 0.8 });
  if (L.S)
    Tx(g, {
      t: L.S.jp,
      tr: `translate(${f1(cx)} ${f1(cy + rad + 24)})`,
      fs: 20,
      font: "'Yuji Syuku', serif",
      fill: K.red,
      o: 0.9,
    });
}

function slab(g, r, d, fill, K, w) {
  So(g, d, mix(fill, K.paper, 0.3), 1);
  Wa(g, r, d, fill, 0.7);
  Ln(g, d, K.ink, w ?? 1.5);
}
function lampGlow(g, r, x, y, rx, ry, K, op) {
  Wa(g, r, wring(r, x, y, rx, ry, 2, 12), K.glow, 0.5 * op, "url(#bk-pool)");
  Wa(g, r, wring(r, x, y, rx * 0.5, ry * 0.5, 1, 10), K.glowSoft, 0.6 * op, "url(#bk-pool)");
}
function fireflies(g, r, x0, x1, y0, y1, n, op) {
  for (let k = 0; k < n; k++) {
    const x = lerp(x0, x1, r()),
      y = lerp(y0, y1, r());
    Wa(g, r, wring(r, x, y, 7, 7, 1, 8), "#e9f2a0", 0.35 * op, "url(#bk-pool)");
    So(g, wring(r, x, y, 1.6, 1.6, 0, 5), "#f4f8c8", op);
  }
}

function recordPlayer(g, r, x, y, s, K, L) {
  const S = (v) => v * s,
    P = (a, b) => [x + S(a), y + S(b)];
  Wa(g, r, wring(r, x + S(10), y + S(22), S(98), S(14), 1, 10), K.pool, 0.8, "url(#bk-pool)");
  inked(g, r, wpoly(r, [P(-78, -60), P(66, -80), P(70, -10), P(-74, 8)], 0.8), K.cloth, K.ink, 1.3);
  Ln(g, wpoly(r, [P(-68, -50), P(58, -68), P(61, -14), P(-65, 0)], 0.6), K.ink, 0.8, 0.5);
  inked(g, r, wpoly(r, [P(-86, 4), P(74, -14), P(96, 6), P(-66, 28)], 0.8), K.woodLt, K.ink, 1.3);
  inked(g, r, wpoly(r, [P(-66, 28), P(96, 6), P(96, 18), P(-66, 41)], 0.6), K.woodDk, K.ink, 1.2);
  inked(g, r, wring(r, x - S(4), y + S(9), S(56), S(13), 0.6, 16), K.iron, K.ink, 1.1);
  So(g, wring(r, x - S(4), y + S(8), S(51), S(11.5), 0.4, 16), mix(K.ink, "#000000", 0.3), 0.95);
  for (let k = 1; k < 4; k++)
    Ln(
      g,
      wring(r, x - S(4), y + S(8), S(51 - k * 9), S(11.5 - k * 2), 0.2, 14),
      mix(K.ink, STARL, 0.35),
      0.5,
      0.45,
      true,
    );
  So(g, wring(r, x - S(4), y + S(8), S(13), S(3.2), 0.2, 10), K.red, 0.95);
  Ln(g, wline(r, [P(70, -2), P(66, 6), P(40, 9), P(16, 10)], 0.3), K.ink, S(2.4), 0.95, true);
  inked(g, r, wring(r, x + S(70), y - S(2), S(6), S(3), 0.2, 8), K.iron, K.ink, 1);
  inked(g, r, wbox(r, x + S(10), y + S(7), x + S(18), y + S(12), 0.2), K.iron, K.ink, 0.8);
}
function sleeve(g, r, pts, K, seed) {
  inked(g, r, wpoly(r, pts, 0.8), seed % 2 ? K.cloth : K.paper, K.ink, 1.2);
  const m = quadMap(...pts);
  So(
    g,
    wpoly(r, [m(0.12, 0.14), m(0.88, 0.14), m(0.88, 0.5), m(0.12, 0.5)], 0.6),
    seed % 2 ? K.gold : K.ink,
    0.85,
  );
  const c = m(0.62, 0.7);
  So(g, wring(r, c[0], c[1], 9, 9, 0.6, 10), K.red, 0.9, TREM);
}
function teaCup(groups, g, r, x, y, K, mini) {
  Wa(g, r, wring(r, x + 4, y + 2, 16, 4, 0.6, 8), K.pool, 0.8, "url(#bk-pool)");
  inked(
    g,
    r,
    wpoly(
      r,
      [
        [x - 10, y - 22],
        [x + 10, y - 22],
        [x + 9, y],
        [x - 9, y],
      ],
      0.6,
    ),
    mix(K.stone, K.moss, 0.35),
    K.ink,
    1.1,
  );
  Ln(g, wring(r, x, y - 22, 10, 2.6, 0.3, 8), K.ink, 0.9, 0.8);
  if (!mini) steam(groups, r, x, y - 28, K, 2);
}

function andon(g, lg, r, x, y, K, lit) {
  inked(
    g,
    r,
    wpoly(
      r,
      [
        [x - 15, y - 54],
        [x + 15, y - 54],
        [x + 16, y],
        [x - 16, y],
      ],
      0.6,
    ),
    lit > 0.3 ? mix(K.paper, K.glow, 0.5) : K.fusuma,
    K.ink,
    1.2,
  );
  for (const v of [-0.33, 0.33])
    Ln(g, wseg(r, [x + v * 30, y - 54], [x + v * 32, y], 0.3, 2), K.woodDk, 0.8, 0.7, true);
  Ln(g, wseg(r, [x - 15, y - 27], [x + 16, y - 27], 0.3, 2), K.woodDk, 0.8, 0.7, true);
  [
    [-18, -58],
    [18, -58],
  ].forEach(([a, b]) =>
    Ln(g, wseg(r, [x + a, y + b], [x + a * 0.95, y + 6], 0.3, 2), K.woodDk, 2.2, 0.95, true),
  );
  if (lit > 0.05) {
    lampGlow(lg, r, x, y - 28, 90, 60, K, lit);
    So(
      lg,
      wpoly(
        r,
        [
          [x - 14, y - 52],
          [x + 14, y - 52],
          [x + 15, y - 2],
          [x - 15, y - 2],
        ],
        0.4,
      ),
      K.glow,
      0.55 * lit,
    );
  }
}

function seasonLook(K, sk) {
  const s = sk || "aki";
  return {
    s,
    snow: s === "fuyu",
    ground: {
      haru: mix(K.moss, "#a9c27a", 0.18),
      natsu: mix(K.moss, K.mossDk, 0.3),
      aki: mix(mix(K.moss, K.mossDk, 0.25), K.earth, 0.16),
      fuyu: mix(K.moss, K.paper, 0.72),
    }[s],
    mound:
      s === "fuyu"
        ? mix(K.mossDk, K.paper, 0.35)
        : s === "aki"
          ? mix(K.mossDk, K.earth, 0.15)
          : K.mossDk,
    crown: {
      haru: { maple: "#e7b3bd", redWarmer: "#f4dade" },
      natsu: { maple: mix(K.mossDk, "#4c7a30", 0.45), redWarmer: mix(K.moss, "#9cc25a", 0.4) },
      aki: {},
      fuyu: null,
    }[s],
    fall: { haru: "#efc4cc", natsu: null, aki: K.maple, fuyu: "#f6f4ee" }[s],
    blind: { haru: 236, natsu: 300, aki: 236, fuyu: 0 }[s],
    chime: { haru: "風", natsu: "涼" }[s] || null,
  };
}
const SNOW = "#f5f3ec";
function snowCap(g, r, pts, w) {
  Br(g, r, pts, w, SNOW, 0.97, { blunt: true, tip: 0.4 });
  Ln(
    g,
    wline(
      r,
      pts.map(([x, y]) => [x, y + w * 0.35]),
      0.3,
    ),
    "#9fb0c4",
    0.7,
    0.5,
  );
}
function arcTop(cx, cy, rx, ry, n) {
  const p = [];
  for (let i = 0; i <= (n || 6); i++) {
    const a = Math.PI * (1.08 + (i / (n || 6)) * 0.84);
    p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return p;
}

function falling(g, r, kind, color, n, x0, x1, y0, y1) {
  for (let k = 0; k < n; k++) {
    const x = lerp(x0, x1, r()),
      y = lerp(y0, y1, r()),
      a = r() * 3;
    if (kind === "fuyu") {
      const s = 1.1 + r() * 1.8;
      So(g, wring(r, x, y, s, s, 0.2, 6), color, 0.75 + r() * 0.25);
      continue;
    }
    const rx = kind === "aki" ? 4 : 3.2,
      ry = kind === "aki" ? 2.6 : 1.7;
    So(
      g,
      wpoly(
        r,
        [
          [x - rx * Math.cos(a), y - rx * Math.sin(a)],
          [x + ry * Math.sin(a), y - ry * Math.cos(a)],
          [x + rx * Math.cos(a), y + rx * Math.sin(a)],
          [x - ry * Math.sin(a), y + ry * Math.cos(a)],
        ],
        0.4,
      ),
      color,
      0.8 + r() * 0.2,
      TREM,
    );
  }
}
// small celadon burner
function koro(groups, g, r, x, y, K, mini, burnt, unlit) {
  Wa(g, r, wring(r, x + 3, y + 2, 22, 5, 0.6, 8), K.pool, 0.8, "url(#bk-pool)");
  const body = `M${x - 17} ${y - 13} Q${x - 19} ${y - 1} ${x - 8} ${y + 1} L${x + 8} ${y + 1} Q${x + 19} ${y - 1} ${x + 17} ${y - 13} Z`;
  [
    [-11, 1],
    [0, 3],
    [11, 1],
  ].forEach(([dx, dy]) =>
    inked(
      g,
      r,
      wbox(r, x + dx - 2, y + dy - 2, x + dx + 2, y + dy + 3, 0.2),
      mix(K.mountLt, K.moss, 0.3),
      K.ink,
      0.8,
    ),
  );
  So(g, body, mix(mix(K.mountLt, K.moss, 0.3), K.paper, 0.2), 1);
  Ln(g, body, K.ink, 1.1, 0.95);
  So(g, wring(r, x, y - 13, 17, 4, 0.3, 10), mix(K.stone, K.paper, 0.45), 1);
  Ln(g, wring(r, x, y - 13, 17, 4, 0.3, 10), K.ink, 0.9, 0.85);
  const len = 40 * (1 - (burnt ?? 0.35)),
    tip = [x + 3 + len * 0.12, y - 13 - len];
  Ln(g, wseg(r, [x + 3, y - 13], tip, 0.2, 1), mix(K.earth, K.ink, 0.25), 1.6, 0.95, true);
  if (!unlit)
    Ln(
      g,
      wline(r, [tip, [tip[0] + 2, tip[1] - 3], [tip[0] + 1, tip[1] - 6]], 0.2),
      K.stone,
      1.4,
      0.8,
      true,
    );
  if (unlit) return;
  So(g, wring(r, tip[0], tip[1] + 1, 1.6, 1.6, 0, 6), K.red, 1);
  So(g, wring(r, x + 6, y - 13, 3, 1, 0.2, 6), K.stone, 0.8);
  const sm = G({
    anim: mini ? "none" : "drift 11s ease-in-out infinite",
    to: `${f1(tip[0])}px ${f1(tip[1])}px`,
    washO: 0.4,
  });
  groups.push(sm);
  const t0 = tip[1] - 6,
    pts = [
      [tip[0] + 1, t0],
      [tip[0] - 2, t0 - 26],
      [tip[0] + 3, t0 - 58],
      [tip[0] - 4, t0 - 92],
      [tip[0] + 8, t0 - 120],
      [tip[0] - 2, t0 - 146],
      [tip[0] - 16, t0 - 160],
    ];
  Ln(sm, wline(r, pts.slice(0, 4), 0.6), K.inkSoft, 1.1, 0.55);
  Ln(sm, wline(r, pts.slice(3), 0.9), K.inkSoft, 0.9, 0.3);
  Wa(sm, r, mistD(r, tip[0] - 26, tip[0] + 14, t0 - 150, 12), K.inkSoft, 0.25, "url(#bk-bleed)");
}
// veranda of old house
function sceneEngawa(K, hour, mini, sk, o = {}) {
  const W = 1100,
    H = 640,
    L = hourLight(K, hour, sk, o.sun),
    Z = seasonLook(K, sk),
    groups = [],
    R = (k) => rng(hash("terrace/engawa/" + k));
  const { mp } = skyLayer(groups, K, L, "engawa", W, 360);
  const far = G(),
    r = R("far");
  groups.push(far);
  ridge(far, r, -20, W + 20, 330, 90, Z.snow ? mix(L.far, SNOW, 0.35) : L.far, 0.85);
  ridge(far, r, 300, W + 20, 365, 55, Z.snow ? mix(L.mid, SNOW, 0.3) : L.mid, 0.9, K.inkSoft);
  mist(far, r, 260, 1000, 352, 22, mix(L.low, K.paper, 0.4), 0.35 + 0.4 * (L.hc < 9 ? 1 : 0));

  const gw = G({ still: true }),
    gg = G(),
    gd = G({ still: true }),
    rg = R("garden");
  groups.push(gw, gg, gd);
  So(gg, wbox(rg, -20, 362, W + 20, H + 20, 3), mix(Z.ground, L.low, 0.08), 1);
  const mounds = [
    [880, 398, 64, 24],
    [1070, 432, 80, 30],
    [640, 468, 56, 22],
    [700, 452, 40, 18],
  ];
  mounds.forEach(([x, y, a, b]) => {
    inked(
      gd,
      rg,
      smooth(
        [
          [x - a, y + 4],
          [x - a * 0.7, y - b * 0.8],
          [x, y - b],
          [x + a * 0.75, y - b * 0.7],
          [x + a, y + 4],
        ],
        false,
      ) + " Z",
      Z.mound,
      K.ink,
      1.1,
    );
    for (let k = 0; k < 8; k++)
      Ln(
        gd,
        wseg(
          rg,
          [x + J(rg, a * 0.7), y - b * 0.4 + J(rg, b * 0.3)],
          [x + J(rg, a * 0.7) + 4, y - b * 0.4 + J(rg, b * 0.3) - 2],
          0.2,
          1,
        ),
        K.ink,
        0.9,
        0.45,
        true,
      );
  });
  Wa(
    gd,
    rg,
    mistD(rg, 560, 1120, 420, 60),
    Z.snow ? K.stone : K.mossDk,
    Z.snow ? 0.25 : 0.5,
    "url(#bk-bleed)",
  );
  Wa(
    gd,
    rg,
    mistD(rg, 820, 1120, 520, 140),
    Z.snow ? K.stone : K.mossDk,
    Z.snow ? 0.2 : 0.45,
    "url(#bk-bleed)",
  );
  Ln(
    gd,
    wline(
      rg,
      [
        [860, 395],
        [950, 430],
        [1010, 470],
        [1100, 520],
      ],
      1.5,
    ),
    K.ink,
    1,
    0.35,
  );
  const steps = [
    [900, 440, 26, 10],
    [960, 474, 30, 11],
    [1030, 510, 34, 12],
  ];
  steps.forEach(([x, y, a, b]) => stone(gd, rg, x, y, a, b, K));

  // tree
  Br(
    gd,
    rg,
    [
      [985, 420],
      [978, 360],
      [990, 300],
      [970, 250],
    ],
    10,
    K.ink,
    0.9,
    { head: 0.9, tip: 0.5 },
  );
  Br(
    gd,
    rg,
    [
      [982, 330],
      [1030, 300],
      [1070, 300],
    ],
    5,
    K.ink,
    0.85,
    { tip: 0.3 },
  );
  Br(
    gd,
    rg,
    [
      [985, 290],
      [940, 262],
      [900, 262],
    ],
    4.5,
    K.ink,
    0.85,
    { tip: 0.3 },
  );
  if (Z.crown)
    maple(
      gd,
      rg,
      985,
      270,
      Z.s === "natsu" ? 125 : 115,
      Z.s === "natsu" ? 260 : Z.s === "haru" ? 210 : 170,
      Object.assign({}, K, Z.crown),
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
        const a = -Math.PI / 2 + (i % 2 ? 0.9 : -0.9) * (0.3 + rg()),
          l = 26 + rg() * 30;
        const e = [x + Math.cos(a) * l, y + Math.sin(a) * l];
        Br(
          gd,
          rg,
          [[x, y], [lerp(x, e[0], 0.5) + J(rg, 4), lerp(y, e[1], 0.5)], e],
          2.2,
          K.ink,
          0.85,
          { tip: 0.2 },
        );
        if (k === 0)
          snowCap(
            gd,
            rg,
            [
              [lerp(x, e[0], 0.15), lerp(y, e[1], 0.15) - 2],
              [lerp(x, e[0], 0.6), lerp(y, e[1], 0.6) - 2],
            ],
            2.6,
          );
      }
    });
    snowCap(
      gd,
      rg,
      [
        [990, 327],
        [1030, 297],
        [1068, 296],
      ],
      3.4,
    );
    snowCap(
      gd,
      rg,
      [
        [978, 287],
        [940, 259],
        [904, 258],
      ],
      3.2,
    );
  }
  const lights = G({ washO: 1 }),
    rl = R("lights");
  lantern(gd, rg, 820, 452, 0.62, K, L.lamp > 0.5);
  if (Z.snow) {
    mounds.forEach(([x, y, a, b]) =>
      snowCap(
        gd,
        rg,
        [
          [x - a * 0.8, y - b * 0.35],
          [x - a * 0.5, y - b * 0.85],
          [x, y - b - 1],
          [x + a * 0.55, y - b * 0.78],
          [x + a * 0.8, y - b * 0.3],
        ],
        b * 0.5,
      ),
    );
    steps.forEach(([x, y, a, b]) => snowCap(gd, rg, arcTop(x, y - 1, a * 0.85, b * 0.9), b * 0.55));
    snowCap(
      gd,
      rg,
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
  [gw.wash, gd.wash] = [gd.wash, []];
  const hs = G({ still: true }),
    rh = R("house");
  groups.push(hs);
  const eave = (x) => lerp(70, 22, (x + 10) / 1120),
    beam = (x) => lerp(108, 74, (x + 10) / 820);
  inked(
    hs,
    rh,
    wpoly(
      rh,
      [
        [-10, -10],
        [W + 10, -10],
        [W + 10, eave(W + 10)],
        [-10, eave(-10)],
      ],
      1,
    ),
    mix(K.woodDk, K.ink, 0.25),
    K.ink,
    1.4,
  );
  for (let x = 20; x < W; x += 38) {
    Ln(hs, wseg(rh, [x, eave(x) - 2], [x - 34, -10], 0.6, 2), K.ink, 2.2, 0.6, true);
    inked(hs, rh, wbox(rh, x - 4, eave(x) - 7, x + 4, eave(x) + 1, 0.4), K.woodLt, K.ink, 0.8);
  }
  if (Z.snow) {
    snowCap(
      hs,
      rh,
      [
        [-10, eave(-10) + 1],
        [360, eave(360) + 2],
        [740, eave(740) + 1],
        [W + 10, eave(W + 10) + 2],
      ],
      7,
    );
    for (let x = 40; x < W; x += 52 + rh() * 40) {
      const y = eave(x) + 3,
        l = 8 + rh() * 22;
      So(
        hs,
        wpoly(
          rh,
          [
            [x - 2.5, y],
            [x + 2.5, y],
            [x + 0.3, y + l],
          ],
          0.2,
        ),
        mix(SNOW, "#bcd0e2", 0.4),
        0.95,
      );
      Ln(hs, wseg(rh, [x - 2, y], [x, y + l], 0.1, 1), "#8fa3ba", 0.6, 0.6, true);
    }
  }
  const fl = { A: [-10, 548], B: [835, 490], C: [912, H + 10], D: [-10, H + 10] },
    edge = (x) => lerp(548, 490, (x + 10) / 845);
  inked(hs, rh, wbox(rh, -10, beam(-10) - 22, 140, 548, 0.8), K.fusuma, K.ink, 1.2);
  for (let y = beam(-10); y < 548; y += 46)
    Ln(hs, wseg(rh, [-10, y], [140, y - 6], 0.4, 2), K.woodDk, 0.9, 0.7, true);
  for (let x = 18; x < 140; x += 34)
    Ln(hs, wseg(rh, [x, beam(x) - 18], [x, 546], 0.4, 3), K.woodDk, 0.9, 0.7, true);
  if (L.lamp > 0.05) So(lights, wbox(rl, -8, beam(-10) - 18, 136, 544, 0.6), K.glow, 0.5 * L.lamp);
  inked(
    hs,
    rh,
    wpoly(
      rh,
      [
        [-10, beam(-10) - 14],
        [840, beam(840) - 12],
        [840, beam(840) + 4],
        [-10, beam(-10) + 6],
      ],
      0.6,
    ),
    K.wood,
    K.ink,
    1.3,
  );
  [
    [150, 26],
    [790, 16],
  ].forEach(([x, w]) =>
    inked(
      hs,
      rh,
      wbox(rh, x - w / 2, beam(x) - 10, x + w / 2, edge(x) + 4, 0.6),
      x < 400 ? K.wood : mix(K.wood, K.ink, 0.1),
      K.ink,
      1.4,
    ),
  );
  // reed blind
  const sx0 = 168,
    sx1 = 470,
    sb = Z.blind || beam(sx0) + 20;
  if (Z.blind) {
    Wa(
      hs,
      rh,
      wpoly(
        rh,
        [
          [sx0, beam(sx0) + 4],
          [sx1, beam(sx1) + 4],
          [sx1, sb - 6],
          [sx0, sb - 2],
        ],
        0.6,
      ),
      K.bamboo,
      0.55,
    );
    for (let y = 0; y < sb - beam(sx0) - 6; y += 4.5)
      Ln(
        hs,
        wseg(rh, [sx0, beam(sx0) + 6 + y], [sx1, beam(sx1) + 6 + y], 0.3, 3),
        mix(K.bamboo, K.ink, 0.35),
        0.6,
        0.5,
        true,
      );
  }
  inked(
    hs,
    rh,
    wpoly(
      rh,
      [
        [sx0 - 4, sb - 8],
        [sx1 + 4, sb - 12],
        [sx1 + 4, sb + 6],
        [sx0 - 4, sb + 10],
      ],
      0.8,
    ),
    K.bamboo,
    K.ink,
    1.2,
  );
  [240, 400].forEach((x) => cordTie(hs, rh, x, sb - 1, 0.6, K));
  // wind chime
  const fx = 610,
    fy = beam(fx);
  if (Z.chime) {
    const chime = G({
        anim: mini ? "none" : "sway 4.5s ease-in-out infinite",
        to: `${fx}px ${fy}px`,
      }),
      rc = R("chime");
    groups.push(chime);
    Ln(chime, wseg(rc, [fx, fy], [fx, fy + 52], 0.3, 2), K.ink, 0.8, 0.8, true);
    inked(
      chime,
      rc,
      smooth(
        [
          [fx - 15, fy + 70],
          [fx - 13, fy + 56],
          [fx, fy + 50],
          [fx + 13, fy + 56],
          [fx + 15, fy + 70],
        ],
        false,
      ) + " Z",
      mix(K.mountLt, K.paper, 0.4),
      K.ink,
      1.1,
    );
    Ln(chime, wseg(rc, [fx, fy + 62], [fx, fy + 92], 0.3, 2), K.ink, 0.7, 0.8, true);
    inked(chime, rc, wbox(rc, fx - 7, fy + 92, fx + 7, fy + 140, 0.4), K.paper, K.ink, 0.9);
    Tx(chime, {
      t: Z.chime,
      tr: `translate(${fx} ${fy + 114})`,
      fs: 12,
      font: "'Yuji Syuku', serif",
      fill: K.red,
      o: 0.9,
    });
  } else inked(hs, rh, wbox(rh, fx - 3, fy - 2, fx + 3, fy + 5, 0.2), K.iron, K.ink, 0.8);
  // floor
  const fg = G(),
    rf = R("floor");
  groups.push(fg);
  const m = quadMap(fl.A, fl.B, fl.C, fl.D);
  slab(fg, rf, wpoly(rf, [fl.A, fl.B, fl.C, fl.D], 1), K.woodLt, K);
  for (let k = 1; k < 9; k++) {
    const t = Math.pow(k / 9, 1.3);
    Ln(fg, wline(rf, [m(0, t), m(0.5, t), m(1, t)], 0.6), K.woodDk, 0.9, 0.6, true);
  }
  for (let k = 0; k < 7; k++) {
    const s = rf(),
      t = Math.floor(rf() * 8) / 9;
    const a = m(s, Math.pow(t, 1.3)),
      b = m(s + 0.01, Math.pow(t + 1 / 9, 1.3));
    Ln(fg, wseg(rf, a, b, 0.3, 1), K.woodDk, 0.8, 0.55, true);
  }
  Ln(fg, wline(rf, [fl.A, m(0.5, 0), fl.B], 0.6), K.ink, 2.4, 0.9);
  const reach = L.up ? lerp(0.85, 0.15, L.alt) : 0;
  So(
    fg,
    wpoly(rf, [m(0, reach), m(1, reach), m(1, 1.02), m(0, 1.02)], 1),
    K.ink,
    0.13 * (1 - L.night),
  );
  if (L.up)
    Wa(
      fg,
      rf,
      wpoly(rf, [m(0, 0.01), m(1, 0.01), m(1, reach), m(0, reach)], 1),
      mix(L.sunC, K.paper, 0.4),
      0.35 * (0.4 + L.gold),
      "url(#bk-bleed)",
    );
  if (Z.snow) snowCap(fg, rf, [m(0.62, 0.02), m(0.8, 0.01), m(0.99, 0.015), m(1, 0.12)], 4);
  inked(fg, rf, wring(rf, 960, 600, 46, 16, 2, 10), K.stone, K.ink, 1.3);
  if (Z.snow) snowCap(fg, rf, arcTop(960, 599, 40, 14), 6);
  [
    [940, 594],
    [968, 602],
  ].forEach(([x, y]) => {
    inked(
      fg,
      rf,
      wpoly(
        rf,
        [
          [x - 9, y - 4],
          [x + 9, y - 6],
          [x + 11, y + 2],
          [x - 7, y + 4],
        ],
        0.4,
      ),
      K.wood,
      K.ink,
      1,
    );
    Ln(
      fg,
      wline(
        rf,
        [
          [x - 5, y - 2],
          [x + 1, y - 5],
          [x + 6, y - 2],
        ],
        0.2,
      ),
      K.red,
      1.4,
      0.95,
      true,
    );
  });
  // things on the boards
  const ob = G(),
    ro = R("things");
  groups.push(ob);
  if (L.up) {
    const dx = Math.max(-260, Math.min(260, (150 - lerp(-80, W + 80, L.st)) * 0.5 * (1.2 - L.alt)));
    Wa(
      ob,
      ro,
      wpoly(
        ro,
        [
          [137, edge(137) + 2],
          [163, edge(163) + 2],
          [163 + dx, edge(163) + 70 * (1 - L.alt) + 12],
          [137 + dx, edge(137) + 70 * (1 - L.alt) + 16],
        ],
        1,
      ),
      K.ink,
      0.22 * (1 - L.night),
      "url(#bk-bleed)",
    );
  }
  inked(
    ob,
    ro,
    wpoly(
      ro,
      [
        [208, 572],
        [318, 560],
        [338, 612],
        [218, 626],
      ],
      1.5,
    ),
    K.cloth,
    K.ink,
    1.3,
  );
  Ln(ob, wseg(ro, [262, 592], [278, 590], 0.4, 1), K.ink, 1.4, 0.7, true);
  sleeve(
    ob,
    ro,
    [
      [168, 488],
      [238, 476],
      [244, 548],
      [174, 556],
    ],
    K,
    1,
  );
  sleeve(
    ob,
    ro,
    [
      [400, 600],
      [462, 592],
      [470, 630],
      [404, 638],
    ],
    K,
    0,
  );
  teaCup(groups, ob, ro, 360, 586, K, mini);
  koro(groups, ob, ro, 424, 566, K, mini, o.burnt, o.unlit);
  recordPlayer(ob, ro, 548, 548, 1, K, L);
  andon(ob, lights, ro, 712, 528, K, o.lamp ?? L.lamp);
  // what the season puts in the air, and what has come down on the boards
  if (Z.fall) {
    const air = G(),
      ra = R("air/" + Z.s);
    groups.push(air);
    const n = Z.snow ? (mini ? 90 : 160) : mini ? 14 : 24;
    falling(air, ra, Z.s, Z.fall, n, Z.snow ? 0 : 560, W, Z.snow ? 60 : 200, Z.snow ? H : 560);
    if (!Z.snow) {
      falling(air, ra, Z.s, Z.fall, 9, 560, 1100, 380, 560);
      for (let k = 0; k < 5; k++) {
        const [x, y] = m(0.55 + ra() * 0.4, 0.05 + ra() * 0.35);
        falling(air, ra, Z.s, Z.fall, 1, x, x + 2, y, y + 2);
      }
    }
  }
  if (L.lamp > 0.5) lampGlow(lights, rl, 820, 410, 34, 26, K, L.lamp);
  if (L.night > 0.4 && Z.s === "natsu") fireflies(lights, rl, 860, 1090, 380, 500, 9, L.night);
  veil(groups, W, H, L);
  groups.push(lights);
  if (L.mUp && L.night > 0.3 && mp[0] > 860) {
    const lm = G({ washO: 1 });
    moonDisc(lm, rl, mp[0], mp[1], 17, 0.55, L, L.night * 0.9);
    groups.push(lm);
  }
  if (!mini) ensoDial(groups, K, L, 1050, 98, 32);
  return { W, H, groups, clips: [] };
}

// cards
function washi(g, r, x, y, w, h, K, tilt) {
  const pts = [],
    tl = tilt || 0,
    P = (px, py) => [x + px + py * tl, y + py - px * tl];
  for (let i = 0; i <= 10; i++) pts.push(P((w * i) / 10 + J(r, 1.5), J(r, 1.2)));
  for (let i = 1; i <= 8; i++) pts.push(P(w + J(r, 1.6), (h * i) / 9));
  for (let i = 0; i <= 22; i++)
    pts.push(P(w - (w * i) / 22, h + J(r, 5) + Math.sin(i * 1.7) * 2.5));
  for (let i = 8; i >= 1; i--) pts.push(P(J(r, 1.6), (h * i) / 9));
  const d = poly(pts);
  Wa(g, r, poly(pts.map(([a, b]) => [a + 7, b + 9])), K.pool, 0.9, "url(#bk-pool)");
  So(g, d, mix(K.paper, K.gold, 0.08), 1, TREM);
  Wa(g, r, d, mix(K.paper, K.tape || K.gold, 0.25), 0.35, "url(#bk-bleed)");
  for (let k = 0; k < Math.round((w * h) / 9000); k++) {
    const a = P(r() * w, r() * h);
    Ln(
      g,
      wline(
        r,
        [a, [a[0] + 6 + r() * 10, a[1] + J(r, 4)], [a[0] + 12 + r() * 12, a[1] + J(r, 5)]],
        0.5,
      ),
      K.inkSoft,
      0.5,
      0.18,
      true,
    );
  }
  Ln(g, d, K.ink, 0.9, 0.55);
  return P;
}
function hanko(g, r, x, y, sz, txt, K) {
  So(g, wbox(r, x - sz / 2, y - sz / 2, x + sz / 2, y + sz / 2, sz * 0.04), K.red, 0.88, TREM);
  Tx(g, {
    t: txt,
    tr: `translate(${f1(x)} ${f1(y)})`,
    fs: sz * (txt.length > 1 ? 0.42 : 0.66),
    font: "'Yuji Syuku', serif",
    fill: K.paper,
    wm: txt.length > 1 ? "vertical-rl" : "horizontal-tb",
  });
}
// left-aligned lines
function para(g, text, x, y, w, fs, K, o) {
  const max = Math.floor(w / (fs * 0.47)),
    lines = [""];
  text.split(" ").forEach((wd) => {
    if ((lines[lines.length - 1] + " " + wd).trim().length > max) lines.push(wd);
    else lines[lines.length - 1] = (lines[lines.length - 1] + " " + wd).trim();
  });
  lines.forEach((t, i) =>
    Tx(
      g,
      Object.assign(
        {
          t,
          tr: `translate(${f1(x)} ${f1(y + i * fs * 1.45)})`,
          fs,
          fill: K.ink,
          o: 0.85,
          an: "start",
        },
        o || {},
      ),
    ),
  );
  return y + lines.length * fs * 1.45;
}
// object drawn by its own scene code
function vignette(groups, x, y, s, draw) {
  const gs = [],
    g = G();
  gs.push(g);
  draw(gs, g);
  gs.forEach((q) => {
    q.tf = `translate(${f1(x)}px, ${f1(y)}px) scale(${s})`;
    q.to = "0px 0px";
    q.anim = "none";
    groups.push(q);
  });
}
// frame every card shares
function cardFrame(groups, K, key, x, y, w, h, jp, en, seal) {
  const g = G(),
    r = rng(hash("card/" + key));
  groups.push(g);
  washi(g, r, x, y, w, h, K, 0);
  const pts = [];
  for (let i = 0; i <= 22; i++) {
    const a = -2.2 + (i / 22) * 5.6;
    pts.push([x + 200 + Math.cos(a) * 118, y + 150 + Math.sin(a) * 104]);
  }
  BrW(g, r, pts, 20, K.inkSoft, 0.22, { tip: 0.2 });
  Tx(g, {
    t: jp,
    tr: `translate(${f1(x + w - 46)} ${f1(y + 40 + jp.length * 22)})`,
    fs: 40,
    font: "'Yuji Syuku', serif",
    fill: K.ink,
    wm: "vertical-rl",
    o: 0.92,
  });
  Br(
    g,
    r,
    [
      [x + w - 28, y + 26],
      [x + w - 18, y + 36],
    ],
    2.6,
    K.ink,
    0.7,
  );
  Br(
    g,
    r,
    [
      [x + w - 18, y + 26],
      [x + w - 28, y + 36],
    ],
    2.6,
    K.ink,
    0.7,
  );
  Tx(g, { t: en, tr: `translate(${f1(x + 36)} ${f1(y + 296)})`, fs: 30, fill: K.ink, an: "start" });
  Ln(
    g,
    wline(
      r,
      [
        [x + 36, y + 318],
        [x + 200, y + 316],
        [x + w - 120, y + 319],
      ],
      0.8,
    ),
    K.ink,
    1,
    0.35,
  );
  if (seal) hanko(g, r, x + w - 50, y + h - 56, 38, seal, K);
  const t = G();
  groups.push(t);
  return { g: t, r: rng(hash("card/" + key + "/t")), x0: x + 36, w: w - 72, y0: y + 352 };
}
function knob(g, r, x, y, jp, en, K, on) {
  inked(
    g,
    r,
    wring(r, x, y, 21, 21, 1, 10),
    on ? mix(K.red, K.paper, 0.75) : mix(K.paper, K.stone, 0.25),
    K.ink,
    1.1,
  );
  Tx(g, {
    t: jp,
    tr: `translate(${f1(x)} ${f1(y)})`,
    fs: 20,
    font: "'Yuji Syuku', serif",
    fill: on ? K.red : K.ink,
  });
  Tx(g, { t: en, tr: `translate(${f1(x)} ${f1(y + 36)})`, fs: 14, fill: K.ink, o: 0.7 });
}
// one card for the site
const CARD = {
  record: [
    "蓄音機",
    "the record player",
    null,
    (gs, g, K) => {
      const r = rng(hash("vig/rec"));
      recordPlayer(g, r, 0, 0, 1, K, hourLight(K, 17.6, "aki"));
      sleeve(
        g,
        r,
        [
          [-118, -26],
          [-80, -36],
          [-76, 2],
          [-114, 10],
        ],
        K,
        1,
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
    (gs, g, K, o) => koro(gs, g, rng(hash("vig/koro")), 0, 0, K, true, o.burnt ?? 0, !o.lit),
    200,
    268,
    1.25,
  ],
  tree: [
    "七十二候",
    "the season, small",
    "候",
    (gs, g, K, o) => {
      const r = rng(hash("vig/maple")),
        Z = seasonLook(K, o.season);
      Br(
        g,
        r,
        [
          [20, 210],
          [110, 160],
          [210, 140],
          [300, 96],
        ],
        7,
        K.ink,
        0.9,
        { head: 0.9, tip: 0.3 },
      );
      Br(
        g,
        r,
        [
          [150, 152],
          [190, 190],
          [240, 200],
        ],
        3.5,
        K.ink,
        0.85,
        { tip: 0.3 },
      );
      if (Z.crown) {
        const k = Object.assign({}, K, Z.crown);
        maple(g, r, 230, 120, 70, 70, k);
        maple(g, r, 210, 196, 40, 30, k);
      } else {
        snowCap(
          g,
          r,
          [
            [40, 196],
            [110, 156],
            [210, 136],
            [296, 92],
          ],
          4,
        );
      }
      if (Z.s === "aki")
        [
          [110, 60],
          [140, 44],
          [170, 32],
          [126, 76],
          [150, 90],
        ].forEach(([gx, gy]) =>
          Ln(
            g,
            wline(
              r,
              [
                [gx - 8, gy + 3],
                [gx, gy],
                [gx + 9, gy + 4],
              ],
              0.4,
            ),
            K.ink,
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
  sky: [
    "灯籠",
    "today's sky",
    "空",
    (gs, g, K) => lantern(g, rng(hash("vig/lantern")), 0, 0, 1, K, true),
    200,
    262,
    2,
  ],
  tea: [
    "茶",
    "the tea",
    "茶",
    (gs, g, K) => teaCup(gs, g, rng(hash("vig/tea")), 0, 0, K, false),
    210,
    280,
    2,
  ],
};
function cardShell(K, key, h, o) {
  const [jp, en, seal, draw, vx, vy, vs] = CARD[key],
    groups = [];
  cardFrame(groups, K, key, 6, 6, 520, h, jp, en, seal);
  vignette(groups, 6 + vx, 6 + vy, vs, (gs, g) => draw(gs, g, K, o || {}));
  return { W: 540, H: h + 22, groups, clips: [], y0: 358 };
}

export {
  C,
  mix,
  tones2,
  setPrec,
  TONE_CSS,
  FILTERS,
  groupSvg,
  toSvg,
  leafD,
  f1,
  leafSpray,
  J,
  So,
  Ln,
  TREM,
  culmGeo,
  culmPart,
  lerp,
  wpoly,
  Wa,
  WASH,
  wline,
  smooth,
  cutFace,
  culmTop,
  CULMS,
  edgeHit,
  bambooClump,
  G,
  wring,
  rng,
  hash,
  sceneBamboo,
  Tx,
  dry,
  fingertip,
  BrW,
  brushD,
  Br,
  CLAYS,
  piece,
  radAt,
  GLAZES,
  PAINTS,
  spot,
  inked,
  kan,
  note,
  wheel,
  wbox,
  GLAZE_NAMES,
  PROF,
  demoSpec,
  spin,
  wetClay,
  arrowLine,
  bucket,
  brushTool,
  KX,
  noren,
  quad,
  wseg,
  workshopWalls,
  face,
  postV,
  dryingBench,
  noborigama,
  chamber,
  workshopInside,
  sceneGarden16,
  steppingStones,
  stone,
  OB,
  gableRoof,
  thatchStrokes,
  ridge,
  plaque,
  sekiStone,
  stoneBody,
  mist,
  mistD,
  frames,
  sceneWorkshop,
  ZP,
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
  solarH,
  SKY,
  sstep,
  seasonLook,
  maple,
  skyLayer,
  stars,
  STARL,
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
  teaCup,
  steam,
  koro,
  recordPlayer,
  andon,
  lampGlow,
  falling,
  fireflies,
  veil,
  poly,
  ensoDial,
  hhmm,
  washi,
  hanko,
  para,
  vignette,
  cardFrame,
  knob,
  cardShell,
  CARD,
};
