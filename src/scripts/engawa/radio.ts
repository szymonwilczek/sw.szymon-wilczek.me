import { DISCS, type Kit } from "./discs";

const SOUND = "engawa:sound";
const DISC = "engawa:disc";
const VOLUME = "engawa:volume";

export function radioOf(hour: () => number) {
  let audio: AudioContext | null = null;
  let output: GainNode;
  let lowpass: BiquadFilterNode;
  let depth: GainNode;
  let level: GainNode;
  let kit: Kit;
  let crackle: AudioBufferSourceNode | null = null;
  let surface: GainNode;
  let tape: HTMLAudioElement | null = null;
  let timer = 0;
  let next = 0;
  let step = 0;
  let playing = false;
  let disc = Math.min(DISCS.length - 1, Math.max(0, Number(localStorage.getItem(DISC)) || 0));
  let volumeLevel = Math.min(1, Math.max(0, Number(localStorage.getItem(VOLUME) ?? 0.8) || 0));
  const listeners: ((isOn: boolean) => void)[] = [];
  const louder: ((amount: number) => void)[] = [];

  function build() {
    const context = (audio = new AudioContext());
    output = context.createGain();
    output.gain.value = 0;
    lowpass = context.createBiquadFilter();
    lowpass.type = "lowpass";
    lowpass.Q.value = 0.4;
    const flutter = context.createDelay(0.05);
    flutter.delayTime.value = 0.012;
    const flutterRate = context.createOscillator();
    depth = context.createGain();
    flutterRate.frequency.value = 0.33;
    flutterRate.connect(depth).connect(flutter.delayTime);
    flutterRate.start();
    const glue = context.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.ratio.value = 3;
    lowpass.connect(flutter).connect(glue).connect(output).connect(context.destination);
    const echo = context.createDelay(1),
      feedback = context.createGain(),
      echoLevel = context.createGain();
    echo.delayTime.value = 0.43;
    feedback.gain.value = 0.32;
    echoLevel.gain.value = 0.35;
    echo.connect(feedback).connect(echo);
    echo.connect(echoLevel).connect(lowpass);
    const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    level = context.createGain();
    level.connect(lowpass);
    kit = { ctx: context, bus: level, echo, noise };
    surface = context.createGain();
    surface.connect(output);
  }

  function scratch() {
    const context = audio!;
    const length = context.sampleRate * 6;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      samples[i] = (Math.random() * 2 - 1) * 0.008;
      if (Math.random() < 0.00002) {
        const amplitude = 0.06 + Math.random() * 0.12;
        for (let offset = 0; offset < 30 && i + offset < length; offset++)
          samples[i + offset] += amplitude * (Math.random() * 2 - 1) * Math.exp(-offset / 5);
      }
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 2400;
    bandpass.Q.value = 0.5;
    source.connect(bandpass).connect(surface);
    source.start();
    return source;
  }

  function schedule() {
    const context = audio!;
    const current = DISCS[disc];
    if (!current.play) return;
    const hourNow = hour();
    const beat = 60 / current.bpm!(hourNow);
    while (next < context.currentTime + 0.15) {
      const swing = step % 4 === 2 ? beat * (current.swing ?? 0.08) : 0;
      current.play(kit, next + swing, step, beat, hourNow);
      next += beat / 4;
      step++;
    }
  }

  function needle() {
    const context = audio!;
    const current = DISCS[disc];
    level.gain.value = current.level ?? 1;
    lowpass.frequency.setTargetAtTime(
      current.src ? 12000 : (current.top ?? 2600),
      context.currentTime,
      0.05,
    );
    depth.gain.setTargetAtTime(
      current.src ? 0 : (current.wow ?? 0.0018),
      context.currentTime,
      0.05,
    );
    surface.gain.setTargetAtTime(
      current.src ? 0 : (current.crackle ?? 0.4),
      context.currentTime,
      0.05,
    );
    clearInterval(timer);
    tape?.pause();
    if (current.src) {
      if (!tape) {
        tape = new Audio();
        tape.crossOrigin = "anonymous";
        tape.loop = true;
        context.createMediaElementSource(tape).connect(level);
      }
      if (!tape.src.endsWith(current.src)) tape.src = current.src;
      tape.play().catch(() => {});
    } else {
      next = context.currentTime + 0.1;
      step = 0;
      timer = window.setInterval(schedule, 25);
    }
  }

  function start() {
    if (!audio) build();
    const context = audio!;
    context.resume();
    crackle ??= scratch();
    needle();
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(volumeLevel, context.currentTime, 0.6);
    playing = true;
    localStorage.setItem(SOUND, "on");
    listeners.forEach((listener) => listener(true));
  }

  function stop() {
    if (!audio || !playing) return;
    const context = audio;
    output.gain.setTargetAtTime(0, context.currentTime, 0.3);
    clearInterval(timer);
    setTimeout(() => {
      if (playing) return;
      tape?.pause();
      context.suspend();
    }, 1500);
    playing = false;
    localStorage.setItem(SOUND, "off");
    listeners.forEach((listener) => listener(false));
  }

  function switchTo(i: number) {
    disc = i;
    localStorage.setItem(DISC, String(i));
    if (!playing) return start();
    const context = audio!;
    output.gain.cancelScheduledValues(context.currentTime);
    output.gain.setTargetAtTime(0, context.currentTime, 0.08);
    setTimeout(() => {
      if (disc !== i || !playing) return;
      needle();
      output.gain.cancelScheduledValues(context.currentTime);
      output.gain.setTargetAtTime(volumeLevel, context.currentTime, 0.4);
      listeners.forEach((listener) => listener(true));
    }, 350);
  }

  function volume(amount: number) {
    volumeLevel = Math.min(1, Math.max(0, amount));
    localStorage.setItem(VOLUME, String(volumeLevel));
    if (audio && playing) output.gain.setTargetAtTime(volumeLevel, audio.currentTime, 0.05);
    louder.forEach((listener) => listener(volumeLevel));
  }

  return {
    start,
    stop,
    put: switchTo,
    toggle: () => (playing ? stop() : start()),
    get on() {
      return playing;
    },
    get disc() {
      return disc;
    },
    get ctx() {
      return audio;
    },
    get out() {
      return audio ? output : null;
    },
    wanted: () => localStorage.getItem(SOUND) === "on",
    onChange: (listener: (isOn: boolean) => void) => listeners.push(listener),
    get volume() {
      return volumeLevel;
    },
    setVolume: volume,
    onVolume: (listener: (amount: number) => void) => louder.push(listener),
    about: () => {
      const current = DISCS[disc];
      return current.src ? `${current.title}, ${current.by}` : current.about(hour());
    },
    label: () => (playing ? "止 · stop the record" : "針 · play the record"),
  };
}

export type Radio = ReturnType<typeof radioOf>;
