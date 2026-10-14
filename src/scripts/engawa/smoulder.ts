const SOUND_KEY = "engawa:incense-sound";

const NOISE_SECONDS = 4; // length of the looped noise, long enough not to be heard repeating
const FADE_IN = 4; // seconds, as the stick catches
const FADE_OUT = 1.5; // seconds, when it is put out or burns down
const SILENT = 0.0001; // what a fade starts from and ends at

// the ember's whisper
const WHISPER_LEVEL = 0.006;
const WHISPER_FROM = 2500; // Hz, everything under this is cut
const WHISPER_TO = 7000; // Hz, and everything over
const WHISPER_RATE = 0.07; // Hz, about one slow swell in fourteen seconds
const WHISPER_DEPTH = 0.5; // share of the level it swells by

// crackles
const CRACKLE_GAP = { min: 0.4, max: 3 }; // seconds
const CRACKLE_PITCH = { min: 1500, max: 4500 }; // Hz
const CRACKLE_RESONANCE = 4;
const CRACKLE_LEVEL = { min: 0.012, max: 0.04 }; // before the bandpass takes most of it away
const CRACKLE_LENGTH = { min: 0.006, max: 0.018 }; // seconds
const BURST = 0.35; // chance a crackle comes with a few more right after it
const BURST_MORE = { min: 1, max: 3 }; // how many more
const BURST_GAP = { min: 0.02, max: 0.09 }; // seconds between them

const between = ({ min, max }: { min: number; max: number }) => min + Math.random() * (max - min);

export function smoulderOf() {
  let audio: AudioContext | null = null;
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
      gain = context.createGain(),
      length = between(CRACKLE_LENGTH);
    source.buffer = whiteNoise(context);
    bandpass.type = "bandpass";
    bandpass.frequency.value = between(CRACKLE_PITCH);
    bandpass.Q.value = CRACKLE_RESONANCE;
    gain.gain.setValueAtTime(between(CRACKLE_LEVEL), time);
    gain.gain.exponentialRampToValueAtTime(SILENT, time + length);
    source.connect(bandpass).connect(gain).connect(out);
    source.start(time, Math.random() * NOISE_SECONDS);
    source.stop(time + length);
  }

  function crackleLater(context: AudioContext, out: AudioNode) {
    crackles = window.setTimeout(
      () => {
        let time = context.currentTime;
        crackle(context, out, time);
        if (Math.random() < BURST)
          for (let more = Math.round(between(BURST_MORE)); more > 0; more--) {
            time += between(BURST_GAP);
            crackle(context, out, time);
          }
        crackleLater(context, out);
      },
      between(CRACKLE_GAP) * 1000,
    );
  }

  function whisper(context: AudioContext) {
    const out = context.createGain(),
      source = context.createBufferSource(),
      highpass = context.createBiquadFilter(),
      lowpass = context.createBiquadFilter(),
      air = context.createGain(),
      swell = context.createOscillator(),
      swellDepth = context.createGain();
    out.gain.setValueAtTime(SILENT, context.currentTime);
    out.gain.exponentialRampToValueAtTime(1, context.currentTime + FADE_IN);
    out.connect(context.destination);
    source.buffer = whiteNoise(context);
    source.loop = true;
    highpass.type = "highpass";
    highpass.frequency.value = WHISPER_FROM;
    lowpass.type = "lowpass";
    lowpass.frequency.value = WHISPER_TO;
    air.gain.value = WHISPER_LEVEL;
    swell.frequency.value = WHISPER_RATE;
    swellDepth.gain.value = WHISPER_LEVEL * WHISPER_DEPTH;
    swell.connect(swellDepth).connect(air.gain);
    source.connect(highpass).connect(lowpass).connect(air).connect(out);
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
    layer = whisper(audio);
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
