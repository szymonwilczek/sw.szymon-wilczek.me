const SOUND = "engawa:sound";

// chords as intervals over a root,
// and turns as [degree in semitones, chord]
const CH = {
  m9: [0, 3, 7, 10, 14],
  m11: [0, 3, 10, 14, 17],
  d13: [0, 4, 10, 14, 21],
  d7s9: [0, 4, 10, 15],
  M9: [0, 4, 7, 11, 14],
  M69: [0, 4, 9, 14],
  m7b5: [0, 3, 6, 10],
};
type Chord = keyof typeof CH;
const TURNS: [number, Chord][][] = [
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
// the key and the beats a minute, by the hour
const keyAt = (h: number) => (h < 6 ? 1 : h < 11 ? 5 : h < 17 ? 0 : h < 21 ? 3 : 8);
const bpmAt = (h: number) => (h < 6 || h >= 22 ? 64 : h < 11 ? 72 : h < 18 ? 78 : 70);
const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

export function radioOf(hour: () => number) {
  let ctx: AudioContext | null = null;
  let out: GainNode;
  let bus: AudioNode;
  let noise: AudioBuffer;
  let crackle: AudioBufferSourceNode | null = null;
  let timer = 0;
  let next = 0;
  let step = 0;
  let turn = TURNS[0];
  let on = false;
  const listeners: ((on: boolean) => void)[] = [];

  function build() {
    ctx = new AudioContext();
    out = ctx.createGain();
    out.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2600;
    lp.Q.value = 0.4;
    const wow = ctx.createDelay(0.05);
    wow.delayTime.value = 0.012;
    const lfo = ctx.createOscillator(),
      depth = ctx.createGain();
    lfo.frequency.value = 0.33;
    depth.gain.value = 0.0018;
    lfo.connect(depth).connect(wow.delayTime);
    lfo.start();
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.ratio.value = 3;
    lp.connect(wow).connect(glue).connect(out).connect(ctx.destination);
    bus = lp;
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function surface() {
    const c = ctx!;
    const len = c.sampleRate * 4;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.00012) {
        const amp = 0.2 + Math.random() * 0.5;
        for (let k = 0; k < 40 && i + k < len; k++)
          d[i + k] += amp * (Math.random() * 2 - 1) * Math.exp(-k / 6);
      }
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 0.5;
    const g = c.createGain();
    g.gain.value = 0.5;
    src.connect(bp).connect(g).connect(out);
    src.start();
    return src;
  }

  function tine(t: number, midi: number, vel: number, len: number) {
    const c = ctx!;
    const f = hz(midi);
    const car = c.createOscillator(),
      oct = c.createOscillator(),
      mod = c.createOscillator(),
      mg = c.createGain(),
      og = c.createGain(),
      g = c.createGain();
    car.frequency.value = f;
    oct.frequency.value = f * 2;
    mod.frequency.value = f * 1;
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
    g.connect(bus);
    [car, oct, mod].forEach((o) => {
      o.start(t);
      o.stop(t + len + 0.05);
    });
  }

  function bass(t: number, midi: number, len: number) {
    const c = ctx!;
    const o = c.createOscillator(),
      g = c.createGain(),
      lp = c.createBiquadFilter();
    o.type = "triangle";
    o.frequency.value = hz(midi);
    lp.type = "lowpass";
    lp.frequency.value = 500;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.32, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp).connect(g).connect(bus);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  function kick(t: number, vel: number) {
    const c = ctx!;
    const o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.5 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.35);
  }

  function brush(t: number, vel: number, swish: boolean) {
    const c = ctx!;
    const src = c.createBufferSource(),
      f = c.createBiquadFilter(),
      g = c.createGain();
    src.buffer = noise;
    f.type = swish ? "bandpass" : "highpass";
    f.frequency.value = swish ? 1800 : 7000;
    f.Q.value = swish ? 0.8 : 0.5;
    const len = swish ? 0.28 : 0.05;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime((swish ? 0.09 : 0.035) * vel, t + (swish ? 0.06 : 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + len + 0.02);
  }

  function play(t: number, s: number, beat: number) {
    const bar = Math.floor(s / 16) % 4,
      pos = s % 16;
    if (s % 64 === 0) turn = TURNS[Math.floor(Math.random() * TURNS.length)];
    const key = 50 + keyAt(hour());
    const [deg, kind] = turn[bar];
    const root = key + deg;
    const hum = () => 0.75 + Math.random() * 0.25;
    if (pos === 0 || (pos === 6 && Math.random() < 0.3)) {
      const voice = CH[kind].map((n) => root + 12 + n).map((n) => (n > 76 ? n - 12 : n));
      voice.forEach((n, i) => tine(t + i * 0.012, n, hum(), beat * (pos === 0 ? 3.6 : 2)));
    }
    if (pos % 4 === 2 && Math.random() < 0.18) {
      const n = CH[kind][Math.floor(Math.random() * CH[kind].length)];
      tine(t, root + 24 + n > 88 ? root + 12 + n : root + 24 + n, 0.6 * hum(), beat * 1.5);
    }
    if (pos === 0) bass(t, root - 12, beat * 1.8);
    if (pos === 8) bass(t, root - 12 + (Math.random() < 0.5 ? 7 : 12), beat * 1.6);
    if (pos === 14 && Math.random() < 0.4)
      bass(t, root - 12 + 7 + (Math.random() < 0.5 ? 1 : -1), beat * 0.4);
    if (pos === 0 || (pos === 10 && Math.random() < 0.5)) kick(t, hum());
    if (pos === 4 || pos === 12) brush(t, hum(), true);
    if (pos % 2 === 0) brush(t, hum() * (pos % 4 === 0 ? 1 : 0.6), false);
  }

  function schedule() {
    const c = ctx!;
    const beat = 60 / bpmAt(hour());
    while (next < c.currentTime + 0.15) {
      const swing = step % 4 === 2 ? beat * 0.08 : 0;
      play(next + swing, step, beat);
      next += beat / 4;
      step++;
    }
  }

  function start() {
    if (!ctx) build();
    const c = ctx!;
    c.resume();
    crackle ??= surface();
    next = c.currentTime + 0.1;
    clearInterval(timer);
    timer = window.setInterval(schedule, 25);
    out.gain.cancelScheduledValues(c.currentTime);
    out.gain.setTargetAtTime(0.8, c.currentTime, 0.6);
    on = true;
    localStorage.setItem(SOUND, "on");
    listeners.forEach((f) => f(true));
  }

  function stop() {
    if (!ctx || !on) return;
    const c = ctx;
    out.gain.setTargetAtTime(0, c.currentTime, 0.3);
    clearInterval(timer);
    setTimeout(() => !on && c.suspend(), 1500);
    on = false;
    localStorage.setItem(SOUND, "off");
    listeners.forEach((f) => f(false));
  }

  return {
    start,
    stop,
    toggle: () => (on ? stop() : start()),
    get on() {
      return on;
    },
    get ctx() {
      return ctx;
    },
    get out() {
      return ctx ? out : null;
    },
    // whether the guest left it playing last time
    wanted: () => localStorage.getItem(SOUND) === "on",
    onChange: (f: (on: boolean) => void) => listeners.push(f),
    label: () => (on ? "止 · stop the radio" : "針 · play the radio"),
  };
}
