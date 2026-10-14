import type { Link } from "../data/links";
import { hash, rng } from "./stamp";

const round1 = (value: number) => Math.round(value * 10) / 10;

export function sheets(count: number) {
  const rows = Math.max(1, Math.ceil(count / 3));
  const wide = 80 + (rows - 1) * 180 + 140;
  return {
    wide: { w: 1000, h: wide, me: [110, Math.round(wide / 2)] as const },
    narrow: { w: 360, h: 150 + (Math.max(1, count) - 1) * 100 + 130, me: [180, 50] as const },
  };
}

// how old a thread is
function age(link: Link, i: number, now: Date) {
  const parts = link.since.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return rng(hash(`en/${i}`))();
  const days = (now.valueOf() - Date.UTC(+parts[1], +parts[2] - 1, +parts[3])) / 86400000;
  return Math.max(0, Math.min(1, days / 730));
}

export const HOLE_INSET = 13;
export const HOLE_RADIUS = 3.5;

const CARD_WIDE = { width: 225, height: 64 };
const CARD_NARROW = { width: 172, height: 70 };

// thread hangs at least this low by its age
const SAG_YOUNG = 0.12;
const SAG_BY_AGE = 0.22;
const SAG_TAUT = 0.03;
const SAG_KIN = { wide: 0.32, narrow: 0.22 };
const SAG_STEP = 0.02;
const SAG_MOST = 0.9;
const CLEARANCE = 6;
const CURVE_SAMPLES = 32;

type Point = readonly [number, number];
interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// two pulls of a hanging thread
const PULL_NEAR = 0.33;
const PULL_FAR = 0.7;

function curve(from: Point, to: Point, sag: number) {
  const drop = Math.hypot(to[0] - from[0], to[1] - from[1]) * sag;
  const pointAt = (share: number, dropped: number): Point => [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share + dropped,
  ];
  return [from, pointAt(PULL_NEAR, drop), pointAt(PULL_FAR, drop), to] as const;
}

function onCurve([start, near, far, end]: ReturnType<typeof curve>, t: number): Point {
  const u = 1 - t;
  const weights = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const points = [start, near, far, end];
  return [0, 1].map((axis) =>
    points.reduce((sum, point, i) => sum + point[axis] * weights[i], 0),
  ) as unknown as Point;
}

const crosses = (bezier: ReturnType<typeof curve>, boxes: Box[]) =>
  boxes.some((box) => {
    for (let sample = 1; sample < CURVE_SAMPLES; sample++) {
      const [x, y] = onCurve(bezier, sample / CURVE_SAMPLES);
      if (
        x > box.left - CLEARANCE &&
        x < box.right + CLEARANCE &&
        y > box.top - CLEARANCE &&
        y < box.bottom + CLEARANCE
      )
        return true;
    }
    return false;
  });

// the least sag, from the one asked for, that clears the cards in the way
function clearSag(from: Point, to: Point, sag: number, boxes: Box[]) {
  for (let tried = sag; tried <= SAG_MOST; tried += SAG_STEP)
    if (!crosses(curve(from, to, tried), boxes)) return tried;
  return sag;
}

function pathOf(from: Point, to: Point, sag: number) {
  const [start, near, far, end] = curve(from, to, sag);
  return `M${round1(start[0])} ${round1(start[1])} C ${round1(near[0])} ${round1(near[1])}, ${round1(far[0])} ${round1(far[1])}, ${round1(end[0])} ${round1(end[1])}`;
}

// where every thread leaves from
const SEAL_EDGE: Point = [18, 4];

const leaving = ([x, y]: Point): Point => [x + SEAL_EDGE[0], y + SEAL_EDGE[1]];

// on the narrow sheet the threads hang behind the cards
const TAIL_PAST_HOLE = HOLE_RADIUS;

const tail = (box: Box, pin: Point): Box => ({
  left: box.left - CLEARANCE,
  right: box.right + CLEARANCE,
  top: round1(box.top - CLEARANCE),
  bottom: round1(pin[1] + TAIL_PAST_HOLE),
});

// knot tied round the hole
const KNOT_LOOP = HOLE_RADIUS + 1.6;
const KNOT_ENDS_FROM = [0.5, 0.8]; // shares of the loop: its lower right
const KNOT_ENDS = [
  [5, 7],
  [1.5, 9],
] as const;

const knot = ([x, y]: Point) =>
  `M${round1(x + KNOT_LOOP)} ${round1(y)} a ${KNOT_LOOP} ${KNOT_LOOP} 0 1 1 ${-KNOT_LOOP} ${-KNOT_LOOP} ` +
  KNOT_ENDS.map(
    ([across, down]) =>
      `M${round1(x + KNOT_LOOP * KNOT_ENDS_FROM[0])} ${round1(y + KNOT_LOOP * KNOT_ENDS_FROM[1])} l ${across} ${down}`,
  ).join(" ");

// my own sites are kin: tied back here, and to one another in turn
export const mine = (link: Link) => /(^|\.)szymon-wilczek\.me$/.test(link.domain);

export function kin(links: ReturnType<typeof threads>) {
  const own = links.map((link, i) => ({ l: link, i })).filter(({ l: link }) => mine(link));
  return own.slice(1).map(({ l: link, i }, index) => {
    const { l: previous, i: previousIndex } = own[index];
    const others = (sheet: "wide" | "narrow") =>
      links.filter((_, j) => j !== i && j !== previousIndex).map((other) => other[sheet].box);
    const tie = (sheet: "wide" | "narrow") => {
      const from = previous[sheet].pin,
        to = link[sheet].pin;
      return pathOf(from, to, clearSag(from, to, SAG_KIN[sheet], others(sheet)));
    };
    return { ends: `${previousIndex} ${i}`, wide: tie("wide"), narrow: tie("narrow") };
  });
}

export function threads(links: Link[], now = new Date()) {
  const rand = rng(hash("en"));
  const { wide, narrow } = sheets(links.length);
  const placed = links.map((link, i) => {
    const column = i % 3;
    const row = Math.floor(i / 3);
    const wideX = 290 + column * 236 + (row % 2) * 36 + (rand() - 0.5) * 30;
    const wideY = 80 + row * 180 + (rand() - 0.5) * 40 + column * 12;
    const narrowX = i % 2 ? 250 : 110;
    const narrowY = 150 + i * 100 + (rand() - 0.5) * 16;
    return {
      link,
      sag: SAG_YOUNG + age(link, i, now) * SAG_BY_AGE,
      rot: round1((rand() - 0.5) * 5),
      wideX,
      wideY,
      narrowX,
      narrowY,
      wideBox: {
        left: wideX,
        right: wideX + CARD_WIDE.width,
        top: wideY - CARD_WIDE.height / 2,
        bottom: wideY + CARD_WIDE.height / 2,
      },
      narrowBox: {
        left: narrowX - CARD_NARROW.width / 2,
        right: narrowX + CARD_NARROW.width / 2,
        top: narrowY,
        bottom: narrowY + CARD_NARROW.height,
      },
    };
  });
  return placed.map((card, i) => {
    const others = (sheet: "wideBox" | "narrowBox") =>
      placed.filter((_, j) => j !== i).map((other) => other[sheet]);
    const hang = (origin: Point, pin: Point, boxes: Box[]) => ({
      slack: pathOf(leaving(origin), pin, clearSag(leaving(origin), pin, card.sag, boxes)),
      taut: pathOf(leaving(origin), pin, clearSag(leaving(origin), pin, SAG_TAUT, boxes)),
      knot: knot(pin),
      pin,
    });
    const widePin: Point = [card.wideX + HOLE_INSET, card.wideY];
    const narrowPin: Point = [card.narrowX, card.narrowY + HOLE_INSET];
    return {
      ...card.link,
      rot: card.rot,
      ink: ["--red", "--fg-link", "--cursor", "--fg-dim"][i % 4],
      shape: ["50%", "4px", "50% 50% 6px 6px", "8px 2px"][i % 4],
      wide: {
        l: round1((card.wideX / wide.w) * 100),
        t: round1((card.wideY / wide.h) * 100),
        box: card.wideBox,
        ...hang(wide.me, widePin, others("wideBox")),
      },
      narrow: {
        l: round1((card.narrowX / narrow.w) * 100),
        t: round1((card.narrowY / narrow.h) * 100),
        box: card.narrowBox,
        tail: tail(card.narrowBox, narrowPin),
        ...hang(narrow.me, narrowPin, others("narrowBox")),
      },
    };
  });
}
