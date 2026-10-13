const SOUND_KEY = "engawa:incense-sound";

const NOISE_SECONDS = 4; // length of the looped noise, long enough not to be heard repeating
const FADE_IN = 4; // seconds, as the stick catches
const FADE_OUT = 1.5; // seconds, when it is put out or burns down
const SILENT = 0.0001; // what a fade starts from and ends at

const BREATH_LEVEL = 0.05;
const BREATH_LOWPASS = 700; // Hz
const BREATH_RATE = 0.07; // Hz, about one slow breath in fourteen seconds
const BREATH_DEPTH = 0.4; // share of the level the breath swells by
const BROWN_LEAK = 0.02; // how fast the brown noise drifts back to the middle
const BROWN_GAIN = 3.5; // brings the brown noise back up to about full scale

const CRACKLE_GAP = { min: 0.7, max: 3.5 }; // seconds
const CRACKLE_PITCH = { min: 2800, max: 5600 }; // Hz
const CRACKLE_RESONANCE = 6;
const CRACKLE_LEVEL = { min: 0.03, max: 0.09 }; // before the narrow bandpass takes most of it away
const CRACKLE_LENGTH = 0.014; // seconds
const DOUBLE_CRACKLE = 0.25; // chance a crackle comes with a second one right after it
const DOUBLE_GAP = 0.03; // seconds between the two

const between = ({ min, max }: { min: number; max: number }) => min + Math.random() * (max - min);

export function smoulderOf() {
  let audio: AudioContext | null = null;
  let brown: AudioBuffer | null = null;
  let white: AudioBuffer | null = null;
  let layer: { out: GainNode; stop: () => void } | null = null;
  let crackles = 0;

  const wanted = () => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  };

  function brownNoise(context: AudioContext) {
    if (brown) return brown;
    brown = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
    const samples = brown.getChannelData(0);
    let drift = 0;
    for (let i = 0; i < samples.length; i++) {
      drift = (drift + BROWN_LEAK * (Math.random() * 2 - 1)) / (1 + BROWN_LEAK);
      samples[i] = drift * BROWN_GAIN;
    }
    return brown;
  }

  function whiteNoise(context: AudioContext) {
    if (white) return white;
    white = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
    const samples = white.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return white;
  }

  function crackle(context: AudioContext, out: AudioNode, time: number) {
    const source = context.createBufferSource(),
      bandpass = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = whiteNoise(context);
    bandpass.type = "bandpass";
    bandpass.frequency.value = between(CRACKLE_PITCH);
    bandpass.Q.value = CRACKLE_RESONANCE;
    gain.gain.setValueAtTime(between(CRACKLE_LEVEL), time);
    gain.gain.exponentialRampToValueAtTime(SILENT, time + CRACKLE_LENGTH);
    source.connect(bandpass).connect(gain).connect(out);
    source.start(time, Math.random() * NOISE_SECONDS);
    source.stop(time + CRACKLE_LENGTH);
  }

  function crackleLater(context: AudioContext, out: AudioNode) {
    crackles = window.setTimeout(
      () => {
        const time = context.currentTime;
        crackle(context, out, time);
        if (Math.random() < DOUBLE_CRACKLE) crackle(context, out, time + DOUBLE_GAP);
        crackleLater(context, out);
      },
      between(CRACKLE_GAP) * 1000,
    );
  }

  function breathe(context: AudioContext) {
    const out = context.createGain(),
      source = context.createBufferSource(),
      lowpass = context.createBiquadFilter(),
      breath = context.createGain(),
      swell = context.createOscillator(),
      swellDepth = context.createGain();
    out.gain.setValueAtTime(SILENT, context.currentTime);
    out.gain.exponentialRampToValueAtTime(1, context.currentTime + FADE_IN);
    out.connect(context.destination);
    source.buffer = brownNoise(context);
    source.loop = true;
    lowpass.type = "lowpass";
    lowpass.frequency.value = BREATH_LOWPASS;
    breath.gain.value = BREATH_LEVEL;
    swell.frequency.value = BREATH_RATE;
    swellDepth.gain.value = BREATH_LEVEL * BREATH_DEPTH;
    swell.connect(swellDepth).connect(breath.gain);
    source.connect(lowpass).connect(breath).connect(out);
    source.start();
    swell.start();
    crackleLater(context, out);
    return {
      out,
      stop() {
        clearTimeout(crackles);
        const time = context.currentTime;
        out.gain.cancelScheduledValues(time);
        out.gain.setValueAtTime(out.gain.value, time);
        out.gain.exponentialRampToValueAtTime(SILENT, time + FADE_OUT);
        source.stop(time + FADE_OUT);
        swell.stop(time + FADE_OUT);
      },
    };
  }

  function start() {
    if (layer || !wanted()) return;
    try {
      audio ??= new AudioContext();
    } catch {
      return; // no sound to be had
    }
    layer = breathe(audio);
    if (audio.state === "suspended")
      addEventListener("pointerdown", () => audio?.resume(), { once: true });
  }

  function stop() {
    layer?.stop();
    layer = null;
  }

  return {
    start,
    stop,
    get wanted() {
      return wanted();
    },
    set wanted(on: boolean) {
      try {
        localStorage.setItem(SOUND_KEY, on ? "on" : "off");
      } catch {
        // kept for this visit only
      }
    },
  };
}
