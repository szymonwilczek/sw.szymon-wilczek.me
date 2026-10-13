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

function thread(origin: readonly [number, number], x: number, y: number, sag: number) {
  const [originX, originY] = origin;
  const spanX = x - originX;
  const spanY = y - originY;
  const drop = Math.hypot(spanX, spanY) * sag;
  return `M${originX + 18} ${originY + 4} C ${round1(originX + spanX * 0.33)} ${round1(originY + spanY * 0.33 + drop)}, ${round1(originX + spanX * 0.7)} ${round1(originY + spanY * 0.7 + drop)}, ${round1(x)} ${round1(y)}`;
}

const knot = (x: number, y: number) =>
  `M${round1(x - 3)} ${round1(y - 3)} c 4 -4, 8 2, 3 5 c -4 3, -7 -2, -3 -5 M ${round1(x + 2)} ${round1(y + 1)} l 6 6 M ${round1(x + 1)} ${round1(y + 2)} l 2 9`;

function between(from: readonly [number, number], to: readonly [number, number], sag: number) {
  const drop = Math.hypot(to[0] - from[0], to[1] - from[1]) * sag;
  const pointAt = (share: number) => [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share,
  ];
  const [firstX, firstY] = pointAt(0.3);
  const [secondX, secondY] = pointAt(0.7);
  return `M${round1(from[0])} ${round1(from[1])} C ${round1(firstX)} ${round1(firstY + drop)}, ${round1(secondX)} ${round1(secondY + drop)}, ${round1(to[0])} ${round1(to[1])}`;
}

// my own sites are kin: tied back here, and to one another in turn
export const mine = (link: Link) => /(^|\.)szymon-wilczek\.me$/.test(link.domain);

export function kin(links: ReturnType<typeof threads>) {
  const own = links.map((link, i) => ({ l: link, i })).filter(({ l: link }) => mine(link));
  return own.slice(1).map(({ l: link, i }, index) => {
    const { l: previous, i: previousIndex } = own[index];
    return {
      ends: `${previousIndex} ${i}`,
      wide: between(previous.wide.pin, link.wide.pin, 0.32),
      narrow: between(previous.narrow.pin, link.narrow.pin, 0.22),
    };
  });
}

export function threads(links: Link[], now = new Date()) {
  const rand = rng(hash("en"));
  return links.map((link, i) => {
    const sag = 0.12 + age(link, i, now) * 0.22;
    const column = i % 3;
    const row = Math.floor(i / 3);
    const wideX = 290 + column * 236 + (row % 2) * 36 + (rand() - 0.5) * 30;
    const wideY = 80 + row * 180 + (rand() - 0.5) * 40 + column * 12;
    const narrowX = i % 2 ? 250 : 110;
    const narrowY = 150 + i * 100 + (rand() - 0.5) * 16;
    const { wide, narrow } = sheets(links.length);
    return {
      ...link,
      rot: round1((rand() - 0.5) * 5),
      ink: ["--red", "--fg-link", "--cursor", "--fg-dim"][i % 4],
      shape: ["50%", "4px", "50% 50% 6px 6px", "8px 2px"][i % 4],
      wide: {
        l: round1((wideX / wide.w) * 100),
        t: round1((wideY / wide.h) * 100),
        slack: thread(wide.me, wideX - 12, wideY, sag),
        taut: thread(wide.me, wideX - 12, wideY, 0.03),
        knot: knot(wideX - 12, wideY),
        pin: [wideX - 12, wideY] as const,
      },
      narrow: {
        l: round1((narrowX / narrow.w) * 100),
        t: round1((narrowY / narrow.h) * 100),
        slack: thread(narrow.me, narrowX, narrowY - 2, sag),
        taut: thread(narrow.me, narrowX, narrowY - 2, 0.03),
        knot: knot(narrowX, narrowY - 2),
        pin: [narrowX, narrowY - 2] as const,
      },
    };
  });
}
