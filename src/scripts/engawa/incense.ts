import type { Fill } from "./cards";
import type { View } from "./scene";

const LIT = "engawa:incense";
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
  const ctx = new AudioContext();
  const t = ctx.currentTime;
  [
    [528, 0.22, 5],
    [1328, 0.08, 2.5],
    [2112, 0.04, 1.2],
  ].forEach(([f, v, d]) => {
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.frequency.value = f;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + d);
  });
  setTimeout(() => ctx.close(), 6000);
}

export function incenseOf(scene: { view: View; draw: () => void }) {
  let stick = load<Stick>(LIT);
  let rounds = load<Rounds>(ROUNDS) ?? { day: today(), today: 0, total: 0 };
  let len = stick?.min ?? 25;
  const title = document.title;
  let shown = -1;
  let body: HTMLElement | null = null;

  const left = () => (stick ? stick.start + stick.min * 60_000 - Date.now() : 0);
  const burnt = () => (stick ? Math.min(1, (Date.now() - stick.start) / (stick.min * 60_000)) : 0);
  const mmss = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  function count() {
    if (rounds.day !== today()) rounds = { day: today(), today: 0, total: rounds.total };
    return rounds;
  }

  function light(min: number) {
    stick = { start: Date.now(), min };
    localStorage.setItem(LIT, JSON.stringify(stick));
    shown = -1;
    tick();
    paint();
  }

  function putOut(done: boolean) {
    stick = null;
    localStorage.removeItem(LIT);
    document.title = title;
    if (done) {
      const r = count();
      rounds = { day: r.day, today: r.today + 1, total: r.total + 1 };
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
      if (load<Stick>(LIT)?.start !== stick.start) return putOut(false);
      try {
        bell();
      } catch {
        // no sound to be had; the round still counts
      }
      return putOut(true);
    }
    document.title = `香 ${mmss(left())} · ${title}`;
    const step = Math.floor(burnt() * 40);
    if (step !== shown) {
      shown = step;
      scene.view.incense = { burnt: burnt(), lit: true };
      scene.draw();
    }
    if (body) {
      const bar = body.querySelector<HTMLElement>(".inc-ash");
      if (bar) bar.style.width = `${burnt() * 100}%`;
      const t = body.querySelector(".inc-left");
      if (t)
        t.textContent = `${Math.floor((Date.now() - stick.start) / 60_000)} min burnt · ${mmss(left())} left`;
    }
  }
  setInterval(tick, 1000);
  tick();
  // stick lit in another tab burns here too
  addEventListener("storage", (e) => {
    if (e.key === LIT) {
      stick = load<Stick>(LIT);
      if (!stick) document.title = title;
      shown = -1;
      paint();
    }
    if (e.key === ROUNDS) {
      rounds = load<Rounds>(ROUNDS) ?? rounds;
      paint();
    }
  });

  function paint(justDone = false) {
    if (!body) return;
    const r = count();
    const knob = (text: string, cls: string, on = false) =>
      `<button type="button" class="card-knob ${cls}" aria-pressed="${on}">${text}</button>`;
    body.innerHTML = stick
      ? `<p class="card-big">a stick of ${stick.min} minutes is burning</p>
        <div class="inc-stick" aria-hidden="true"><span class="inc-ash"></span><span class="inc-ember"></span></div>
        <p class="inc-left card-small"></p>
        ${knob("消 · put it out", "inc-out")}`
      : `<p class="card-big">${justDone ? "burnt down. rest a little." : "light a stick, and work while it burns."}</p>
        <p class="inc-lens">${LENGTHS.map((m) => knob(`${m} min`, "inc-len", m === len)).join(" ")}
        <label class="inc-own card-small">or <input type="number" min="1" max="180" value="${LENGTHS.includes(len) ? "" : len}" placeholder="min" aria-label="Minutes, your own"></label></p>
        ${knob(`火 · light it`, "inc-light")}`;
    body.insertAdjacentHTML(
      "beforeend",
      `<p class="inc-rounds"><span class="card-kanji-s">回</span> ${r.today} today · ${r.total} in all</p>`,
    );
    body.querySelectorAll<HTMLButtonElement>(".inc-len").forEach((b) =>
      b.addEventListener("click", () => {
        len = parseInt(b.textContent!, 10);
        paint();
      }),
    );
    body.querySelector<HTMLInputElement>(".inc-own input")?.addEventListener("change", (e) => {
      const v = Math.round(Number((e.target as HTMLInputElement).value));
      if (v >= 1 && v <= 180) len = v;
      paint();
    });
    body.querySelector(".inc-light")?.addEventListener("click", () => light(len));
    body.querySelector(".inc-out")?.addEventListener("click", () => putOut(false));
    tick();
  }

  const fill: Fill = {
    make(b) {
      body = b;
      paint();
    },
    leave: () => (body = null),
  };
  return {
    fill,
    get left() {
      return stick ? mmss(left()) : null;
    },
    get burning() {
      return stick !== null;
    },
  };
}
