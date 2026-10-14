// the sky over the engawa: hours, seasons, sun, moon, stars

import { mix, hash, rng, roundCoord, lerp, smooth, polygonPath } from "../core.js";
import {
  TREMBLE_FILTER,
  jitter,
  wobblyBox,
  wobblyLine,
  wobblyRing,
  newGroup,
  addWash,
  addLine,
  addSolid,
  addText,
  inked,
  brushStroke,
  mist,
} from "../pen.js";

const ENGAWA_HEIGHT = 640;

// the terrace the enso leads to
const SKY = [
  [0, "#1c2132", "#262c40"],
  [4.5, "#262b40", "#4a4560"],
  [5.8, "#6f7896", "#e6b48f"],
  [7, "#a9b8c8", "#f3d9b6"],
  [10, "#bfd0db", "#eeeee4"],
  [14, "#b6ccda", "#f1eee2"],
  [17, "#c3c3c8", "#f0d5a6"],
  [18.8, "#77708c", "#e8956a"],
  [19.8, "#3e4060", "#a8686e"],
  [21, "#22283a", "#3a3a52"],
  [24, "#1c2132", "#262c40"],
];
const smoothstep = (edge0, edge1, x) => {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const clockLabel = (hour) => {
  const minutes = Math.round(hour * MINUTES_PER_HOUR);
  const shown = Math.floor(minutes / MINUTES_PER_HOUR) % HOURS_PER_DAY;
  return `${shown}:${String(minutes % MINUTES_PER_HOUR).padStart(2, "0")}`;
};
const STARLIGHT = "#f3eedf";
const SEASONS = {
  haru: { jp: "春", en: "spring", rise: 5.9, set: 19.3 },
  natsu: { jp: "夏", en: "summer", rise: 4.3, set: 21.0 },
  aki: { jp: "秋", en: "autumn", rise: 7.0, set: 18.0 },
  fuyu: { jp: "冬", en: "winter", rise: 7.7, set: 15.5 },
};

function solarHour(hour, season) {
  if (!season) return hour;
  if (hour < season.rise) return (hour * 5.6) / season.rise;
  if (hour < season.set) return 5.6 + ((hour - season.rise) * 14) / (season.set - season.rise);
  return 19.6 + ((hour - season.set) * 4.4) / (24 - season.set);
}

function hourLight(tones, hour, seasonKey, sunTimes) {
  hour = ((hour % 24) + 24) % 24;
  const season =
      sunTimes && SEASONS[seasonKey] ? { ...SEASONS[seasonKey], ...sunTimes } : SEASONS[seasonKey],
    solarTime = solarHour(hour, season);
  let i = 0;
  while (i < SKY.length - 2 && SKY[i + 1][0] <= solarTime) i++;
  const [fromHour, fromTop, fromLow] = SKY[i],
    [toHour, toTop, toLow] = SKY[i + 1],
    blend = (solarTime - fromHour) / (toHour - fromHour);
  const baseTop = mix(mix(fromTop, toTop, blend), tones.paper, 0.15),
    baseLow = mix(mix(fromLow, toLow, blend), tones.paper, 0.15);
  const dayProgress = (solarTime - 5.6) / (19.6 - 5.6),
    sunUp = dayProgress > 0 && dayProgress < 1,
    altitude = sunUp ? Math.sin(Math.PI * dayProgress) : 0;
  const night =
    solarTime < 12 ? 1 - smoothstep(4.8, 6.6, solarTime) : smoothstep(18.6, 20.8, solarTime);
  const gold = Math.min(
    1,
    Math.max(0, 1 - Math.abs(solarTime - 18.5) / 1.4) +
      0.6 * Math.max(0, 1 - Math.abs(solarTime - 6.4) / 1.1),
  );
  const moonProgress = ((((solarTime - 18.5) % 24) + 24) % 24) / 12,
    moonUp = moonProgress < 1;
  const overcast = seasonKey === "fuyu" ? 0.22 : 0,
    top = mix(baseTop, "#c4c8cf", overcast),
    low = mix(baseLow, "#d8d8d4", overcast);
  return {
    h: hour,
    hc: solarTime,
    sk: seasonKey,
    S: season,
    top,
    low,
    st: dayProgress,
    up: sunUp,
    alt: altitude,
    night,
    gold,
    mt: moonProgress,
    mUp: moonUp,
    malt: moonUp ? Math.sin(Math.PI * moonProgress) : 0,
    lamp: Math.max(night, solarTime > 12 ? smoothstep(17.8, 19.2, solarTime) : 0),
    sunC: mix(mix("#f7e7b8", "#e0603a", gold), tones.paper, 0.1),
    far: mix(mix(tones.mount, tones.paper, 0.35), top, 0.45),
    mid: mix(tones.mount, low, 0.25),
    cloud: mix(mix(mix(low, tones.paper, 0.5), "#e9967a", 0.55 * gold), top, 0.5 * night),
  };
}

function skyWash(group, rand, width, bottom, light) {
  for (let band = 0; band < 10; band++)
    addSolid(
      group,
      wobblyBox(rand, -20, (bottom * band) / 10 - 8, width + 20, (bottom * (band + 1)) / 10 + 8, 2),
      mix(light.top, light.low, Math.pow(band / 9, 1.4)),
      1,
    );
}

const arcAt = (progress, altitude, x0, x1, horizonY, peakY) => [
  lerp(x0, x1, progress),
  horizonY - altitude * (horizonY - peakY),
];

function sunDisc(group, rand, x, y, radius, light) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, radius * 2.8, radius * 2.8, 2, 12),
    mix(light.sunC, light.low, 0.3),
    0.4,
    "url(#bk-pool)",
  );
  addSolid(
    group,
    wobblyRing(rand, x, y, radius, radius, radius * 0.05, 14),
    light.sunC,
    0.95,
    TREMBLE_FILTER,
  );
}

function moonDisc(group, rand, x, y, radius, bite, light, opacity) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, radius * 2, radius * 2, 2, 12),
    STARLIGHT,
    0.1 * opacity,
    "url(#bk-pool)",
  );
  addSolid(
    group,
    wobblyRing(rand, x, y, radius, radius, 0.6, 14),
    mix(STARLIGHT, "#f6e2a8", 0.25),
    opacity,
    TREMBLE_FILTER,
  );
  addSolid(
    group,
    wobblyRing(rand, x - radius * 0.3, y - radius * 0.15, radius * 0.28, radius * 0.22, 0.4, 8),
    mix(STARLIGHT, light.top, 0.25),
    0.45 * opacity,
  );
  if (bite)
    addSolid(
      group,
      wobblyRing(rand, x + radius * bite, y - radius * 0.08, radius * 1.02, radius * 1.04, 0.4, 14),
      light.top,
      0.92 * opacity,
    );
}

function stars(group, rand, width, horizonY, count, opacity) {
  for (let k = 0; k < count; k++) {
    const size = 0.7 + rand() * 1.3;
    addSolid(
      group,
      wobblyRing(rand, rand() * width, rand() * horizonY, size, size, 0, 5),
      STARLIGHT,
      opacity * (0.35 + rand() * 0.65),
    );
  }
}

function ridge(group, rand, x0, x1, y, amplitude, fill, opacity, ink) {
  const phase1 = rand() * 6,
    phase2 = rand() * 6,
    crest = [];
  for (let i = 0; i <= 16; i++) {
    const along = i / 16;
    crest.push([
      lerp(x0, x1, along),
      y -
        amplitude *
          (0.55 + 0.3 * Math.sin(along * 5.3 + phase1) + 0.2 * Math.sin(along * 11.7 + phase2)),
    ]);
  }
  const outline =
    smooth(crest, false) +
    ` L${roundCoord(x1)} ${roundCoord(y + 80)} L${roundCoord(x0)} ${roundCoord(y + 80)} Z`;
  addSolid(group, outline, fill, (opacity ?? 0.9) * 0.8);
  addWash(group, rand, outline, fill, opacity ?? 0.9, "url(#bk-bleed)");
  if (ink) addLine(group, wobblyLine(rand, crest, 0.8), ink, 1, 0.45);
}

function skyLayer(groups, tones, light, key, width, horizonY, moonRadius) {
  const group = newGroup({ washO: 1 }),
    rand = rng(hash("terrace/sky/" + key));
  groups.push(group);
  skyWash(group, rand, width, horizonY + 30, light);
  if (light.night > 0.05)
    stars(group, rng(hash("stars/" + key)), width, horizonY * 0.85, 70, light.night);
  const sunAt = arcAt(light.st, light.alt, -80, width + 80, horizonY + 10, 70);
  if (light.up) sunDisc(group, rand, sunAt[0], sunAt[1], 22 + 8 * (1 - light.alt), light);
  const moonAt = arcAt(light.mt, light.malt, width + 60, -60, horizonY + 10, 90);
  if (light.mUp)
    moonDisc(
      group,
      rand,
      moonAt[0],
      moonAt[1],
      moonRadius || 17,
      0.55,
      light,
      Math.max(0.25, light.night),
    );
  const cloudRand = rng(hash("clouds/" + key));
  [
    [0.08, 0.42, 120, 14],
    [0.55, 0.9, 175, 10],
    [0.3, 0.52, 60, 8],
  ].forEach(([from, to, y, height]) =>
    mist(group, cloudRand, from * width, to * width, y, height, light.cloud, 0.75),
  );
  return { sp: sunAt, mp: moonAt };
}

function veil(groups, width, height, light) {
  const group = newGroup({ washO: 1 }),
    fullFrame = polygonPath([
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ]);
  if (light.night > 0) addSolid(group, fullFrame, "#141a2c", 0.5 * light.night);
  if (light.gold > 0) addSolid(group, fullFrame, "#e8904c", 0.12 * light.gold);
  if (light.hc > 5 && light.hc < 9 && light.night < 0.5)
    addSolid(group, fullFrame, "#9fb4d8", 0.07);
  groups.push(group);
}

function ensoDial(groups, tones, light, cx, cy, radius) {
  const group = newGroup(),
    rand = rng(hash("enso-dial")),
    inkColor = mix(tones.ink, STARLIGHT, light.night);
  groups.push(group);
  const points = [];
  for (let i = 0; i <= 28; i++) {
    const angle = -Math.PI / 2 + 0.3 + (i / 28) * (Math.PI * 2 - 0.55);
    points.push([
      cx + Math.cos(angle) * radius * (1 + jitter(rand, 0.025)),
      cy + Math.sin(angle) * radius * (1 + jitter(rand, 0.025)),
    ]);
  }
  brushStroke(group, rand, points, radius * 0.17, inkColor, 0.8, {
    head: 0.7,
    tailAt: 0.72,
    tip: 0.15,
  });
  const handAngle = -Math.PI / 2 + (light.h / 24) * Math.PI * 2;
  inked(
    group,
    rand,
    wobblyRing(
      rand,
      cx + Math.cos(handAngle) * radius,
      cy + Math.sin(handAngle) * radius,
      6,
      6,
      0.5,
      8,
    ),
    tones.red,
    inkColor,
    1,
  );
  addText(group, {
    t: clockLabel(light.h),
    tr: `translate(${roundCoord(cx)} ${roundCoord(cy)})`,
    fs: 17,
    fill: inkColor,
    o: 0.8,
  });
  if (light.S)
    addText(group, {
      t: light.S.jp,
      tr: `translate(${roundCoord(cx)} ${roundCoord(cy + radius + 24)})`,
      fs: 20,
      font: "'Yuji Syuku', serif",
      fill: tones.red,
      o: 0.9,
    });
}

export {
  ENGAWA_HEIGHT,
  SKY,
  smoothstep,
  clockLabel,
  STARLIGHT,
  SEASONS,
  solarHour,
  hourLight,
  skyWash,
  arcAt,
  sunDisc,
  moonDisc,
  stars,
  ridge,
  skyLayer,
  veil,
  ensoDial,
};
