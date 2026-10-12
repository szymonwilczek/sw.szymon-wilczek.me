import { KO, koOf, moonOf, moonPath, SYNODIC } from "../../utils/koyomi";
import { sunHours, type Season } from "../../utils/engawa/sky";
import type { Fill } from "./cards";

const KANJI: Record<Season, string> = { haru: "春", natsu: "夏", aki: "秋", fuyu: "冬" };
const hhmm = (h: number) => `${Math.floor(h)}:${String(Math.floor((h % 1) * 60)).padStart(2, "0")}`;
const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
const el = (tag: string, cls: string, text = "") => {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
};

// small season, five days or so, and the year as a ring of 72
export const tree: Fill = {
  make(body) {
    const now = new Date();
    const { ko, until, sekki } = koOf(now);
    const next = KO[ko.n % KO.length];
    const ticks = KO.map((_, k) => {
      const a = -Math.PI / 2 + ((k + 0.5) / 72) * Math.PI * 2,
        l = k % 6 === 0 ? 11 : 6,
        at = k === ko.n - 1;
      const p = (r: number) =>
        `${(70 + Math.cos(a) * r).toFixed(1)} ${(70 + Math.sin(a) * r).toFixed(1)}`;
      return `<path d="M${p(64)} L${p(64 - l)}" class="${at ? "now" : ""}"/>`;
    }).join("");
    const seasons = (Object.keys(KANJI) as Season[])
      .map((s, i) => {
        const a = -Math.PI / 2 + ((i * 18 + 9) / 72) * Math.PI * 2;
        return `<text x="${(70 + Math.cos(a) * 36).toFixed(1)}" y="${(70 + Math.sin(a) * 36).toFixed(1)}">${KANJI[s]}</text>`;
      })
      .join("");
    const from = new Date(now.getFullYear(), ko.from[0] - 1, ko.from[1]);
    body.append(
      el("p", "card-small", sekki.replace(", ", " · ")),
      el("p", "card-kanji", ko.kanji),
      el("p", "card-big", ko.gloss),
      el("p", "card-small", `${ko.reading} · ${day(from)} – ${day(until)}`),
    );
    const row = el("div", "card-row");
    const words = el("div", "");
    words.append(
      el("p", "", `Seventy-two small seasons, five days each. Next: ${next.kanji}, ${next.gloss}.`),
      el("p", "card-dim", "The tree knows too: blossom, green, red, bare."),
    );
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    ring.setAttribute("viewBox", "0 0 140 140");
    ring.setAttribute("class", "card-ring");
    ring.setAttribute("aria-hidden", "true");
    ring.innerHTML = ticks + seasons;
    row.append(words, ring);
    body.append(row);
  },
};

// today's sun as an arc over the horizon, the moon beside it
export const sky: Fill = {
  make(body) {
    const now = new Date();
    const sun = sunHours(now);
    const moon = moonOf(now);
    const h = now.getHours() + now.getMinutes() / 60;
    const t = sun ? (h - sun.rise) / (sun.set - sun.rise) : -1;
    const dot =
      t > 0 && t < 1
        ? `<circle cx="${(30 + 240 * t).toFixed(1)}" cy="${(80 - Math.sin(Math.PI * t) * 60).toFixed(1)}" r="8" class="sun"/>`
        : "";
    const fig = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fig.setAttribute("viewBox", "0 0 380 120");
    fig.setAttribute("class", "card-sky");
    fig.setAttribute("aria-hidden", "true");
    fig.innerHTML =
      `<path d="M22 80 H278" class="horizon"/><path d="M30 80 Q150 -40 270 80" class="arc"/>${dot}` +
      (sun
        ? `<text x="30" y="104">${hhmm(sun.rise)}</text><text x="270" y="104">${hhmm(sun.set)}</text>`
        : "") +
      `<circle cx="330" cy="46" r="30" class="moon-dark"/><path d="${moonPath(moon, 330, 46, 30)}" class="moon"/>`;
    const full = moon.waxing ? "full" : "new";
    const days = Math.round(moon.waxing ? SYNODIC / 2 - moon.age : SYNODIC - moon.age);
    body.append(
      fig,
      el("p", "card-dim card-moon", `the moon: ${moon.words}`),
      el(
        "p",
        "",
        sun
          ? `The sun is up from ${hhmm(sun.rise)} to ${hhmm(sun.set)}. The lantern is lit at sunset, the paper lamp a little after. It all comes from your clock and time zone; the page never asks where you are.`
          : "No sunrise or sunset today, by your clock: the sun stays where it is.",
      ),
      el(
        "p",
        "card-dim",
        days < 1
          ? `The moon is ${full} tonight.`
          : `A ${full} moon in about ${days} day${days > 1 ? "s" : ""}.`,
      ),
    );
  },
};

// season's tea, and a timer for steeping it
const TEA: Record<Season, [string, string, string, number]> = {
  haru: ["煎茶", "sencha", "the first green tea; water at 70°, not boiling", 60],
  natsu: [
    "水出し",
    "cold-brewed sencha",
    "leaves in cold water in the fridge; a few hours, no timer needed",
    0,
  ],
  aki: ["ほうじ茶", "hōjicha", "roasted, brown, low in caffeine; water just off the boil", 30],
  fuyu: ["玄米茶", "genmaicha", "green tea with toasted rice; water at 85°", 45],
};
export const tea: Fill = {
  make(body, view) {
    const [jp, name, how, secs] = TEA[view.season];
    body.append(el("p", "card-kanji", jp), el("p", "card-big", name), el("p", "", how + "."));
    if (!secs) return;
    const go = el("button", "card-knob", `steep · ${secs} s`) as HTMLButtonElement;
    go.type = "button";
    let timer = 0;
    go.addEventListener("click", () => {
      clearInterval(timer);
      const end = Date.now() + secs * 1000;
      const tick = () => {
        const left = Math.ceil((end - Date.now()) / 1000);
        if (left > 0) go.textContent = `steeping · ${left} s`;
        else {
          clearInterval(timer);
          go.textContent = `poured. again · ${secs} s`;
        }
      };
      tick();
      timer = window.setInterval(tick, 250);
    });
    body.append(go);
  },
};
