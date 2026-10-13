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
  play?: (kit: Kit, time: number, step: number, beat: number, hour: number) => void;
  top?: number;
  wow?: number;
  crackle?: number;
  swing?: number;
  level?: number;
  src?: string;
  credit?: { licence: string; licenceUrl: string; url: string };
}

const NAMES = ["D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B", "C", "C♯"];
const frequencyOf = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
const pick = <T>(choices: T[]) => choices[Math.floor(Math.random() * choices.length)];
const humanVelocity = () => 0.75 + Math.random() * 0.25;

// chords as intervals over a root
const CHORDS = {
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

type Chord = keyof typeof CHORDS;
type Turn = [number, Chord][];

const voice = (root: number, kind: Chord, lowest: number) =>
  CHORDS[kind].map((interval) => {
    let note = root + interval;
    while (note < lowest) note += 12;
    while (note >= lowest + 16) note -= 12;
    return note;
  });

function envelope(
  gain: GainNode,
  time: number,
  peak: number,
  attack: number,
  hold: number,
  duration: number,
) {
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + attack);
  if (hold) gain.gain.exponentialRampToValueAtTime(peak * 0.4, time + hold);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
}

// Rhodes-ish tine
export function tine(kit: Kit, time: number, midi: number, velocity: number, duration: number) {
  const audio = kit.ctx;
  const frequency = frequencyOf(midi);
  const carrier = audio.createOscillator(),
    octave = audio.createOscillator(),
    modulator = audio.createOscillator(),
    modulatorGain = audio.createGain(),
    octaveGain = audio.createGain(),
    gain = audio.createGain();
  carrier.frequency.value = frequency;
  octave.frequency.value = frequency * 2;
  modulator.frequency.value = frequency;
  modulatorGain.gain.setValueAtTime(frequency * 1.4 * velocity, time);
  modulatorGain.gain.exponentialRampToValueAtTime(frequency * 0.05, time + 0.25);
  modulator.connect(modulatorGain).connect(carrier.frequency);
  octaveGain.gain.value = 0.18;
  octave.connect(octaveGain).connect(gain);
  carrier.connect(gain);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.06 * velocity, time + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.025 * velocity, time + 0.4);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  gain.connect(kit.bus);
  [carrier, octave, modulator].forEach((osc) => {
    osc.start(time);
    osc.stop(time + duration + 0.05);
  });
}

function upright(kit: Kit, time: number, midi: number, duration: number, velocity = 1) {
  const audio = kit.ctx;
  const osc = audio.createOscillator(),
    gain = audio.createGain(),
    lowpass = audio.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.value = frequencyOf(midi);
  lowpass.type = "lowpass";
  lowpass.frequency.value = 500;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.32 * velocity, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.12 * velocity, time + 0.2);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  osc.connect(lowpass).connect(gain).connect(kit.bus);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function kick(kit: Kit, time: number, velocity: number, punch = 0) {
  const audio = kit.ctx;
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.frequency.setValueAtTime(110 + punch * 40, time);
  osc.frequency.exponentialRampToValueAtTime(42, time + 0.12);
  gain.gain.setValueAtTime(0.5 * velocity, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
  osc.connect(gain).connect(kit.bus);
  osc.start(time);
  osc.stop(time + 0.35);
}

// noise through a filter
function hiss(
  kit: Kit,
  time: number,
  type: BiquadFilterType,
  freq: number,
  q: number,
  peak: number,
  attack: number,
  duration: number,
) {
  const audio = kit.ctx;
  const src = audio.createBufferSource(),
    filter = audio.createBiquadFilter(),
    gain = audio.createGain();
  src.buffer = kit.noise;
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(peak, time + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
  src.connect(filter).connect(gain).connect(kit.bus);
  src.start(time, Math.random() * 1.5);
  src.stop(time + duration + 0.02);
}
const brush = (kit: Kit, time: number, velocity: number) =>
  hiss(kit, time, "bandpass", 1800, 0.8, 0.09 * velocity, 0.06, 0.28);

function knock(kit: Kit, time: number, frequency: number, velocity: number) {
  const audio = kit.ctx;
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.frequency.value = frequency;
  envelope(gain, time, 0.12 * velocity, 0.002, 0, 0.06);
  osc.connect(gain).connect(kit.bus);
  osc.start(time);
  osc.stop(time + 0.08);
}

const strings = new Map<string, AudioBuffer>();
function stringOf(
  audio: BaseAudioContext,
  midi: number,
  damp: number,
  soft: number,
  duration: number,
) {
  const key = `${midi}|${damp}|${soft}|${audio.sampleRate}`;
  let buffer = strings.get(key);
  if (buffer) return buffer;
  const sampleRate = audio.sampleRate,
    period = Math.max(2, Math.floor(sampleRate / frequencyOf(midi))),
    total = Math.floor(sampleRate * duration);
  buffer = audio.createBuffer(1, total, sampleRate);
  const samples = buffer.getChannelData(0),
    ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
  for (let pass = 0; pass < soft; pass++)
    for (let i = 1; i < period; i++) ring[i] = (ring[i] + ring[i - 1]) / 2;
  for (let i = 0, j = 0; i < total; i++, j = (j + 1) % period) {
    samples[i] = ring[j];
    ring[j] = damp * 0.5 * (ring[j] + ring[(j + 1) % period]);
  }
  strings.set(key, buffer);
  return buffer;
}
function pluck(
  kit: Kit,
  time: number,
  midi: number,
  velocity: number,
  opts: { damp: number; soft: number; len: number; tone: number; pan?: number },
) {
  const audio = kit.ctx;
  const src = audio.createBufferSource(),
    lowpass = audio.createBiquadFilter(),
    gain = audio.createGain();
  src.buffer = stringOf(audio, midi, opts.damp, opts.soft, opts.len);
  const period = Math.max(2, Math.floor(audio.sampleRate / frequencyOf(midi)));
  const rate = frequencyOf(midi) / (audio.sampleRate / (period + 0.5));
  src.playbackRate.value = rate;
  lowpass.type = "lowpass";
  lowpass.frequency.value = opts.tone;
  gain.gain.value = velocity;
  let output: AudioNode = gain;
  if (opts.pan && "createStereoPanner" in audio) {
    const panner = audio.createStereoPanner();
    panner.pan.value = opts.pan;
    gain.connect(panner);
    output = panner;
  }
  src.connect(lowpass).connect(gain);
  output.connect(kit.bus);
  src.start(time);
  src.stop(time + opts.len);
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

const duskKey = (hour: number) =>
  hour < 6 ? 1 : hour < 11 ? 5 : hour < 17 ? 0 : hour < 21 ? 3 : 8;
const duskBpm = (hour: number) =>
  hour < 6 || hour >= 22 ? 64 : hour < 11 ? 72 : hour < 18 ? 78 : 70;
let duskTurn = DUSK[0];

function dusk(kit: Kit, time: number, step: number, beat: number, hour: number) {
  const bar = Math.floor(step / 16) % 4,
    pos = step % 16;
  if (step % 64 === 0) duskTurn = pick(DUSK);
  const [degree, kind] = duskTurn[bar];
  const root = 50 + duskKey(hour) + degree;
  if (pos === 0 || (pos === 6 && Math.random() < 0.3)) {
    const chord = CHORDS[kind].map((note) => root + 12 + note).map((n) => (n > 76 ? n - 12 : n));
    chord.forEach((note, i) =>
      tine(kit, time + i * 0.012, note, humanVelocity(), beat * (pos === 0 ? 3.6 : 2)),
    );
  }
  if (pos % 4 === 2 && Math.random() < 0.18) {
    const note = pick(CHORDS[kind]);
    tine(
      kit,
      time,
      root + 24 + note > 88 ? root + 12 + note : root + 24 + note,
      0.6 * humanVelocity(),
      beat * 1.5,
    );
  }
  if (pos === 0) upright(kit, time, root - 12, beat * 1.8);
  if (pos === 8) upright(kit, time, root - 12 + (Math.random() < 0.5 ? 7 : 12), beat * 1.6);
  if (pos === 14 && Math.random() < 0.4)
    upright(kit, time, root - 12 + 7 + (Math.random() < 0.5 ? 1 : -1), beat * 0.4);
  if (pos === 0 || (pos === 10 && Math.random() < 0.5)) kick(kit, time, humanVelocity());
  if (pos === 4 || pos === 12) brush(kit, time, humanVelocity());
}

const RAIN: Turn[] = [
  [
    [0, "M9"],
    [2, "d9"],
    [2, "m9"],
    [7, "d9"],
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
    [9, "d9"],
  ],
  [
    [2, "m9"],
    [7, "d13"],
    [0, "M9"],
    [10, "d9"],
  ],
];
const rainKey = (hour: number) => (hour < 6 ? 8 : hour < 12 ? 3 : hour < 18 ? 5 : 10);
const rainBpm = (hour: number) => (hour < 6 || hour >= 22 ? 66 : 72);
const NYLON = { damp: 0.996, soft: 3, len: 2.4, tone: 3200 };
const COMP = [
  [0, 3, 6, 10, 13],
  [0, 3, 6, 10, 12],
];
let rainTurn = RAIN[0];

function rain(kit: Kit, time: number, step: number, beat: number, hour: number) {
  const bar = Math.floor(step / 16) % 4,
    pos = step % 16;
  if (step % 64 === 0) rainTurn = pick(RAIN);
  const [degree, kind] = rainTurn[bar];
  const root = 40 + rainKey(hour) + degree;
  if (pos === 0)
    pluck(kit, time, root, 0.55 * humanVelocity(), { ...NYLON, damp: 0.994, tone: 900 });
  if (pos === 6 && Math.random() < 0.5)
    pluck(kit, time, root + 7, 0.3 * humanVelocity(), { ...NYLON, damp: 0.99, tone: 900 });
  if (pos === 8)
    pluck(kit, time, root + 7 - (root + 7 > 50 ? 12 : 0), 0.5 * humanVelocity(), {
      ...NYLON,
      damp: 0.994,
      tone: 900,
    });
  if (COMP[bar % 2].includes(pos)) {
    const chord = voice(root, kind, 52).slice(1);
    chord.forEach((note, i) =>
      pluck(kit, time + i * 0.009, note, (0.22 + (pos === 0 ? 0.06 : 0)) * humanVelocity(), {
        ...NYLON,
        len: beat * 1.4,
        pan: 0.15,
      }),
    );
  }
  if (pos % 4 === 2 && Math.random() < 0.12) {
    const note = pick(CHORDS[kind]);
    pluck(
      kit,
      time,
      root + 24 + note > 76 ? root + 12 + note : root + 24 + note,
      0.2 * humanVelocity(),
      {
        ...NYLON,
        tone: 2800,
        pan: -0.25,
      },
    );
  }
  hiss(kit, time, "bandpass", 6000, 0.7, (pos % 2 ? 0.014 : 0.008) * humanVelocity(), 0.02, 0.08);
  if ((bar % 2 ? [3, 6, 10, 12] : [0, 3, 6, 10, 13]).includes(pos))
    hiss(kit, time, "bandpass", 2400, 1.4, 0.03 * humanVelocity(), 0.002, 0.04);
  if (pos === 0 || pos === 8) kick(kit, time, (pos ? 0.3 : 0.4) * humanVelocity());
}

const MOSS: Turn[] = [
  [
    [5, "M9"],
    [4, "m7"],
    [2, "m9"],
    [0, "M9"],
  ],
  [
    [9, "m9"],
    [2, "m11"],
    [7, "sus"],
    [0, "M69"],
  ],
];
const mossKey = (hour: number) => (hour < 6 ? 3 : hour < 12 ? 7 : hour < 18 ? 5 : 10);
const mossBpm = (hour: number) => (hour < 6 || hour >= 22 ? 70 : 76);
let mossTurn = MOSS[0];

function moss(kit: Kit, time: number, step: number, beat: number, hour: number) {
  const bar = Math.floor(step / 16) % 4,
    pos = step % 16;
  if (step % 64 === 0) mossTurn = pick(MOSS);
  const [degree, kind] = mossTurn[bar];
  const root = 38 + mossKey(hour) + degree;
  if (pos === 0 || (pos === 10 && Math.random() < 0.5)) {
    const chord = voice(root, kind, 57);
    chord.forEach((note, i) =>
      tine(
        kit,
        time + i * 0.02,
        note,
        (pos ? 0.4 : 0.6) * humanVelocity(),
        beat * (pos ? 1.6 : 3.4),
      ),
    );
  }
  if (pos % 4 === 2 && Math.random() < 0.14) {
    const note = root + 24 + pick(CHORDS[kind]);
    tine(kit, time, note > 84 ? note - 12 : note, 0.35 * humanVelocity(), beat * 1.5);
  }
  if (pos === 0) upright(kit, time, root, beat * 1.6);
  if (pos === 7 && Math.random() < 0.5) upright(kit, time, root + 7, beat * 0.8, 0.7);
  if (pos === 10) upright(kit, time, root + (Math.random() < 0.5 ? 12 : 7), beat * 1.2, 0.8);
  if (pos === 0 || pos === 10 || (pos === 7 && Math.random() < 0.3))
    kick(kit, time, 0.7 * humanVelocity());
  if (pos === 4 || pos === 12)
    hiss(kit, time, "bandpass", 1600, 0.9, 0.07 * humanVelocity(), 0.003, 0.16);
  if (pos % 2 === 0)
    hiss(
      kit,
      time,
      "bandpass",
      7000,
      0.8,
      (pos % 4 ? 0.012 : 0.008) * humanVelocity(),
      0.003,
      0.035,
    );
}

const cityKey = (hour: number) => (hour < 12 ? 7 : hour < 20 ? 4 : 11);
const cityBpm = (hour: number) => (hour < 6 || hour >= 22 ? 98 : 104);
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

function synthBass(kit: Kit, time: number, midi: number, duration: number, velocity: number) {
  const audio = kit.ctx;
  const osc = audio.createOscillator(),
    lowpass = audio.createBiquadFilter(),
    gain = audio.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = frequencyOf(midi);
  lowpass.type = "lowpass";
  lowpass.Q.value = 4;
  lowpass.frequency.setValueAtTime(1400, time);
  lowpass.frequency.exponentialRampToValueAtTime(260, time + 0.12);
  envelope(gain, time, 0.2 * velocity, 0.004, 0.08, duration);
  osc.connect(lowpass).connect(gain).connect(kit.bus);
  osc.start(time);
  osc.stop(time + duration + 0.05);
}

function lead(kit: Kit, time: number, midi: number, duration: number, velocity: number) {
  const audio = kit.ctx;
  const sawLow = audio.createOscillator(),
    sawHigh = audio.createOscillator(),
    vibrato = audio.createOscillator(),
    vibratoDepth = audio.createGain(),
    lowpass = audio.createBiquadFilter(),
    gain = audio.createGain();
  sawLow.type = sawHigh.type = "sawtooth";
  sawLow.frequency.value = frequencyOf(midi);
  sawHigh.frequency.value = frequencyOf(midi);
  sawLow.detune.value = -7;
  sawHigh.detune.value = 7;
  vibrato.frequency.value = 5.5;
  vibratoDepth.gain.setValueAtTime(0, time);
  vibratoDepth.gain.linearRampToValueAtTime(8, time + Math.min(0.4, duration));
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(sawLow.detune);
  vibratoDepth.connect(sawHigh.detune);
  lowpass.type = "lowpass";
  lowpass.Q.value = 1;
  lowpass.frequency.setValueAtTime(900, time);
  lowpass.frequency.linearRampToValueAtTime(2600, time + 0.06);
  lowpass.frequency.exponentialRampToValueAtTime(1500, time + duration);
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.045 * velocity, time + 0.02);
  gain.gain.setValueAtTime(0.04 * velocity, time + duration * 0.8);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.12);
  sawLow.connect(lowpass);
  sawHigh.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(kit.bus);
  gain.connect(kit.echo);
  [sawLow, sawHigh, vibrato].forEach((osc) => {
    osc.start(time);
    osc.stop(time + duration + 0.15);
  });
}

function pad(kit: Kit, time: number, notes: number[], duration: number) {
  const audio = kit.ctx;
  const lowpass = audio.createBiquadFilter(),
    gain = audio.createGain();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 1100;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(0.018, time + duration * 0.3);
  gain.gain.linearRampToValueAtTime(0, time + duration);
  lowpass.connect(gain).connect(kit.bus);
  notes.forEach((note) => {
    const osc = audio.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = frequencyOf(note);
    osc.detune.value = (Math.random() - 0.5) * 14;
    osc.connect(lowpass);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  });
}

function city(kit: Kit, time: number, step: number, beat: number, hour: number) {
  const bar = Math.floor(step / 16) % 4,
    pos = step % 16,
    sixteenth = beat / 4;
  const key = cityKey(hour);
  const [degree, kind] = CITY[bar];
  const root = 36 + key + degree;
  const cycle = Math.floor(step / 64);
  if (cycle % 4 !== 0)
    RIFF[bar]
      .filter(([start]) => start === pos)
      .forEach(([, interval, held]) =>
        lead(kit, time, 60 + key + interval, held * sixteenth * 0.95, humanVelocity()),
      );
  BOUNCE.filter(([start]) => start === pos).forEach(([, interval, weight]) =>
    synthBass(
      kit,
      time,
      root + interval,
      weight < 0.5 ? sixteenth * 0.6 : sixteenth * 1.6,
      weight * humanVelocity(),
    ),
  );
  if (pos === 14) {
    const [nextDegree] = CITY[(bar + 1) % 4];
    synthBass(kit, time, 36 + key + nextDegree + pick([1, -1, 2]), sixteenth * 1.5, 0.6);
  }
  if (pos === 2 || pos === 10 || (pos === 7 && Math.random() < 0.35)) {
    voice(root, kind, 60).forEach((note, i) =>
      tine(kit, time + i * 0.006, note, 0.8 * humanVelocity(), sixteenth * 2.2),
    );
  }
  if (pos === 0) pad(kit, time, voice(root, kind, 55), beat * 4);
  if (pos === 0 || pos === 8 || (pos === 10 && Math.random() < 0.4))
    kick(kit, time, humanVelocity(), 1);
  if (pos === 4 || pos === 12) {
    hiss(kit, time, "bandpass", 2200, 0.7, 0.14 * humanVelocity(), 0.002, 0.18);
    knock(kit, time, 210, 1.2);
  }
  if (pos % 2 === 0)
    hiss(kit, time, "highpass", 8000, 0.5, (pos % 4 ? 0.022 : 0.03) * humanVelocity(), 0.002, 0.04);
  if (pos === 14) hiss(kit, time, "highpass", 7000, 0.5, 0.03, 0.004, 0.22);
}

export const DISCS: Disc[] = [
  {
    jp: "夕",
    title: "Turns at dusk",
    by: "the house, made as it plays",
    about: (hour) => `slow jazz in ${NAMES[duskKey(hour)]}, ${duskBpm(hour)} a minute`,
    bpm: duskBpm,
    play: dusk,
    crackle: 0.12,
  },
  {
    jp: "雨",
    title: "Bossa for the rain",
    by: "the house, made as it plays",
    about: (hour) => `bossa nova in ${NAMES[rainKey(hour)]}, a nylon guitar and a shaker`,
    bpm: rainBpm,
    play: rain,
    top: 3000,
    level: 1.15,
    swing: 0,
  },
  {
    jp: "苔",
    title: "A slow beat for the moss",
    by: "the house, made as it plays",
    about: (hour) =>
      `lo-fi in ${NAMES[mossKey(hour)]}, ${mossBpm(hour)} a minute, a Rhodes and a tired drum`,
    bpm: mossBpm,
    play: moss,
    top: 2400,
    wow: 0.0024,
    level: 1.2,
    crackle: 0.15,
    swing: 0.12,
  },
  {
    jp: "街",
    title: "Harbour lights",
    by: "the house, made as it plays",
    about: (hour) =>
      `city pop in ${NAMES[cityKey(hour)]}, ${cityBpm(hour)} a minute, a riff of its own`,
    bpm: cityBpm,
    play: city,
    top: 6000,
    wow: 0.0009,
    level: 1.1,
    crackle: 0.2,
  },
  {
    jp: "譜",
    title: "Background Jazz Piano",
    by: "Mike Sheldon",
    about: () => "jazz piano, from a real recording",
    src: "/audio/background-jazz-piano.mp3",
    credit: {
      licence: "CC BY 4.0",
      licenceUrl: "https://creativecommons.org/licenses/by/4.0/",
      url: "https://elleo.itch.io/background-jazz",
    },
  },
];
