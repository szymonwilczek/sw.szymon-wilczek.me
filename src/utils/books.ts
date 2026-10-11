import { readFileSync } from "node:fs";
import { picture } from "./dogu";
import { hash, rng, smooth } from "./stamp";

export interface Book {
  id: string;
  title: string;
  author: string;
  pages: number;
  started: Date | null;
  finished: Date | null;
  page: number | null;
  place: string | null;
  album: string | null;
  writing: string | null;
  quote: string | null;
  note: string | null;
  state: "read" | "reading" | "waiting";
}

export const MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const f1 = (n: number) => Math.round(n * 10) / 10;

const orgDate = (value: string | undefined) => {
  const m = value?.match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
};

export function readBooks(file = "src/data/books.org"): Book[] {
  const text = readFileSync(file, "utf8");
  return text
    .split(/^\* /m)
    .slice(1)
    .map((entry, i) => {
      const [head, ...rest] = entry.split("\n");
      const props: Record<string, string> = {};
      for (const [, key, value] of entry.matchAll(/^:([A-Z]+):[ \t]*(.*)$/gm))
        props[key] = value.trim();
      const body = rest.join("\n").replace(/:PROPERTIES:[\s\S]*?:END:/, "");
      const quote = body.match(/#\+begin_quote\s*([\s\S]*?)#\+end_quote/i)?.[1].trim() || null;
      const note =
        body
          .replace(/#\+begin_quote[\s\S]*?#\+end_quote/i, "")
          .replace(/^#.*$/gm, "")
          .trim() || null;
      const started = orgDate(props.STARTED);
      const finished = orgDate(props.FINISHED);
      return {
        id: `b${i}`,
        title: head.trim(),
        author: props.AUTHOR || "",
        pages: +props.PAGES || 240,
        started,
        finished,
        page: props.PAGE ? +props.PAGE : null,
        place: props.PLACE || null,
        album: props.ALBUM || null,
        writing: props.WRITING || null,
        quote,
        note,
        state: finished ? "read" : started ? "reading" : "waiting",
      } satisfies Book;
    });
}

export const monthOf = (date: Date) => `${MONTHS[date.getUTCMonth()]}·${date.getUTCFullYear()}`;

export function spanOf(from: Date | null, to: Date) {
  if (!from) return monthOf(to);
  if (from.getUTCFullYear() !== to.getUTCFullYear()) return `${monthOf(from)}–${monthOf(to)}`;
  if (from.getUTCMonth() === to.getUTCMonth()) return monthOf(to);
  return `${MONTHS[from.getUTCMonth()]}–${monthOf(to)}`;
}

// how far in the ribbon is, 0 to 1
export const progress = (b: Book) =>
  b.state === "read" ? 1 : b.page ? Math.min(1, Math.max(0, b.page / b.pages)) : 0.5;

const CLOTH = [
  "glaze",
  "clay",
  "bamboo",
  "lac",
  "silk",
  "deep",
  "leaf",
  "water",
  "bronze",
  "clayRed",
  "lacHi",
  "stone",
  "bambooLt",
  "glaze",
  "silkDk",
  "leaf",
  "silk",
  "deep",
];

const FACES = [
  { font: "'Cormorant Garamond', serif", fw: 600, fst: "normal", ls: 0.06, adv: 0.62, caps: true },
  { font: "'Cormorant Garamond', serif", fw: 500, fst: "italic", ls: 0.01, adv: 0.42, caps: false },
  { font: "'IM Fell English SC', serif", fw: 400, fst: "normal", ls: 0.08, adv: 0.56, caps: false },
  { font: "'IM Fell English', serif", fw: 400, fst: "italic", ls: 0.02, adv: 0.44, caps: false },
  { font: "'EB Garamond', serif", fw: 500, fst: "normal", ls: 0.12, adv: 0.72, caps: true },
];

const AUTHOR_FACE = { font: "'IM Fell English', serif", fw: 400, fst: "italic", ls: 0.04 };

export interface Title {
  t: string;
  transform: string;
  style: string;
  o: number;
}

export interface Spine {
  w: number;
  h: number;
  width: number;
  height: number;
  vb: string;
  turn: string;
  body: string;
  caps: string;
  tone: string;
  tone2: string;
  lines: string;
  dots: string;
  titles: Title[];
  wash: string;
}

const tone = (kind: string, fade: number) =>
  fade > 0 ? `color-mix(in oklab, var(--t-${kind}), var(--paper) ${fade}%)` : `var(--t-${kind})`;

const titleStyle = (f: { font: string; fw: number; fst: string; ls: number }, fs: number) =>
  `font-family: ${f.font}; font-weight: ${f.fw}; font-style: ${f.fst}; font-size: ${f1(fs)}px; letter-spacing: ${f.ls}em`;

export function look(b: Book, now: Date, lying = false): Spine {
  const r = rng(hash(`ink/${b.title}/${b.author}/${b.started?.toISOString() ?? b.id}`));
  const since = b.finished ?? now;
  const age =
    (now.getUTCFullYear() - since.getUTCFullYear()) * 12 + now.getUTCMonth() - since.getUTCMonth();
  const fade = Math.round(Math.min(35, Math.max(0, age) * 1.4));
  const w = Math.round(Math.min(46, 17 + b.pages / 21));
  const h = Math.round(136 + r() * 64 + (r() < 0.18 ? 24 : 0) - (r() < 0.15 ? 18 : 0));
  const j = () => f1((r() - 0.5) * 1.8);
  const tl = 2 + r() * 3,
    tr = 2 + r() * 3;
  const body = `M${j()} ${h} C ${f1(-0.9 + r() * 0.6)} ${f1(h * 0.66)}, ${f1(-0.9 + r() * 0.6)} ${f1(h * 0.33)}, ${j()} ${f1(tl)} Q ${f1(w / 2)} ${f1(-1.6 + r() * 1.4)}, ${f1(w + +j())} ${f1(tr)} C ${f1(w + 0.3 + r() * 0.6)} ${f1(h * 0.33)}, ${f1(w + 0.3 + r() * 0.6)} ${f1(h * 0.66)}, ${f1(w + +j())} ${h} Z`;
  const k = Math.floor(r() * CLOTH.length);
  const kind = CLOTH[k];

  let caps = "";
  let tone2 = tone(kind, fade);
  let lines = "";
  const wave = (y: number) =>
    `M0.5 ${f1(y)} Q ${f1(w / 2)} ${f1(y + (r() - 0.5) * 2.4)}, ${f1(w - 0.5)} ${f1(y + (r() - 0.5) * 1.4)} `;
  const capT = 14 + r() * 8,
    capB = h - 12 - r() * 8;
  if (r() < 0.36) {
    tone2 = `color-mix(in oklab, var(--t-${CLOTH[(k + 5) % CLOTH.length]}), var(--fg-main) 12%)`;
    caps = `M0 ${f1(tl)} Q ${f1(w / 2)} -1, ${w} ${f1(tr)} L ${w} ${f1(capT)} Q ${f1(w / 2)} ${f1(capT + 1.6)}, 0 ${f1(capT)} Z M0 ${f1(capB)} Q ${f1(w / 2)} ${f1(capB - 1.4)}, ${w} ${f1(capB)} L ${w} ${h} L 0 ${h} Z`;
    lines += wave(capT) + wave(capB);
  }

  // raised bands, or a pair of thin rules near each end
  let top = caps ? capT + 5 : 8 + r() * 4;
  let bot = caps ? capB - 5 : h - 9 - r() * 4;
  if (r() < 0.4) {
    lines += wave(top) + wave(top + 3) + wave(bot - 3) + wave(bot);
    top += 6;
    bot -= 6;
  } else if (r() < 0.6) {
    lines += wave(top) + wave(bot);
    top += 3;
    bot -= 3;
  }

  // the title, in one of the faces
  let dots = "";
  const face = FACES[Math.floor(r() * FACES.length)];
  const set = (s: string) => (face.caps ? s.toUpperCase() : s);
  const author = b.author.split(" ").pop() ?? "";
  const words = b.title.split(/\s+/);
  const titles: Title[] = [];
  const afs = Math.max(6.5, Math.min(8.5, w * 0.24));
  const alen = author.length * 0.5 * afs;
  const across = !lying && w >= 34 && words.length <= 3 && words.every((x) => x.length <= 8);
  if (across) {
    const longest = Math.max(...words.map((x) => x.length));
    const fs = Math.min(11.5, (w - 7) / (longest * (face.adv + face.ls)));
    words.forEach((word, i) =>
      titles.push({
        t: set(word),
        transform: `translate(${f1(w / 2)} ${f1(top + 14 + i * fs * 1.15)})`,
        style: titleStyle(face, fs),
        o: 0.9,
      }),
    );
    const oy = top + 14 + words.length * fs * 1.15 + 6;
    dots = `M${f1(w / 2 - 1.3)} ${f1(oy)} a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 Z`;
    titles.push({
      t: author,
      transform: `translate(${f1(w / 2)} ${f1(bot - 6 - alen / 2)}) rotate(90)`,
      style: titleStyle(AUTHOR_FACE, afs),
      o: 0.75,
    });
  } else {
    const t = set(b.title);
    const need = t.length * (face.adv + face.ls) * 1.08;
    const most = Math.min(13, w * 0.52);

    // the author steps aside when the title needs the whole spine
    const signed = w >= 24 && need * 7 <= bot - top - alen - 26;
    const room = bot - top - (signed ? alen + 26 : 14);
    const fs = need * most > room ? Math.max(5.5, room / need) : most;
    const ty = signed ? top + 4 + room / 2 : (top + bot) / 2;
    titles.push({
      t,
      transform: `translate(${f1(w / 2)} ${f1(ty)}) rotate(90)`,
      style: titleStyle(face, fs),
      o: 0.9,
    });
    if (signed) {
      titles.push({
        t: author,
        transform: `translate(${f1(w / 2)} ${f1(bot - 6 - alen / 2)}) rotate(90)`,
        style: titleStyle(AUTHOR_FACE, afs),
        o: 0.72,
      });
      const oy = bot - alen - 14;
      if (r() < 0.6) dots = `M${f1(w / 2)} ${f1(oy - 2.2)} l 1.8 2.2 l -1.8 2.2 l -1.8 -2.2 Z`;
    }
  }

  return {
    w,
    h,
    width: lying ? h : w,
    height: lying ? w : h,
    vb: lying ? `0 0 ${h} ${w}` : `0 0 ${w} ${h}`,
    turn: lying ? `translate(0 ${w}) rotate(-90)` : "",
    body,
    caps: caps || "M0 0",
    tone: tone(kind, fade),
    tone2,
    lines: lines.trim() || "M0 0",
    dots: dots || "M0 0",
    titles,
    wash: `translate(${f1(1.5 + r() * 2)} ${f1(1 + r() * 2)})`,
  };
}

// a silk ribbon hanging from (0,0), swallowtail cut
export function ribbon(seed: string, L: number, wd: number, amp: number) {
  const r = rng(hash(seed));
  const n = 16,
    ph = r() * Math.PI,
    tw = 0.4 + r() * 0.5;
  const C: [number, number][] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    C.push([Math.sin(t * Math.PI * 1.2 + ph) * amp * t + (r() - 0.5) * 0.3, t * L]);
  }
  const hw = C.map(
    (_, k) => (wd / 2) * (0.25 + 0.75 * Math.abs(Math.cos((k / n) * Math.PI * tw + 0.3))),
  );
  const lft = C.map(([x, y], k): [number, number] => [x - hw[k], y]);
  const rgt = C.map(([x, y], k): [number, number] => [x + hw[k], y]);
  const [ex, ey] = C[n],
    h = wd / 2;
  const tail: [number, number][] = [
    [ex - h, ey + 0.4],
    [ex - h * 0.1, ey - wd * 0.9],
    [ex + h, ey],
  ];
  const body = smooth([...lft.slice(0, n), ...tail, ...rgt.slice(0, n).reverse()], true);
  let mid = 2;
  hw.forEach((v, k) => {
    if (k > 1 && k < n - 1 && v < hw[mid]) mid = k;
  });
  const a = Math.max(1, mid - 2),
    b = Math.min(n - 1, mid + 2);
  const fold =
    "M" +
    [...lft.slice(a, b + 1), ...rgt.slice(a, b + 1).reverse()]
      .map(([x, y]) => `${f1(x)} ${f1(y)}`)
      .join(" L ") +
    " Z";
  let threads = "";
  for (let k = 0; k < 3; k++) {
    const tx = ex - h + (k + 0.5) * (wd / 3);
    threads += `M${f1(tx)} ${f1(ey - 0.5)} l ${f1((r() - 0.5) * 2)} ${f1(2 + r() * 3)} `;
  }
  return { body, fold, threads: threads.trim(), lw: wd > 6 ? 1.2 : 0.9 };
}

export type Ribbon = ReturnType<typeof ribbon>;

const label = (b: Book) =>
  b.state === "reading"
    ? `${b.title} by ${b.author}, reading now`
    : `${b.title} by ${b.author}, read ${monthOf(b.finished!)}`;

const whisper = (b: Book) =>
  b.state === "reading"
    ? `${b.title} · reading${b.page ? `, p. ${b.page}` : ""}`
    : `${b.title} · ${monthOf(b.finished!)}`;

export interface Placed {
  book: Book;
  spine: Spine;
  label: string;
  whisper: string;
  rot: number;
  lean: number;
  gap: number;
  x: number;
  ribbon: (Ribbon & { len: number; left: number; rot: number }) | null;
}

export type Item =
  | { kind: "book"; width: number; book: Placed }
  | {
      kind: "pile";
      width: number;
      ml: number;
      books: Placed[];
      candle: Candle | null;
      candleX: number;
    };

export interface Candle {
  width: number;
  height: number;
  vb: string;
  sw: number;
  wash: string;
  forms: { d: string; fill: string }[];
  lines: { d: string; stroke: string; w: number; o: number; ink: boolean }[];
}

function candle(seed: string): Candle {
  const r = rng(hash(`candle/${seed}`));
  const s = 0.6;
  return {
    width: Math.round(80 * s),
    height: Math.round(156 * s),
    vb: "60 12 80 156",
    sw: f1(1.3 / s),
    wash: `translate(${f1(3 + r() * 3)} ${f1(2 + r() * 2)})`,
    ...picture("candle"),
  };
}

export interface Plank {
  width: number;
  vb: string;
  plank: string;
  brackets: string;
  grain: string;
  pool: { cx: number; rx: number };
  items: Item[];
}

export interface Shelf {
  year: number;
  kanji: string;
  count: string;
  planks: Plank[];
}

// the row's measures, in px
const INSET = 22;
const AIR = 44;
const PILE_GAP = 14;
const MAX_ROW = 940;

function plank(seed: string, items: Item[]): Plank {
  const r = rng(hash(`plank/${seed}`));
  const W = Math.round(INSET + items.reduce((s, it) => s + it.width, 0) + AIR);

  // board, on two brackets
  const e = () => f1((r() - 0.5) * 2.4);
  const board = `M${e()} ${f1(4 + +e() * 0.4)} C ${f1(W * 0.3)} ${f1(3 + r())}, ${f1(W * 0.7)} ${f1(5 + r())}, ${f1(W + +e())} ${f1(4 + +e() * 0.4)} L ${f1(W + 1 + r())} ${f1(15 + +e() * 0.5)} C ${f1(W * 0.7)} ${f1(16 + r())}, ${f1(W * 0.3)} ${f1(14.5 + r())}, ${f1(1 + r())} ${f1(15.5 + +e() * 0.5)} Z`;
  const brackets = [W * 0.14, W * 0.82]
    .map(
      (q) =>
        `M${f1(q)} 15 L ${f1(q + 3)} 15 L ${f1(q + 3)} 40 C ${f1(q + 6)} 32, ${f1(q + 16)} 22, ${f1(q + 26)} 15 Z`,
    )
    .join(" ");
  let grain = "";
  for (let k = 0; k < 3; k++) {
    const gy = 7.5 + k * 2.6,
      a = r() * W * 0.3;
    grain += `M${f1(a)} ${f1(gy)} C ${f1(a + W * 0.15)} ${f1(gy - 0.8)}, ${f1(a + W * 0.3)} ${f1(gy + 0.8)}, ${f1(a + W * (0.25 + r() * 0.35))} ${f1(gy)} `;
  }
  return {
    width: W,
    vb: `0 0 ${W} 56`,
    plank: board,
    brackets,
    grain: grain.trim(),
    pool: { cx: f1(W / 2), rx: f1(W * 0.46) },
    items,
  };
}

// one plank per year, newest on top
export function shelves(books: Book[], now: Date): Shelf[] {
  const when = (b: Book) => (b.finished ?? b.started ?? now).valueOf();
  const yearOf = (b: Book) => (b.finished ?? b.started ?? now).getUTCFullYear();
  const onShelf = books.filter((b) => b.state !== "waiting");
  const years = [...new Set(onShelf.map(yearOf))].sort((a, b) => b - a);
  let lit = false;

  return years.map((year, yi) => {
    const list = onShelf.filter((b) => yearOf(b) === year).sort((a, b) => when(a) - when(b));
    const sr = rng(hash(`shelf/${year}`));
    const n = list.length;

    // where the piles go
    const piles = new Map<number, number>();
    const want = n < 4 ? 0 : Math.min(4, Math.max(1, Math.round(n / 8)));
    let free = 0;
    for (let k = 0; k < want; k++) {
      let at = yi === 0 && k === 0 ? 0 : Math.round((k + 0.25 + sr() * 0.45) * (n / want));
      at = Math.max(at, free);
      let size = 2 + Math.floor(sr() * 3);
      while (at < n && list[at].state === "reading") at++;
      let end = at;
      while (end < n && end - at < size && list[end].state !== "reading") end++;
      size = end - at;
      if (size >= 2) {
        piles.set(at, size);
        free = end + 2;
      }
    }

    const items: Item[] = [];
    let leaned = -2;
    for (let i = 0; i < n; i++) {
      const size = piles.get(i);
      if (size) {
        const lying = list.slice(i, i + size).map(
          (b): Placed => ({
            book: b,
            spine: look(b, now, true),
            label: label(b),
            whisper: whisper(b),
            rot: f1((sr() - 0.5) * 1.2),
            lean: 0,
            gap: 0,
            x: f1((sr() - 0.5) * 10),
            ribbon: null,
          }),
        );
        lying.reverse();
        const wid = Math.max(...lying.map((p) => p.spine.width + Math.abs(p.x)));

        // candle burns on the first pile of the newest shelf that has one
        const lamp = !lit ? candle(String(year)) : null;
        lit = true;
        items.push({
          kind: "pile",
          width: Math.round(wid + PILE_GAP * (i ? 2 : 1)),
          ml: i ? PILE_GAP : 0,
          books: lying,
          candle: lamp,
          candleX: f1(wid * 0.35),
        });
        i += size - 1;
        continue;
      }
      const b = list[i];
      const spine = look(b, now);
      const r = rng(hash(`stand/${b.id}/${b.title}`));
      const p = progress(b);
      const len = Math.round(30 + p * 56);
      const prev = items.at(-1);

      // book leans into the one before it now and then, never onto a pile or a ribbon
      const leans = prev?.kind === "book" && b.state === "read" && leaned < i - 2 && sr() < 0.13;
      const theta = leans ? 6 + sr() * 4 : 0;
      if (leans) leaned = i;
      const lean = leans ? Math.round(spine.h * Math.sin((theta * Math.PI) / 180) - 2) : 0;
      const gap = r() < 0.08 ? 5 : 1;
      items.push({
        kind: "book",
        width: spine.w + gap + lean,
        book: {
          book: b,
          spine,
          label: label(b),
          whisper: whisper(b),
          rot: leans ? f1(-theta) : f1((r() - 0.5) * 2.6 * 0.7),
          lean,
          gap,
          x: 0,
          ribbon:
            b.state === "reading"
              ? {
                  ...ribbon(`rib/${b.id}/${b.title}`, len, 4.6, 2.4),
                  len,
                  left: f1(spine.w * (0.5 + r() * 0.2) - 15),
                  rot: f1((r() - 0.5) * 4),
                }
              : null,
        },
      });
    }

    const rows: Item[][] = [[]];
    let run = 0;
    for (const it of items) {
      if (run + it.width > MAX_ROW - INSET - AIR && rows.at(-1)!.length) {
        rows.push([]);
        run = 0;
      }
      rows.at(-1)!.push(it);
      run += it.width;
    }
    const open = list.filter((b) => b.state === "reading").length;
    return {
      year,
      kanji: year === now.getUTCFullYear() ? "今" : "昔",
      count: open ? `${n - open} read · ${open} open` : `${n} read`,
      planks: rows.map((row, k) => plank(`${year}/${k}`, row)),
    };
  });
}

export const PAGE = { w: 500, h: 620 };

export function page(side: "L" | "R", n: number, seed: string) {
  const r = rng(hash(seed));
  const { w: W, h: H } = PAGE;
  const s = (x: number) => (side === "L" ? x : W - x);
  const o = 16 + n * 2.4;
  const q = () => f1((r() - 0.5) * 1.6);
  const P = (pts: [number, number][]) => pts.map(([x, y]) => `${f1(s(x))} ${f1(y)}`);
  const top = P([
    [o, 36 + q()],
    [W * 0.3, 8 + q()],
    [W * 0.72, 2 + q()],
    [W - 1, 32],
  ]);
  const bot = P([
    [W - 1, H - 20],
    [W * 0.72, H - 4 + q()],
    [W * 0.3, H - 2 + q()],
    [o, H - 14 + q()],
  ]);
  const shape = `M${top[0]} C ${top.slice(1).join(", ")} L ${bot[0]} C ${bot.slice(1).join(", ")} C ${f1(s(o - 2))} ${f1(H * 0.66)}, ${f1(s(o - 1))} ${f1(H * 0.33)}, ${top[0]} Z`;
  let stack = "";
  for (let k = 1; k <= n; k++) {
    const x = o - k * 2.4,
      y0 = 36 + k * 0.9,
      y1 = H - 14 + k * 0.6;
    stack += `M${f1(s(x + 6))} ${f1(y0 - 1.6)} C ${f1(s(x + 1))} ${f1(y0)}, ${f1(s(x))} ${f1(y0 + 4)}, ${f1(s(x))} ${f1(y0 + 10)} L ${f1(s(x - 0.6))} ${f1(y1 - 10)} C ${f1(s(x))} ${f1(y1 - 4)}, ${f1(s(x + 1))} ${f1(y1)}, ${f1(s(x + 6))} ${f1(y1 + 1.4)} `;
  }
  const so = o - n * 2.4 - 1;
  const stackFill = `M${f1(s(so))} 40 L ${f1(s(o + 4))} 34 L ${f1(s(o + 4))} ${H - 12} L ${f1(s(so))} ${H - 14} Z`;
  const co = so - 8;
  const cover = `M${f1(s(co))} ${f1(30 + q())} C ${f1(s(W * 0.3))} ${f1(14 + q())}, ${f1(s(W * 0.75))} ${f1(14 + q())}, ${f1(s(W + 2))} 26 L ${f1(s(W + 2))} ${H - 10} C ${f1(s(W * 0.75))} ${f1(H + 4 + q())}, ${f1(s(W * 0.3))} ${f1(H + 6 + q())}, ${f1(s(co))} ${f1(H - 2 + q())} Z`;
  const g0 = s(W - 2),
    g1 = s(W - 40);
  const gutter = `M${f1(g0)} 26 L ${f1(g1)} 16 L ${f1(g1)} ${H - 12} L ${f1(g0)} ${H - 18} Z`;
  return { shape, stack: stack.trim() || "M0 0", stackFill, cover, gutter, vb: `0 0 ${W} ${H}` };
}

const FILLER = [
  "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
  "Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.",
  "Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur.",
  "Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur. At vero eos et accusamus et iusto odio dignissimos ducimus.",
  "Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae.",
];

export interface Para {
  cap: string;
  a: string;
  mark: string;
  b: string;
}

// n paragraphs from the filler
export function paras(from: number, n: number, quote: string | null, cap: boolean): Para[] {
  return Array.from({ length: n }, (_, k) => {
    let t = FILLER[(from + k) % FILLER.length];
    let first = "";
    if (cap && k === 0) {
      first = t[0];
      t = t.slice(1);
    }
    if (quote && k === 1) {
      const cut = t.indexOf(",") + 1;
      return { cap: first, a: t.slice(0, cut) + " ", mark: quote, b: " " + t.slice(cut).trim() };
    }
    return { cap: first, a: t, mark: "", b: "" };
  });
}
