import type { Fill } from "./cards";
import type { View } from "./scene";

const LIT_KEY = "engawa:incense";
const ROUNDS = "engawa:rounds";
const LENGTHS = [15, 25, 50];

interface Stick {
  start: number;
  min: number;
}
interface Rounds {
  day: string;
  today: number;
  total: number;
}

const today = () => new Date().toLocaleDateString("en-CA");
function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function bell() {
  const audio = new AudioContext();
  const time = audio.currentTime;
  [
    [528, 0.22, 5],
    [1328, 0.08, 2.5],
    [2112, 0.04, 1.2],
  ].forEach(([frequency, peak, duration]) => {
    const osc = audio.createOscillator(),
      gain = audio.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(time);
    osc.stop(time + duration);
  });
  setTimeout(() => audio.close(), 6000);
}

export function incenseOf(scene: { view: View; draw: () => void }) {
  let stick = load<Stick>(LIT_KEY);
  let rounds = load<Rounds>(ROUNDS) ?? { day: today(), today: 0, total: 0 };
  let minutes = stick?.min ?? 25;
  const title = document.title;
  let shown = -1;
  let body: HTMLElement | null = null;

  const left = () => (stick ? stick.start + stick.min * 60_000 - Date.now() : 0);
  const burnt = () => (stick ? Math.min(1, (Date.now() - stick.start) / (stick.min * 60_000)) : 0);
  const clockLabel = (millis: number) => {
    const seconds = Math.max(0, Math.ceil(millis / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  };

  function count() {
    if (rounds.day !== today()) rounds = { day: today(), today: 0, total: rounds.total };
    return rounds;
  }

  function light(stickMinutes: number) {
    stick = { start: Date.now(), min: stickMinutes };
    localStorage.setItem(LIT_KEY, JSON.stringify(stick));
    shown = -1;
    tick();
    paint();
  }

  function putOut(done: boolean) {
    stick = null;
    localStorage.removeItem(LIT_KEY);
    document.title = title;
    if (done) {
      const remaining = count();
      rounds = { day: remaining.day, today: remaining.today + 1, total: remaining.total + 1 };
      localStorage.setItem(ROUNDS, JSON.stringify(rounds));
    }
    scene.view.incense = done ? { burnt: 1, lit: false } : null;
    scene.draw();
    paint(done);
  }

  function tick() {
    if (!stick) return;
    if (left() <= 0) {
      // with two tabs open only the one that finds the stick still lit counts it
      if (load<Stick>(LIT_KEY)?.start !== stick.start) return putOut(false);
      try {
        bell();
      } catch {
        // no sound to be had; the round still counts
      }
      return putOut(true);
    }
    document.title = `香 ${clockLabel(left())} · ${title}`;
    const step = Math.floor(burnt() * 40);
    if (step !== shown) {
      shown = step;
      scene.view.incense = { burnt: burnt(), lit: true };
      scene.draw();
    }
    if (body) {
      const ash = body.querySelector<HTMLElement>(".inc-ash");
      if (ash) ash.style.width = `${burnt() * 100}%`;
      const leftLabel = body.querySelector(".inc-left");
      if (leftLabel)
        leftLabel.textContent = `${Math.floor((Date.now() - stick.start) / 60_000)} min burnt · ${clockLabel(left())} left`;
    }
  }
  setInterval(tick, 1000);
  tick();
  // stick lit in another tab burns here too
  addEventListener("storage", (event) => {
    if (event.key === LIT_KEY) {
      stick = load<Stick>(LIT_KEY);
      if (!stick) document.title = title;
      shown = -1;
      paint();
    }
    if (event.key === ROUNDS) {
      rounds = load<Rounds>(ROUNDS) ?? rounds;
      paint();
    }
  });

  function paint(justDone = false) {
    if (!body) return;
    const remaining = count();
    const knob = (text: string, className: string, active = false) =>
      `<button type="button" class="card-knob ${className}" aria-pressed="${active}">${text}</button>`;
    body.innerHTML = stick
      ? `<p class="card-big">a stick of ${stick.min} minutes is burning</p>
        <div class="inc-stick" aria-hidden="true"><span class="inc-ash"></span><span class="inc-ember"></span></div>
        <p class="inc-left card-small"></p>
        ${knob("消 · put it out", "inc-out")}`
      : `<p class="card-big">${justDone ? "burnt down. rest a little." : "light a stick, and work while it burns."}</p>
        <p class="inc-lens">${LENGTHS.map((choice) => knob(`${choice} min`, "inc-len", choice === minutes)).join(" ")}
        <label class="inc-own card-small">or <input type="number" min="1" max="180" value="${LENGTHS.includes(minutes) ? "" : minutes}" placeholder="min" aria-label="Minutes, your own"></label></p>
        ${knob(`火 · light it`, "inc-light")}`;
    body.insertAdjacentHTML(
      "beforeend",
      `<p class="inc-rounds"><span class="card-kanji-s">回</span> ${remaining.today} today · ${remaining.total} in all</p>`,
    );
    body.querySelectorAll<HTMLButtonElement>(".inc-len").forEach((button) =>
      button.addEventListener("click", () => {
        minutes = parseInt(button.textContent!, 10);
        paint();
      }),
    );
    body.querySelector<HTMLInputElement>(".inc-own input")?.addEventListener("change", (event) => {
      const typed = Math.round(Number((event.target as HTMLInputElement).value));
      if (typed >= 1 && typed <= 180) minutes = typed;
      paint();
    });
    body.querySelector(".inc-light")?.addEventListener("click", () => light(minutes));
    body.querySelector(".inc-out")?.addEventListener("click", () => putOut(false));
    tick();
  }

  const fill: Fill = {
    make(panel) {
      body = panel;
      paint();
    },
    leave: () => (body = null),
  };
  return {
    fill,
    get left() {
      return stick ? clockLabel(left()) : null;
    },
    get burning() {
      return stick !== null;
    },
  };
}
