import { KO, koOf, moonOf, moonPath, SYNODIC } from "../../utils/koyomi";
import { sunHours, type Season } from "../../utils/engawa/sky";
import type { Fill } from "./cards";

const KANJI: Record<Season, string> = { haru: "春", natsu: "夏", aki: "秋", fuyu: "冬" };
const clockLabel = (hour: number) =>
  `${Math.floor(hour)}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`;
const dayLabel = (date: Date) =>
  date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
const element = (tag: string, className: string, text = "") => {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
};

// small season, five days or so, and the year as a ring of 72
export const tree: Fill = {
  make(body) {
    const now = new Date();
    const { ko: season, until, sekki } = koOf(now);
    const next = KO[season.n % KO.length];
    const ticks = KO.map((_, index) => {
      const angle = -Math.PI / 2 + ((index + 0.5) / 72) * Math.PI * 2,
        length = index % 6 === 0 ? 11 : 6,
        current = index === season.n - 1;
      const pointAt = (radius: number) =>
        `${(70 + Math.cos(angle) * radius).toFixed(1)} ${(70 + Math.sin(angle) * radius).toFixed(1)}`;
      return `<path d="M${pointAt(64)} L${pointAt(64 - length)}" class="${current ? "now" : ""}"/>`;
    }).join("");
    const seasons = (Object.keys(KANJI) as Season[])
      .map((sekkiName, i) => {
        const angle = -Math.PI / 2 + ((i * 18 + 9) / 72) * Math.PI * 2;
        return `<text x="${(70 + Math.cos(angle) * 36).toFixed(1)}" y="${(70 + Math.sin(angle) * 36).toFixed(1)}">${KANJI[sekkiName]}</text>`;
      })
      .join("");
    const from = new Date(now.getFullYear(), season.from[0] - 1, season.from[1]);
    body.append(
      element("p", "card-small", sekki.replace(", ", " · ")),
      element("p", "card-kanji", season.kanji),
      element("p", "card-big", season.gloss),
      element("p", "card-small", `${season.reading} · ${dayLabel(from)} – ${dayLabel(until)}`),
    );
    const row = element("div", "card-row");
    const words = element("div", "");
    words.append(
      element(
        "p",
        "",
        `Seventy-two small seasons, five days each. Next: ${next.kanji}, ${next.gloss}.`,
      ),
      element("p", "card-dim", "The tree knows too: blossom, green, red, bare."),
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
    const sunTimes = sunHours(now);
    const moon = moonOf(now);
    const hour = now.getHours() + now.getMinutes() / 60;
    const dayShare = sunTimes ? (hour - sunTimes.rise) / (sunTimes.set - sunTimes.rise) : -1;
    const dot =
      dayShare > 0 && dayShare < 1
        ? `<circle cx="${(30 + 240 * dayShare).toFixed(1)}" cy="${(80 - Math.sin(Math.PI * dayShare) * 60).toFixed(1)}" r="8" class="sun"/>`
        : "";
    const figure = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    figure.setAttribute("viewBox", "0 0 380 120");
    figure.setAttribute("class", "card-sky");
    figure.setAttribute("aria-hidden", "true");
    figure.innerHTML =
      `<path d="M22 80 H278" class="horizon"/><path d="M30 80 Q150 -40 270 80" class="arc"/>${dot}` +
      (sunTimes
        ? `<text x="30" y="104">${clockLabel(sunTimes.rise)}</text><text x="270" y="104">${clockLabel(sunTimes.set)}</text>`
        : "") +
      `<circle cx="330" cy="46" r="30" class="moon-dark"/><path d="${moonPath(moon, 330, 46, 30)}" class="moon"/>`;
    const full = moon.waxing ? "full" : "new";
    const days = Math.round(moon.waxing ? SYNODIC / 2 - moon.age : SYNODIC - moon.age);
    body.append(
      figure,
      element("p", "card-dim card-moon", `the moon: ${moon.words}`),
      element(
        "p",
        "",
        sunTimes
          ? `The sun is up from ${clockLabel(sunTimes.rise)} to ${clockLabel(sunTimes.set)}. The lantern is lit at sunset, the paper lamp a little after. It all comes from your clock and time zone; the page never asks where you are.`
          : "No sunrise or sunset today, by your clock: the sun stays where it is.",
      ),
      element(
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
const TEA_BY_SEASON: Record<Season, [string, string, string, number]> = {
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
    const [kanji, name, brewing, seconds] = TEA_BY_SEASON[view.season];
    body.append(
      element("p", "card-kanji", kanji),
      element("p", "card-big", name),
      element("p", "", brewing + "."),
    );
    if (!seconds) return;
    const steep = element("button", "card-knob", `steep · ${seconds} s`) as HTMLButtonElement;
    steep.type = "button";
    let timer = 0;
    steep.addEventListener("click", () => {
      clearInterval(timer);
      const endsAt = Date.now() + seconds * 1000;
      const tick = () => {
        const left = Math.ceil((endsAt - Date.now()) / 1000);
        if (left > 0) steep.textContent = `steeping · ${left} s`;
        else {
          clearInterval(timer);
          steep.textContent = `poured. again · ${seconds} s`;
        }
      };
      tick();
      timer = window.setInterval(tick, 250);
    });
    body.append(steep);
  },
};
