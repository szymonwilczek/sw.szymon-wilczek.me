import { DISCS, type Kit } from "./discs";

const SOUND = "engawa:sound";
const DISC = "engawa:disc";

export function radioOf(hour: () => number) {
  let ctx: AudioContext | null = null;
  let out: GainNode;
  let lp: BiquadFilterNode;
  let depth: GainNode;
  let level: GainNode;
  let kit: Kit;
  let crackle: AudioBufferSourceNode | null = null;
  let surface: GainNode;
  let tape: HTMLAudioElement | null = null;
  let timer = 0;
  let next = 0;
  let step = 0;
  let on = false;
  let disc = Math.min(DISCS.length - 1, Math.max(0, Number(localStorage.getItem(DISC)) || 0));
  const listeners: ((on: boolean) => void)[] = [];

  function build() {
    const c = (ctx = new AudioContext());
    out = c.createGain();
    out.gain.value = 0;
    lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 0.4;
    const wow = c.createDelay(0.05);
    wow.delayTime.value = 0.012;
    const lfo = c.createOscillator();
    depth = c.createGain();
    lfo.frequency.value = 0.33;
    lfo.connect(depth).connect(wow.delayTime);
    lfo.start();
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.ratio.value = 3;
    lp.connect(wow).connect(glue).connect(out).connect(c.destination);
    const echo = c.createDelay(1),
      fb = c.createGain(),
      wet = c.createGain();
    echo.delayTime.value = 0.43;
    fb.gain.value = 0.32;
    wet.gain.value = 0.35;
    echo.connect(fb).connect(echo);
    echo.connect(wet).connect(lp);
    const noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    level = c.createGain();
    level.connect(lp);
    kit = { ctx: c, bus: level, echo, noise };
    surface = c.createGain();
    surface.connect(out);
  }

  function scratch() {
    const c = ctx!;
    const len = c.sampleRate * 6;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.008;
      if (Math.random() < 0.00002) {
        const amp = 0.06 + Math.random() * 0.12;
        for (let k = 0; k < 30 && i + k < len; k++)
          d[i + k] += amp * (Math.random() * 2 - 1) * Math.exp(-k / 5);
      }
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.5;
    src.connect(bp).connect(surface);
    src.start();
    return src;
  }

  function schedule() {
    const c = ctx!;
    const d = DISCS[disc];
    if (!d.play) return;
    const h = hour();
    const beat = 60 / d.bpm!(h);
    while (next < c.currentTime + 0.15) {
      const swing = step % 4 === 2 ? beat * (d.swing ?? 0.08) : 0;
      d.play(kit, next + swing, step, beat, h);
      next += beat / 4;
      step++;
    }
  }

  function needle() {
    const c = ctx!;
    const d = DISCS[disc];
    level.gain.value = d.level ?? 1;
    lp.frequency.setTargetAtTime(d.src ? 12000 : (d.top ?? 2600), c.currentTime, 0.05);
    depth.gain.setTargetAtTime(d.src ? 0 : (d.wow ?? 0.0018), c.currentTime, 0.05);
    surface.gain.setTargetAtTime(d.src ? 0 : (d.crackle ?? 0.4), c.currentTime, 0.05);
    clearInterval(timer);
    tape?.pause();
    if (d.src) {
      if (!tape) {
        tape = new Audio();
        tape.crossOrigin = "anonymous";
        tape.loop = true;
        c.createMediaElementSource(tape).connect(level);
      }
      if (!tape.src.endsWith(d.src)) tape.src = d.src;
      tape.play().catch(() => {});
    } else {
      next = c.currentTime + 0.1;
      step = 0;
      timer = window.setInterval(schedule, 25);
    }
  }

  function start() {
    if (!ctx) build();
    const c = ctx!;
    c.resume();
    crackle ??= scratch();
    needle();
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
    setTimeout(() => {
      if (on) return;
      tape?.pause();
      c.suspend();
    }, 1500);
    on = false;
    localStorage.setItem(SOUND, "off");
    listeners.forEach((f) => f(false));
  }

  function put(i: number) {
    disc = i;
    localStorage.setItem(DISC, String(i));
    if (!on) return start();
    const c = ctx!;
    out.gain.cancelScheduledValues(c.currentTime);
    out.gain.setTargetAtTime(0, c.currentTime, 0.08);
    setTimeout(() => {
      if (disc !== i || !on) return;
      needle();
      out.gain.cancelScheduledValues(c.currentTime);
      out.gain.setTargetAtTime(0.8, c.currentTime, 0.4);
      listeners.forEach((f) => f(true));
    }, 350);
  }

  return {
    start,
    stop,
    put,
    toggle: () => (on ? stop() : start()),
    get on() {
      return on;
    },
    get disc() {
      return disc;
    },
    get ctx() {
      return ctx;
    },
    get out() {
      return ctx ? out : null;
    },
    wanted: () => localStorage.getItem(SOUND) === "on",
    onChange: (f: (on: boolean) => void) => listeners.push(f),
    about: () => {
      const d = DISCS[disc];
      return d.src ? `${d.title}, ${d.by}` : d.about(hour());
    },
    label: () => (on ? "止 · stop the record" : "針 · play the record"),
  };
}

export type Radio = ReturnType<typeof radioOf>;
