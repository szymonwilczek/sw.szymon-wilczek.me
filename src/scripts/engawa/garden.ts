import type { View } from "./scene";

type Ear = { ctx: AudioContext | null; out: GainNode | null; on: boolean };

export function gardenOf(radio: Ear, view: View) {
  let noise: AudioBuffer | null = null;
  let cicadas: { stop: () => void } | null = null;
  const chance = (probability: number) => Math.random() < probability;

  function white(audio: AudioContext) {
    if (noise) return noise;
    noise = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return noise;
  }

  function tone(
    audio: AudioContext,
    output: AudioNode,
    time: number,
    frequency: number,
    peak: number,
    duration: number,
  ) {
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(output);
    osc.start(time);
    osc.stop(time + duration + 0.02);
    return osc;
  }

  function hiss(
    audio: AudioContext,
    output: AudioNode,
    time: number,
    frequency: number,
    resonance: number,
    peak: number,
    attack: number,
    duration: number,
  ) {
    const source = audio.createBufferSource(),
      bandpass = audio.createBiquadFilter(),
      gain = audio.createGain();
    source.buffer = white(audio);
    bandpass.type = "bandpass";
    bandpass.frequency.value = frequency;
    bandpass.Q.value = resonance;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + attack + duration);
    source.connect(bandpass).connect(gain).connect(output);
    source.start(time, Math.random());
    source.stop(time + attack + duration + 0.05);
  }

  function furin(audio: AudioContext, output: AudioNode, time: number) {
    const frequency = 2350 + Math.random() * 120;
    [1, 2.76, 5.4].forEach((ratio, i) =>
      tone(audio, output, time, frequency * ratio, 0.03 / (i + 1), 2.2 - i * 0.6),
    );
    if (chance(0.5))
      [1, 2.76].forEach((ratio, i) =>
        tone(audio, output, time + 0.35, frequency * ratio, 0.015 / (i + 1), 1.4),
      );
  }

  function warbler(audio: AudioContext, output: AudioNode, time: number) {
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.frequency.setValueAtTime(1500, time);
    osc.frequency.linearRampToValueAtTime(1600, time + 0.9);
    osc.frequency.setValueAtTime(2600, time + 1.05);
    osc.frequency.exponentialRampToValueAtTime(3600, time + 1.25);
    osc.frequency.exponentialRampToValueAtTime(2200, time + 1.45);
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.02, time + 0.15);
    gain.gain.setValueAtTime(0.02, time + 0.85);
    gain.gain.linearRampToValueAtTime(0, time + 0.95);
    gain.gain.linearRampToValueAtTime(0.025, time + 1.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.5);
    osc.connect(gain).connect(output);
    osc.start(time);
    osc.stop(time + 1.6);
  }

  function cricket(audio: AudioContext, output: AudioNode, time: number) {
    const frequency = 4200 + Math.random() * 400;
    const chirps = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < chirps; i++) tone(audio, output, time + i * 0.06, frequency, 0.012, 0.04);
  }

  function cicada(audio: AudioContext, output: AudioNode) {
    const source = audio.createBufferSource(),
      bandpass = audio.createBiquadFilter(),
      gain = audio.createGain(),
      swell = audio.createGain(),
      pulse = audio.createOscillator(),
      pulseDepth = audio.createGain(),
      slow = audio.createOscillator(),
      swellDepth = audio.createGain();
    source.buffer = white(audio);
    source.loop = true;
    bandpass.type = "bandpass";
    bandpass.frequency.value = 5200;
    bandpass.Q.value = 3;
    gain.gain.value = 0.006;
    pulse.frequency.value = 38;
    pulseDepth.gain.value = 0.005;
    pulse.connect(pulseDepth).connect(gain.gain);
    swell.gain.value = 0.6;
    slow.frequency.value = 0.07;
    swellDepth.gain.value = 0.4;
    slow.connect(swellDepth).connect(swell.gain);
    source.connect(bandpass).connect(gain).connect(swell).connect(output);
    [source, pulse, slow].forEach((node) => node.start());
    return { stop: () => [source, pulse, slow].forEach((node) => node.stop()) };
  }

  function tick() {
    const audio = radio.ctx,
      output = radio.out;
    if (!audio || !output || !radio.on) {
      cicadas?.stop();
      cicadas = null;
      return;
    }
    const time = audio.currentTime + 0.05 + Math.random() * 0.8;
    const hour = view.hour,
      season = view.season;
    if ((season === "haru" || season === "natsu") && chance(1 / 14)) furin(audio, output, time);
    if (season === "haru" && hour >= 5 && hour < 10 && chance(1 / 18)) warbler(audio, output, time);
    if (season === "aki" && (hour >= 19 || hour < 5) && chance(0.3)) cricket(audio, output, time);
    if (season === "fuyu" && chance(1 / 50)) hiss(audio, output, time, 500, 0.7, 0.03, 0.4, 1.4);
    const dusk = season === "natsu" && hour >= 16 && hour < 20;
    if (dusk && !cicadas) cicadas = cicada(audio, output);
    if (!dusk && cicadas) {
      cicadas.stop();
      cicadas = null;
    }
  }
  setInterval(tick, 1000);
}
