import { readFileSync } from "node:fs";
import { hash, rng } from "./stamp";

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

// inks a spine can be bound in
const INKS = [
  "--red",
  "--cursor",
  "--sea",
  "--leaf",
  "--sky",
  "--tape",
  "--fg-dim",
  "--accent-0",
  "--fg-link",
  "--red-warmer",
  "--border",
  "--bg-region",
];

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

export function spine(book: Book, now: Date) {
  const r = rng(
    hash(`book/${book.title}/${book.author}/${book.started?.toISOString() ?? book.id}`),
  );
  const ink = INKS[Math.floor(r() * INKS.length)];
  const dark = Math.round(r() * 22);
  const since = book.finished ?? book.started ?? now;
  const months =
    (now.getUTCFullYear() - since.getUTCFullYear()) * 12 + now.getUTCMonth() - since.getUTCMonth();
  const fade = Math.round(Math.min(50, Math.max(0, months) * 2.6));
  const tall = r() < 0.15 ? 24 : 0;
  let bands = "";

  if (r() < 0.6) bands += `M0 ${f1(8 + r() * 3)} H10 M0 ${f1(12 + r() * 2)} H10 `;
  if (r() < 0.4) bands += `M0 ${f1(86 - r() * 3)} H10`;

  return {
    color: `color-mix(in oklab, color-mix(in oklab, var(${ink}), var(--fg-main) ${dark}%), var(--paper) ${fade}%)`,
    w: Math.round(Math.min(46, 16 + book.pages / 22)),
    h: Math.round(140 + r() * 60 + tall),
    bands: bands.trim(),
    radius: `${1 + Math.floor(r() * 3)}px ${1 + Math.floor(r() * 3)}px 1px 1px`,
    gap: r() < 0.08 ? 7 : 0,
    rot: f1((r() - 0.5) * 0.8),
    ribbonRot: f1((r() - 0.5) * 6),
    slipRot: f1((r() - 0.5) * 4),
  };
}

export interface Shelf {
  year: number;
  read: number;
  open: number;
  books: Array<Book & ReturnType<typeof spine> & { dip: number }>;
  plank: string;
  grain: string;
  tagRot: number;
  knot: string;
  stone: Array<[number, number]>;
}

// one plank per year, newest on top
export function shelves(books: Book[], now: Date): Shelf[] {
  const year = (b: Book) => (b.finished ?? b.started ?? now).getUTCFullYear();
  const when = (b: Book) => (b.finished ?? b.started ?? now).valueOf();
  const years = [...new Set(books.filter((b) => b.state !== "waiting").map(year))].sort(
    (a, b) => b - a,
  );
  return years.map((y) => {
    const list = books
      .filter((b) => b.state !== "waiting" && year(b) === y)
      .sort((a, b) => when(a) - when(b));
    const looks = list.map((b) => spine(b, now));
    const total = looks.reduce((s, l) => s + l.w + l.gap + 1, 0) || 1;
    const sag = Math.min(7, list.length * 0.28);
    let x = 0;
    const placed = list.map((b, i) => {
      const look = looks[i];
      const at = Math.min(1, (x + look.w / 2) / Math.max(total, 900));
      x += look.w + look.gap + 1;
      return { ...b, ...look, dip: f1(Math.sin(Math.PI * at) * sag * 0.8) };
    });
    const r = rng(hash(`shelf/${y}`));
    const end = () => f1((r() - 0.5) * 6);
    const plank = `M${f1(r() * 3)} 2 C 300 ${f1(2 + sag)}, 700 ${f1(2 + sag)}, ${f1(1000 - r() * 3)} 2 L${f1(997 + end())} ${f1(12 + end())} L1000 ${f1(20 + r())} C 700 ${f1(22 + sag)}, 300 ${f1(22 + sag)}, ${f1(r() * 3)} ${f1(20 + r())} L${f1(2 + end())} ${f1(11 + end())} Z`;
    let grain = "";
    for (let k = 0; k < 4; k++) {
      const gy = 6 + k * 3.5;
      grain += `M${f1(r() * 200)} ${f1(gy)} C ${f1(300 + r() * 100)} ${f1(gy + r() * 2)}, ${f1(600 + r() * 100)} ${f1(gy - r() * 2)}, ${f1(800 + r() * 200)} ${f1(gy)} `;
    }
    const kx = f1(150 + r() * 700);
    const knot = `M${kx} 10 c 6 -4, 16 -3, 18 1 c 2 4, -8 6, -14 4 c -4 -1, -6 -3, -4 -5 Z`;
    const stone = Array.from({ length: 9 }, (_, k): [number, number] => {
      const a = (k / 9) * Math.PI * 2;
      return [32 + Math.cos(a) * (26 + r() * 4), 30 + Math.sin(a) * (16 + r() * 3)];
    });
    return {
      year: y,
      read: list.filter((b) => b.state === "read").length,
      open: list.filter((b) => b.state === "reading").length,
      books: placed,
      plank,
      grain: grain.trim(),
      tagRot: f1((r() - 0.5) * 5),
      knot,
      stone,
    };
  });
}
