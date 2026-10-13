import { earn, load, season, type Season } from "../utils/garden";

const svg = document.querySelector<SVGSVGElement>(".map")!;
const inner = document.querySelector<HTMLElement>(".map-inner")!;
const tag = document.querySelector<HTMLElement>(".map-tag")!;
const state = load();

earn("北");

// places not walked yet stay grey; the lost corner only counts once you got lost
const walked = (to: string) =>
  state.paths.some((walkedPath) => walkedPath === to || walkedPath.startsWith(`${to}/`));
document.querySelectorAll<HTMLElement | SVGElement>("[data-area]").forEach((marked) => {
  marked.classList.toggle("unseen", !walked(marked.dataset.area!));
});
svg.querySelectorAll<SVGElement>("[data-seal-area]").forEach((marked) => {
  marked.classList.toggle("unseen", !state.seals[marked.dataset.sealArea!]);
});

// paths walked are inked, and so is the way to them from the gate
svg.querySelectorAll<SVGPathElement>(".brush").forEach((brush) => {
  if (!walked(brush.dataset.path!)) return;
  brush.classList.add("is-walked");
  brush.dataset
    .via!.split(" ")
    .filter(Boolean)
    .forEach((to) => {
      svg.querySelector(`.brush[data-path="${to}"]`)!.classList.add("is-walked");
    });
});

// an essay read to the end flowers
svg.querySelectorAll<SVGElement>(".plant").forEach((plant) => {
  if (!state.read.includes(plant.dataset.slug!)) return;
  plant.classList.add("is-read");
  plant.dataset.sub += " · already read ✓";
});

// where the reader came in from
const came = svg.querySelector(".came")!;
try {
  const from = document.referrer ? new URL(document.referrer) : null;
  if (from && from.origin === location.origin && from.pathname !== location.pathname) {
    came.textContent = `you came in from ${decodeURI(from.pathname).replace(/(.)\/$/, "$1")}`;
  } else if (from && from.origin !== location.origin) {
    came.textContent = "you came in from outside";
  }
} catch {
  // keep the gate
}

// sheet keeps the reader's hour
const DAYLIGHT: Record<Season, [number, number]> = {
  spring: [6, 19.25],
  summer: [4.75, 21],
  autumn: [7, 18],
  winter: [7.75, 15.75],
};
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);
const twoDigits = (value: number) => String(value).padStart(2, "0");
const clock = document.querySelector(".clock")!;
let night = false;

function moonPath(phase: number, radius: number) {
  const bulge = Math.cos(2 * Math.PI * phase);
  const bulgeRadius = Math.abs(bulge) * radius;
  const [outer, inner] = phase < 0.5 ? [1, bulge > 0 ? 0 : 1] : [0, bulge > 0 ? 1 : 0];
  return `M0 ${-radius} A ${radius} ${radius} 0 0 ${outer} 0 ${radius} A ${bulgeRadius} ${radius} 0 0 ${inner} 0 ${-radius} Z`;
}

function sky() {
  const now = new Date();
  const asked = new URLSearchParams(location.search).get("hour");
  const hour = asked !== null ? Number(asked) % 24 : now.getHours() + now.getMinutes() / 60;
  const currentSeason = season(now);
  const [sunrise, sunset] = DAYLIGHT[currentSeason];
  const day = hour >= sunrise && hour <= sunset;
  const along = day
    ? (hour - sunrise) / (sunset - sunrise)
    : (hour > sunset ? hour - sunset : hour + 24 - sunset) / (24 - sunset + sunrise);
  const lift = Math.sin(Math.PI * along);
  const skyX = 80 + 940 * along;
  const skyY = 20 - 140 * lift;
  const dusk = Math.abs(hour - sunrise) < 1 || Math.abs(hour - sunset) < 1;
  const phase = ((((now.getTime() - NEW_MOON) / 86400000 / 29.530588853) % 1) + 1) % 1;
  const light = (1 - Math.cos(2 * Math.PI * phase)) / 2;

  svg.querySelector(".sun")!.setAttribute("transform", `translate(${skyX} ${skyY})`);
  const moon = svg.querySelector(".moon")!;
  moon.setAttribute("transform", `translate(${skyX} ${skyY}) rotate(-20)`);
  moon.querySelector("path")!.setAttribute("d", moonPath(phase, 14));
  svg.classList.toggle("is-day", day);
  svg.classList.toggle("is-dusk", dusk);
  night = !day;

  const shadowLength = day ? 18 + (1 - lift) * 120 : 40 + (1 - lift) * 60;
  const shade = day ? 0.06 + 0.06 * lift : 0.05 * light;
  svg.querySelectorAll<SVGPathElement>(".shadows path").forEach((path) => {
    const [baseX, baseY, width] = path.dataset.at!.split(" ").map(Number);
    const reach = width > 100 ? shadowLength * 0.5 : shadowLength;
    const tipX = baseX + Math.max(-reach, Math.min(reach, (baseX - skyX) * 0.45));
    const tipY = baseY + reach;
    path.setAttribute(
      "d",
      `M${baseX - width / 2} ${baseY} Q ${tipX - width * 0.4} ${tipY} ${tipX} ${tipY + 2} Q ${tipX + width * 0.4} ${tipY} ${baseX + width / 2} ${baseY} Z`,
    );
    path.style.opacity = String(shade);
  });

  const glintX = Math.max(610, Math.min(790, skyX));
  svg
    .querySelector(".glint")!
    .setAttribute("d", `M${glintX - 8} 384 q 8 -2 16 0 M ${glintX - 2} 398 q 6 -2 12 0`);
  clock.textContent = `${twoDigits(Math.floor(hour))}:${twoDigits(Math.floor((hour % 1) * 60))} · ${currentSeason}${day ? (dusk ? " · dusk" : "") : " · night"}`;
  lamp();
}

// lantern is lit at dusk, at night, and in a dark theme
let dark = false;
function lamp() {
  svg.classList.toggle("is-lit", dark || night || svg.classList.contains("is-dusk"));
}

function dusk() {
  const background = getComputedStyle(document.documentElement)
    .getPropertyValue("--bg-main")
    .trim();
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.fillStyle = background;
  const hex = probe.fillStyle.startsWith("#") ? probe.fillStyle : "#ffffff";
  const [red, green, blue] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  dark = 0.299 * red + 0.587 * green + 0.114 * blue < 96;
  lamp();
}
dusk();
sky();
setInterval(sky, 60_000);
document.addEventListener("au-theme-change", dusk);

let shown: Element | null = null;
let touch = false;

function show(place: Element) {
  const placeElement = place as HTMLElement;
  tag.querySelector(".map-tag-title")!.textContent = placeElement.dataset.title ?? "";
  tag.querySelector(".map-tag-sub")!.textContent = placeElement.dataset.sub ?? "";
  tag.hidden = false;
  const box = place.getBoundingClientRect();
  const frame = inner.getBoundingClientRect();
  const left = box.left - frame.left + box.width / 2 - tag.offsetWidth / 2;
  tag.style.left = `${Math.max(4, Math.min(left, frame.width - tag.offsetWidth - 4))}px`;
  tag.style.top = `${Math.max(0, box.top - frame.top - tag.offsetHeight - 8)}px`;
  shown = place;
}

function hide() {
  tag.hidden = true;
  shown = null;
}

svg.querySelectorAll(".place").forEach((place) => {
  place.addEventListener("pointerenter", (event) => {
    if ((event as PointerEvent).pointerType === "mouse") show(place);
  });
  place.addEventListener("pointerleave", (event) => {
    if ((event as PointerEvent).pointerType === "mouse") hide();
  });
  place.addEventListener("focus", () => show(place));
  place.addEventListener("blur", hide);
  place.addEventListener("pointerdown", (event) => {
    touch = (event as PointerEvent).pointerType !== "mouse";
  });
  place.addEventListener("click", (event) => {
    if (touch && shown !== place) {
      event.preventDefault();
      show(place);
    }
  });
});

document.addEventListener("pointerdown", (event) => {
  if (!(event.target as Element).closest(".place")) hide();
});
