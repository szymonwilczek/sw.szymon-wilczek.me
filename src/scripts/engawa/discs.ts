export interface Kit {
  ctx: BaseAudioContext;
  bus: AudioNode;
  echo: AudioNode;
  noise: AudioBuffer;
}

export interface Disc {
  jp: string;
  title: string;
  by: string;
  about: (hour: number) => string;
  bpm?: (hour: number) => number;
  play?: (k: Kit, t: number, step: number, beat: number, hour: number) => void;
  top?: number;
  wow?: number;
  level?: number;
  src?: string;
  credit?: { licence: string; licenceUrl: string; url: string };
}

const NAMES = ["D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B", "C", "C♯"];
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const hum = () => 0.75 + Math.random() * 0.25;

// chords as intervals over a root
const CH = {
  m9: [0, 3, 7, 10, 14],
  m11: [0, 3, 10, 14, 17],
  m7: [0, 3, 7, 10],
  m6: [0, 3, 7, 9],
  d9: [0, 4, 10, 14],
  d13: [0, 4, 10, 14, 21],
  d7s9: [0, 4, 10, 15],
  d7b9: [0, 4, 10, 13],
  sus: [0, 5, 10, 14],
  M9: [0, 4, 7, 11, 14],
  M69: [0, 4, 9, 14],
  m7b5: [0, 3, 6, 10],
};

type Chord = keyof typeof CH;
type Turn = [number, Chord][];

const voice = (root: number, kind: Chord, lo: number) =>
  CH[kind].map((n) => {
    let m = root + n;
    while (m < lo) m += 12;
    while (m >= lo + 16) m -= 12;
    return m;
  });

function env(g: GainNode, t: number, peak: number, attack: number, hold: number, len: number) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  if (hold) g.gain.exponentialRampToValueAtTime(peak * 0.4, t + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
}

// Rhodes-ish tine
export function tine(k: Kit, t: number, midi: number, vel: number, len: number) {
  const c = k.ctx;
  const f = hz(midi);
  const car = c.createOscillator(),
    oct = c.createOscillator(),
    mod = c.createOscillator(),
    mg = c.createGain(),
    og = c.createGain(),
    g = c.createGain();
  car.frequency.value = f;
  oct.frequency.value = f * 2;
  mod.frequency.value = f;
  mg.gain.setValueAtTime(f * 1.4 * vel, t);
  mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.25);
  mod.connect(mg).connect(car.frequency);
  og.gain.value = 0.18;
  oct.connect(og).connect(g);
  car.connect(g);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.06 * vel, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.025 * vel, t + 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  g.connect(k.bus);
  [car, oct, mod].forEach((o) => {
    o.start(t);
    o.stop(t + len + 0.05);
  });
}

function upright(k: Kit, t: number, midi: number, len: number, vel = 1) {
  const c = k.ctx;
  const o = c.createOscillator(),
    g = c.createGain(),
    lp = c.createBiquadFilter();
  o.type = "triangle";
  o.frequency.value = hz(midi);
  lp.type = "lowpass";
  lp.frequency.value = 500;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.12 * vel, t + 0.2);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(lp).connect(g).connect(k.bus);
  o.start(t);
  o.stop(t + len + 0.05);
}

function kick(k: Kit, t: number, vel: number, punch = 0) {
  const c = k.ctx;
  const o = c.createOscillator(),
    g = c.createGain();
  o.frequency.setValueAtTime(110 + punch * 40, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  g.gain.setValueAtTime(0.5 * vel, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g).connect(k.bus);
  o.start(t);
  o.stop(t + 0.35);
}

// noise through a filter
function hiss(
  k: Kit,
  t: number,
  type: BiquadFilterType,
  freq: number,
  q: number,
  peak: number,
  attack: number,
  len: number,
) {
  const c = k.ctx;
  const src = c.createBufferSource(),
    f = c.createBiquadFilter(),
    g = c.createGain();
  src.buffer = k.noise;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(f).connect(g).connect(k.bus);
  src.start(t, Math.random() * 1.5);
  src.stop(t + len + 0.02);
}
const brush = (k: Kit, t: number, vel: number, swish: boolean) =>
  swish
    ? hiss(k, t, "bandpass", 1800, 0.8, 0.09 * vel, 0.06, 0.28)
    : hiss(k, t, "highpass", 7000, 0.5, 0.035 * vel, 0.004, 0.05);

function knock(k: Kit, t: number, f: number, vel: number) {
  const c = k.ctx;
  const o = c.createOscillator(),
    g = c.createGain();
  o.frequency.value = f;
  env(g, t, 0.12 * vel, 0.002, 0, 0.06);
  o.connect(g).connect(k.bus);
  o.start(t);
  o.stop(t + 0.08);
}

const strings = new Map<string, AudioBuffer>();
function stringOf(c: BaseAudioContext, midi: number, damp: number, soft: number, len: number) {
  const key = `${midi}|${damp}|${soft}|${c.sampleRate}`;
  let buf = strings.get(key);
  if (buf) return buf;
  const sr = c.sampleRate,
    n = Math.max(2, Math.floor(sr / hz(midi))),
    N = Math.floor(sr * len);
  buf = c.createBuffer(1, N, sr);
  const out = buf.getChannelData(0),
    loop = new Float32Array(n);
  for (let i = 0; i < n; i++) loop[i] = Math.random() * 2 - 1;
  for (let s = 0; s < soft; s++) for (let i = 1; i < n; i++) loop[i] = (loop[i] + loop[i - 1]) / 2;
  for (let i = 0, j = 0; i < N; i++, j = (j + 1) % n) {
    out[i] = loop[j];
    loop[j] = damp * 0.5 * (loop[j] + loop[(j + 1) % n]);
  }
  strings.set(key, buf);
  return buf;
}
function pluck(
  k: Kit,
  t: number,
  midi: number,
  vel: number,
  o: { damp: number; soft: number; len: number; tone: number; bend?: number; pan?: number },
) {
  const c = k.ctx;
  const src = c.createBufferSource(),
    lp = c.createBiquadFilter(),
    g = c.createGain();
  src.buffer = stringOf(c, midi, o.damp, o.soft, o.len);
  const n = Math.max(2, Math.floor(c.sampleRate / hz(midi)));
  const rate = hz(midi) / (c.sampleRate / (n + 0.5));
  src.playbackRate.setValueAtTime(rate * (o.bend ? Math.pow(2, -o.bend / 12) : 1), t);
  if (o.bend) src.playbackRate.linearRampToValueAtTime(rate, t + 0.18);
  lp.type = "lowpass";
  lp.frequency.value = o.tone;
  g.gain.value = vel;
  let end: AudioNode = g;
  if (o.pan && "createStereoPanner" in c) {
    const p = c.createStereoPanner();
    p.pan.value = o.pan;
    g.connect(p);
    end = p;
  }
  src.connect(lp).connect(g);
  end.connect(k.bus);
  src.start(t);
  src.stop(t + o.len);
}

const DUSK: Turn[] = [
  [
    [2, "m9"],
    [7, "d13"],
    [0, "M9"],
    [9, "m11"],
  ],
  [
    [2, "m11"],
    [7, "d7s9"],
    [0, "M69"],
    [0, "M9"],
  ],
  [
    [4, "m9"],
    [9, "d13"],
    [2, "m9"],
    [7, "d13"],
  ],
  [
    [0, "M9"],
    [9, "m9"],
    [2, "m11"],
    [7, "d13"],
  ],
  [
    [5, "M9"],
    [4, "m9"],
    [2, "m7b5"],
    [7, "d7s9"],
  ],
];

const duskKey = (h: number) => (h < 6 ? 1 : h < 11 ? 5 : h < 17 ? 0 : h < 21 ? 3 : 8);
const duskBpm = (h: number) => (h < 6 || h >= 22 ? 64 : h < 11 ? 72 : h < 18 ? 78 : 70);
let duskTurn = DUSK[0];

function dusk(k: Kit, t: number, s: number, beat: number, hour: number) {
  const bar = Math.floor(s / 16) % 4,
    pos = s % 16;
  if (s % 64 === 0) duskTurn = pick(DUSK);
  const [deg, kind] = duskTurn[bar];
  const root = 50 + duskKey(hour) + deg;
  if (pos === 0 || (pos === 6 && Math.random() < 0.3)) {
    const v = CH[kind].map((n) => root + 12 + n).map((n) => (n > 76 ? n - 12 : n));
    v.forEach((n, i) => tine(k, t + i * 0.012, n, hum(), beat * (pos === 0 ? 3.6 : 2)));
  }
  if (pos % 4 === 2 && Math.random() < 0.18) {
    const n = pick(CH[kind]);
    tine(k, t, root + 24 + n > 88 ? root + 12 + n : root + 24 + n, 0.6 * hum(), beat * 1.5);
  }
  if (pos === 0) upright(k, t, root - 12, beat * 1.8);
  if (pos === 8) upright(k, t, root - 12 + (Math.random() < 0.5 ? 7 : 12), beat * 1.6);
  if (pos === 14 && Math.random() < 0.4)
    upright(k, t, root - 12 + 7 + (Math.random() < 0.5 ? 1 : -1), beat * 0.4);
  if (pos === 0 || (pos === 10 && Math.random() < 0.5)) kick(k, t, hum());
  if (pos === 4 || pos === 12) brush(k, t, hum(), true);
  if (pos % 2 === 0) brush(k, t, hum() * (pos % 4 === 0 ? 1 : 0.6), false);
}

const RAIN: Turn[] = [
  [
    [0, "M9"],
    [2, "d9"],
    [2, "m9"],
    [7, "d7b9"],
  ],
  [
    [0, "M69"],
    [9, "m9"],
    [2, "m11"],
    [7, "d13"],
  ],
  [
    [5, "M9"],
    [5, "m6"],
    [4, "m7"],
    [9, "d7b9"],
  ],
  [
    [2, "m9"],
    [7, "d13"],
    [0, "M9"],
    [10, "d9"],
  ],
];
const rainKey = (h: number) => (h < 6 ? 8 : h < 12 ? 3 : h < 18 ? 5 : 10);
const rainBpm = (h: number) => (h < 6 || h >= 22 ? 66 : 72);
const NYLON = { damp: 0.996, soft: 3, len: 2.4, tone: 3200 };
const COMP = [
  [0, 3, 6, 10, 13],
  [0, 3, 6, 10, 12],
];
let rainTurn = RAIN[0];

function rain(k: Kit, t: number, s: number, beat: number, hour: number) {
  const bar = Math.floor(s / 16) % 4,
    pos = s % 16;
  if (s % 64 === 0) rainTurn = pick(RAIN);
  const [deg, kind] = rainTurn[bar];
  const root = 40 + rainKey(hour) + deg;
  if (pos === 0) pluck(k, t, root, 0.55 * hum(), { ...NYLON, damp: 0.994, tone: 900 });
  if (pos === 6 && Math.random() < 0.5)
    pluck(k, t, root + 7, 0.3 * hum(), { ...NYLON, damp: 0.99, tone: 900 });
  if (pos === 8)
    pluck(k, t, root + 7 - (root + 7 > 50 ? 12 : 0), 0.5 * hum(), {
      ...NYLON,
      damp: 0.994,
      tone: 900,
    });
  if (COMP[bar % 2].includes(pos)) {
    const v = voice(root, kind, 52).slice(1);
    v.forEach((n, i) =>
      pluck(k, t + i * 0.009, n, (0.22 + (pos === 0 ? 0.06 : 0)) * hum(), {
        ...NYLON,
        len: beat * 1.4,
        pan: 0.15,
      }),
    );
  }
  if (pos % 4 === 2 && Math.random() < 0.12) {
    const n = pick(CH[kind]);
    pluck(k, t, root + 24 + n > 86 ? root + 12 + n : root + 24 + n, 0.25 * hum(), {
      ...NYLON,
      tone: 4200,
      pan: -0.25,
    });
  }
  hiss(k, t, "highpass", 5200, 0.6, (pos % 2 ? 0.03 : 0.018) * hum(), 0.015, 0.07);
  if ((bar % 2 ? [3, 6, 10, 12] : [0, 3, 6, 10, 13]).includes(pos) && Math.random() < 0.7)
    knock(k, t, 1650, 0.7 * hum());
  if (pos === 0) kick(k, t, 0.55 * hum());
}

const MIYAKO = [0, 1, 5, 7, 8];
const gardenKey = (h: number) => (h < 6 ? 0 : h < 12 ? 5 : h < 18 ? 2 : 7);
const gardenBpm = () => 54;
const KOTO = { damp: 0.9975, soft: 1, len: 3.2, tone: 4800 };
const scaleNote = (base: number, i: number) =>
  base + MIYAKO[((i % 5) + 5) % 5] + 12 * Math.floor(i / 5);
let gardenAt = 6;

function bowl(k: Kit, t: number, midi: number, vel: number) {
  const c = k.ctx;
  [1, 2.76, 5.4].forEach((p, i) => {
    const o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = hz(midi) * p;
    env(g, t, (0.05 * vel) / (i + 1), 0.004, 0, 7 - i * 2);
    o.connect(g).connect(k.bus);
    o.start(t);
    o.stop(t + 7.1 - i * 2);
  });
}

function flute(k: Kit, t: number, midi: number, len: number) {
  const c = k.ctx;
  const o = c.createOscillator(),
    vib = c.createOscillator(),
    vd = c.createGain(),
    g = c.createGain(),
    lp = c.createBiquadFilter();
  o.type = "triangle";
  o.frequency.value = hz(midi);
  vib.frequency.value = 5;
  vd.gain.setValueAtTime(0, t);
  vd.gain.linearRampToValueAtTime(hz(midi) * 0.012, t + len * 0.6);
  vib.connect(vd).connect(o.frequency);
  lp.type = "lowpass";
  lp.frequency.value = 1800;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + len * 0.3);
  g.gain.linearRampToValueAtTime(0.035, t + len * 0.7);
  g.gain.linearRampToValueAtTime(0, t + len);
  o.connect(lp).connect(g).connect(k.bus);
  [o, vib].forEach((x) => {
    x.start(t);
    x.stop(t + len + 0.05);
  });
  // the breath round it
  hiss(k, t, "bandpass", hz(midi) * 2, 1.5, 0.025, len * 0.25, len);
}

function garden(k: Kit, t: number, s: number, beat: number, hour: number) {
  const bar = Math.floor(s / 16),
    pos = s % 16;
  const base = 62 + gardenKey(hour);
  const walk = () => {
    gardenAt += pick([-2, -1, -1, 1, 2, -1, 1]);
    if (gardenAt < 1) gardenAt += 4;
    if (gardenAt > 11) gardenAt -= 5;
    return scaleNote(base, gardenAt);
  };
  const play = (at: number, vel: number) =>
    pluck(k, at, walk(), vel * hum(), { ...KOTO, bend: Math.random() < 0.25 ? 1 : 0, pan: 0.2 });
  if (pos === 0) play(t, 0.5);
  if ((pos === 6 || pos === 10) && Math.random() < 0.45) play(t, 0.35);
  if (pos === 12 && Math.random() < 0.3) {
    play(t, 0.3);
    play(t + beat * 0.22, 0.22);
  }
  if (bar % 8 === 0 && pos === 0)
    for (let i = 0; i < 6; i++)
      pluck(k, t + i * 0.055, scaleNote(base - 12, i + 2), 0.28, { ...KOTO, pan: -0.1 });
  if (bar % 2 === 0 && pos === 0)
    pluck(k, t, base - 24, 0.45, { ...KOTO, damp: 0.9992, len: 4, tone: 1200 });
  if (bar % 8 === 4 && pos === 0) bowl(k, t, base + 12, 0.8);
  if (bar % 6 === 3 && pos === 4) flute(k, t, scaleNote(base, pick([5, 6, 7, 8])), beat * 6);
}

const cityKey = (h: number) => (h < 12 ? 7 : h < 20 ? 4 : 11);
const cityBpm = (h: number) => (h < 6 || h >= 22 ? 98 : 104);
const CITY: Turn = [
  [5, "M9"],
  [4, "m7"],
  [9, "m9"],
  [7, "sus"],
];
const RIFF: [number, number, number][][] = [
  [
    [0, 16, 2],
    [2, 14, 1],
    [3, 12, 3],
    [6, 9, 2],
    [8, 12, 2],
    [10, 14, 1],
    [11, 16, 3],
    [14, 19, 2],
  ],
  [
    [0, 19, 4],
    [4, 16, 2],
    [6, 14, 1],
    [7, 11, 1],
    [8, 14, 6],
  ],
  [
    [0, 24, 3],
    [3, 23, 3],
    [6, 21, 2],
    [8, 19, 2],
    [10, 16, 2],
    [12, 19, 4],
  ],
  [
    [0, 17, 2],
    [2, 16, 2],
    [4, 14, 2],
    [6, 12, 2],
    [8, 14, 4],
    [12, 21, 4],
  ],
];
const BOUNCE: [number, number, number][] = [
  [0, 0, 1],
  [2, 12, 0.7],
  [3, 12, 0.35],
  [6, 0, 0.8],
  [8, 0, 0.9],
  [10, 12, 0.7],
  [11, 10, 0.5],
];

function synthBass(k: Kit, t: number, midi: number, len: number, vel: number) {
  const c = k.ctx;
  const o = c.createOscillator(),
    lp = c.createBiquadFilter(),
    g = c.createGain();
  o.type = "sawtooth";
  o.frequency.value = hz(midi);
  lp.type = "lowpass";
  lp.Q.value = 4;
  lp.frequency.setValueAtTime(1400, t);
  lp.frequency.exponentialRampToValueAtTime(260, t + 0.12);
  env(g, t, 0.2 * vel, 0.004, 0.08, len);
  o.connect(lp).connect(g).connect(k.bus);
  o.start(t);
  o.stop(t + len + 0.05);
}

function lead(k: Kit, t: number, midi: number, len: number, vel: number) {
  const c = k.ctx;
  const a = c.createOscillator(),
    b = c.createOscillator(),
    vib = c.createOscillator(),
    vd = c.createGain(),
    lp = c.createBiquadFilter(),
    g = c.createGain();
  a.type = b.type = "sawtooth";
  a.frequency.value = hz(midi);
  b.frequency.value = hz(midi);
  a.detune.value = -7;
  b.detune.value = 7;
  vib.frequency.value = 5.5;
  vd.gain.setValueAtTime(0, t);
  vd.gain.linearRampToValueAtTime(8, t + Math.min(0.4, len));
  vib.connect(vd);
  vd.connect(a.detune);
  vd.connect(b.detune);
  lp.type = "lowpass";
  lp.Q.value = 1;
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.linearRampToValueAtTime(2600, t + 0.06);
  lp.frequency.exponentialRampToValueAtTime(1500, t + len);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.045 * vel, t + 0.02);
  g.gain.setValueAtTime(0.04 * vel, t + len * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.12);
  a.connect(lp);
  b.connect(lp);
  lp.connect(g);
  g.connect(k.bus);
  g.connect(k.echo);
  [a, b, vib].forEach((o) => {
    o.start(t);
    o.stop(t + len + 0.15);
  });
}

function pad(k: Kit, t: number, notes: number[], len: number) {
  const c = k.ctx;
  const lp = c.createBiquadFilter(),
    g = c.createGain();
  lp.type = "lowpass";
  lp.frequency.value = 1100;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.018, t + len * 0.3);
  g.gain.linearRampToValueAtTime(0, t + len);
  lp.connect(g).connect(k.bus);
  notes.forEach((n) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = hz(n);
    o.detune.value = (Math.random() - 0.5) * 14;
    o.connect(lp);
    o.start(t);
    o.stop(t + len + 0.05);
  });
}

function city(k: Kit, t: number, s: number, beat: number, hour: number) {
  const bar = Math.floor(s / 16) % 4,
    pos = s % 16,
    sx = beat / 4;
  const key = cityKey(hour);
  const [deg, kind] = CITY[bar];
  const root = 36 + key + deg;
  const round = Math.floor(s / 64);
  if (round % 4 !== 0)
    RIFF[bar]
      .filter(([at]) => at === pos)
      .forEach(([, n, held]) => lead(k, t, 60 + key + n, held * sx * 0.95, hum()));
  BOUNCE.filter(([at]) => at === pos).forEach(([, n, v]) =>
    synthBass(k, t, root + n, v < 0.5 ? sx * 0.6 : sx * 1.6, v * hum()),
  );
  if (pos === 14) {
    const [nd] = CITY[(bar + 1) % 4];
    synthBass(k, t, 36 + key + nd + pick([1, -1, 2]), sx * 1.5, 0.6);
  }
  if (pos === 2 || pos === 10 || (pos === 7 && Math.random() < 0.35)) {
    voice(root, kind, 60).forEach((n, i) => tine(k, t + i * 0.006, n, 0.8 * hum(), sx * 2.2));
  }
  if (pos === 0) pad(k, t, voice(root, kind, 55), beat * 4);
  if (pos === 0 || pos === 8 || (pos === 10 && Math.random() < 0.4)) kick(k, t, hum(), 1);
  if (pos === 4 || pos === 12) {
    hiss(k, t, "bandpass", 2200, 0.7, 0.14 * hum(), 0.002, 0.18);
    knock(k, t, 210, 1.2);
  }
  if (pos % 2 === 0)
    hiss(k, t, "highpass", 8000, 0.5, (pos % 4 ? 0.022 : 0.03) * hum(), 0.002, 0.04);
  if (pos === 14) hiss(k, t, "highpass", 7000, 0.5, 0.03, 0.004, 0.22);
}

export const DISCS: Disc[] = [
  {
    jp: "夕",
    title: "Turns at dusk",
    by: "the house, made as it plays",
    about: (h) => `slow jazz in ${NAMES[duskKey(h)]}, ${duskBpm(h)} a minute`,
    bpm: duskBpm,
    play: dusk,
  },
  {
    jp: "雨",
    title: "Bossa for the rain",
    by: "the house, made as it plays",
    about: (h) => `bossa nova in ${NAMES[rainKey(h)]}, a nylon guitar and a shaker`,
    bpm: rainBpm,
    play: rain,
    top: 3400,
    level: 1.3,
  },
  {
    jp: "庭",
    title: "The garden, in miyako-bushi",
    by: "the house, made as it plays",
    about: (h) => `a koto in ${NAMES[gardenKey(h)]} miyako-bushi, a bowl, a flute`,
    bpm: gardenBpm,
    play: garden,
    top: 4200,
    level: 1.5,
  },
  {
    jp: "街",
    title: "Harbour lights",
    by: "the house, made as it plays",
    about: (h) => `city pop in ${NAMES[cityKey(h)]}, ${cityBpm(h)} a minute, a riff of its own`,
    bpm: cityBpm,
    play: city,
    top: 6000,
    wow: 0.0009,
    level: 1.1,
  },
  {
    jp: "譜",
    title: "Background Jazz Piano",
    by: "Mike Sheldon",
    about: () => "piano, a double bass and brushes, from a record",
    src: "/audio/background-jazz-piano.mp3",
    credit: {
      licence: "CC BY 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
      url: "https://elleo.itch.io/background-jazz",
    },
  },
];
