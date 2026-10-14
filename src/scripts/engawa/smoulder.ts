const SOUND_KEY = "engawa:incense-sound";

const FADE_IN = 4; // seconds, as the stick catches
const FADE_OUT = 1.5; // seconds, when it is put out or burns down
const SILENT = 0.0001; // what a fade starts from and ends at

// crackles
const CRACKLE_GAP = { min: 0.4, max: 3 }; // seconds
const SNAP_SECONDS = { min: 0.004, max: 0.016 }; // how long one snap's splinters take
const SPLINTERS = { min: 2, max: 6 }; // in one snap
const SPLINTER_FADE = 0.0003; // seconds for a splinter to die away to a third
const SPLINTER_LOUDNESS = { min: 0.3, max: 1 }; // of each splinter, against the loudest
const CRACKLE_FROM = 1200; // Hz, the dull thump under a snap is cut
const CRACKLE_LEVEL = { min: 0.02, max: 0.06 };
const BURST = 0.35; // chance a crackle comes with a few more right after it
const BURST_MORE = { min: 1, max: 3 }; // how many more
const BURST_GAP = { min: 0.02, max: 0.09 }; // seconds between them

const between = ({ min, max }: { min: number; max: number }) => min + Math.random() * (max - min);

export function smoulderOf() {
  let audio: AudioContext | null = null;
  let layer: { out: GainNode; stop: () => void } | null = null;
  let crackles = 0;

  const wanted = () => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  };

  function snapOf(context: AudioContext) {
    const rate = context.sampleRate,
      length = Math.ceil(rate * between(SNAP_SECONDS)),
      snap = context.createBuffer(1, length, rate),
      samples = snap.getChannelData(0);
    for (let splinter = Math.round(between(SPLINTERS)); splinter > 0; splinter--) {
      const at = Math.floor(Math.random() * length),
        loudness = between(SPLINTER_LOUDNESS);
      for (let i = at; i < length; i++) {
        const fade = Math.exp(-(i - at) / (rate * SPLINTER_FADE));
        samples[i] += (Math.random() * 2 - 1) * loudness * fade;
      }
    }
    return snap;
  }

  function crackle(context: AudioContext, out: AudioNode, time: number) {
    const source = context.createBufferSource(),
      highpass = context.createBiquadFilter(),
      gain = context.createGain();
    source.buffer = snapOf(context);
    highpass.type = "highpass";
    highpass.frequency.value = CRACKLE_FROM;
    gain.gain.value = between(CRACKLE_LEVEL);
    source.connect(highpass).connect(gain).connect(out);
    source.start(time);
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

  function crackling(context: AudioContext) {
    const out = context.createGain();
    out.gain.setValueAtTime(SILENT, context.currentTime);
    out.gain.exponentialRampToValueAtTime(1, context.currentTime + FADE_IN);
    out.connect(context.destination);
    crackleLater(context, out);
    return {
      out,
      stop() {
        clearTimeout(crackles);
        const time = context.currentTime;
        out.gain.cancelScheduledValues(time);
        out.gain.setValueAtTime(out.gain.value, time);
        out.gain.exponentialRampToValueAtTime(SILENT, time + FADE_OUT);
        setTimeout(() => out.disconnect(), FADE_OUT * 1000);
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
    layer = crackling(audio);
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
