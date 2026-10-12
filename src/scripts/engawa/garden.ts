import type { View } from "./scene";

type Ear = { ctx: AudioContext | null; out: GainNode | null; on: boolean };

export function gardenOf(radio: Ear, view: View, burning: () => boolean) {
  let noise: AudioBuffer | null = null;
  let cicadas: { stop: () => void } | null = null;
  const chance = (p: number) => Math.random() < p;

  function white(c: AudioContext) {
    if (noise) return noise;
    noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noise;
  }

  function tone(c: AudioContext, out: AudioNode, t: number, f: number, v: number, d: number) {
    const o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + d + 0.02);
    return o;
  }

  function hiss(
    c: AudioContext,
    out: AudioNode,
    t: number,
    f: number,
    q: number,
    v: number,
    a: number,
    d: number,
  ) {
    const s = c.createBufferSource(),
      b = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = white(c);
    b.type = "bandpass";
    b.frequency.value = f;
    b.Q.value = q;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(b).connect(g).connect(out);
    s.start(t, Math.random());
    s.stop(t + a + d + 0.05);
  }

  function furin(c: AudioContext, out: AudioNode, t: number) {
    const f = 2350 + Math.random() * 120;
    [1, 2.76, 5.4].forEach((m, i) => tone(c, out, t, f * m, 0.03 / (i + 1), 2.2 - i * 0.6));
    if (chance(0.5))
      [1, 2.76].forEach((m, i) => tone(c, out, t + 0.35, f * m, 0.015 / (i + 1), 1.4));
  }

  function warbler(c: AudioContext, out: AudioNode, t: number) {
    const o = c.createOscillator(),
      g = c.createGain();
    o.frequency.setValueAtTime(1500, t);
    o.frequency.linearRampToValueAtTime(1600, t + 0.9);
    o.frequency.setValueAtTime(2600, t + 1.05);
    o.frequency.exponentialRampToValueAtTime(3600, t + 1.25);
    o.frequency.exponentialRampToValueAtTime(2200, t + 1.45);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + 0.15);
    g.gain.setValueAtTime(0.02, t + 0.85);
    g.gain.linearRampToValueAtTime(0, t + 0.95);
    g.gain.linearRampToValueAtTime(0.025, t + 1.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 1.6);
  }

  function cricket(c: AudioContext, out: AudioNode, t: number) {
    const f = 4200 + Math.random() * 400;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) tone(c, out, t + i * 0.06, f, 0.012, 0.04);
  }

  function cicada(c: AudioContext, out: AudioNode) {
    const s = c.createBufferSource(),
      b = c.createBiquadFilter(),
      g = c.createGain(),
      swell = c.createGain(),
      lfo = c.createOscillator(),
      ld = c.createGain(),
      slow = c.createOscillator(),
      sd = c.createGain();
    s.buffer = white(c);
    s.loop = true;
    b.type = "bandpass";
    b.frequency.value = 5200;
    b.Q.value = 3;
    g.gain.value = 0.006;
    lfo.frequency.value = 38;
    ld.gain.value = 0.005;
    lfo.connect(ld).connect(g.gain);
    swell.gain.value = 0.6;
    slow.frequency.value = 0.07;
    sd.gain.value = 0.4;
    slow.connect(sd).connect(swell.gain);
    s.connect(b).connect(g).connect(swell).connect(out);
    [s, lfo, slow].forEach((n) => n.start());
    return { stop: () => [s, lfo, slow].forEach((n) => n.stop()) };
  }

  function tick() {
    const c = radio.ctx,
      out = radio.out;
    if (!c || !out || !radio.on) {
      cicadas?.stop();
      cicadas = null;
      return;
    }
    const t = c.currentTime + 0.05 + Math.random() * 0.8;
    const h = view.hour,
      s = view.season;
    if (burning() && chance(0.35)) hiss(c, out, t, 2400, 2, 0.02, 0.002, 0.03);
    if ((s === "haru" || s === "natsu") && chance(1 / 14)) furin(c, out, t);
    if (s === "haru" && h >= 5 && h < 10 && chance(1 / 18)) warbler(c, out, t);
    if (s === "aki" && (h >= 19 || h < 5) && chance(0.3)) cricket(c, out, t);
    if (s === "fuyu" && chance(1 / 50)) hiss(c, out, t, 500, 0.7, 0.03, 0.4, 1.4);
    const dusk = s === "natsu" && h >= 16 && h < 20;
    if (dusk && !cicadas) cicadas = cicada(c, out);
    if (!dusk && cicadas) {
      cicadas.stop();
      cicadas = null;
    }
  }
  setInterval(tick, 1000);
}
