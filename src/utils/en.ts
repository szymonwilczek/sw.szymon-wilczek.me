import type { Link } from "../data/links";
import { hash, rng } from "./stamp";

const f1 = (n: number) => Math.round(n * 10) / 10;

export function sheets(n: number) {
  const rows = Math.max(1, Math.ceil(n / 3));
  const wide = 80 + (rows - 1) * 180 + 140;
  return {
    wide: { w: 1000, h: wide, me: [110, Math.round(wide / 2)] as const },
    narrow: { w: 360, h: 150 + (Math.max(1, n) - 1) * 100 + 130, me: [180, 50] as const },
  };
}

// how old a thread is
function age(link: Link, i: number, now: Date) {
  const m = link.since.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return rng(hash(`en/${i}`))();
  const days = (now.valueOf() - Date.UTC(+m[1], +m[2] - 1, +m[3])) / 86400000;
  return Math.max(0, Math.min(1, days / 730));
}

function thread(me: readonly [number, number], x: number, y: number, sag: number) {
  const [mx, my] = me;
  const dx = x - mx;
  const dy = y - my;
  const drop = Math.hypot(dx, dy) * sag;
  return `M${mx + 18} ${my + 4} C ${f1(mx + dx * 0.33)} ${f1(my + dy * 0.33 + drop)}, ${f1(mx + dx * 0.7)} ${f1(my + dy * 0.7 + drop)}, ${f1(x)} ${f1(y)}`;
}

const knot = (x: number, y: number) =>
  `M${f1(x - 3)} ${f1(y - 3)} c 4 -4, 8 2, 3 5 c -4 3, -7 -2, -3 -5 M ${f1(x + 2)} ${f1(y + 1)} l 6 6 M ${f1(x + 1)} ${f1(y + 2)} l 2 9`;

function between(a: readonly [number, number], b: readonly [number, number], sag: number) {
  const drop = Math.hypot(b[0] - a[0], b[1] - a[1]) * sag;
  const at = (t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const [c1x, c1y] = at(0.3);
  const [c2x, c2y] = at(0.7);
  return `M${f1(a[0])} ${f1(a[1])} C ${f1(c1x)} ${f1(c1y + drop)}, ${f1(c2x)} ${f1(c2y + drop)}, ${f1(b[0])} ${f1(b[1])}`;
}

// my own sites are kin: tied back here, and to one another in turn
export const mine = (link: Link) => /(^|\.)szymon-wilczek\.me$/.test(link.domain);

export function kin(links: ReturnType<typeof threads>) {
  const own = links.map((l, i) => ({ l, i })).filter(({ l }) => mine(l));
  return own.slice(1).map(({ l, i }, k) => {
    const { l: p, i: j } = own[k];
    return {
      ends: `${j} ${i}`,
      wide: between(p.wide.pin, l.wide.pin, 0.32),
      narrow: between(p.narrow.pin, l.narrow.pin, 0.22),
    };
  });
}

export function threads(links: Link[], now = new Date()) {
  const r = rng(hash("en"));
  return links.map((link, i) => {
    const sag = 0.12 + age(link, i, now) * 0.22;
    const col = i % 3;
    const row = Math.floor(i / 3);
    const wx = 290 + col * 236 + (row % 2) * 36 + (r() - 0.5) * 30;
    const wy = 80 + row * 180 + (r() - 0.5) * 40 + col * 12;
    const nx = i % 2 ? 250 : 110;
    const ny = 150 + i * 100 + (r() - 0.5) * 16;
    const { wide, narrow } = sheets(links.length);
    return {
      ...link,
      rot: f1((r() - 0.5) * 5),
      ink: ["--red", "--fg-link", "--cursor", "--fg-dim"][i % 4],
      shape: ["50%", "4px", "50% 50% 6px 6px", "8px 2px"][i % 4],
      wide: {
        l: f1((wx / wide.w) * 100),
        t: f1((wy / wide.h) * 100),
        slack: thread(wide.me, wx - 12, wy, sag),
        taut: thread(wide.me, wx - 12, wy, 0.03),
        knot: knot(wx - 12, wy),
        pin: [wx - 12, wy] as const,
      },
      narrow: {
        l: f1((nx / narrow.w) * 100),
        t: f1((ny / narrow.h) * 100),
        slack: thread(narrow.me, nx, ny - 2, sag),
        taut: thread(narrow.me, nx, ny - 2, 0.03),
        knot: knot(nx, ny - 2),
        pin: [nx, ny - 2] as const,
      },
    };
  });
}
