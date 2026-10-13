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
  writing: string | null;
  quotes: string[];
  refs: string[];
  passage: string[];
  note: string | null;
  state: "read" | "reading" | "waiting";
}

export const MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

const round1 = (value: number) => Math.round(value * 10) / 10;

const orgDate = (value: string | undefined) => {
  const match = value?.match(/(\d{4})-(\d{2})-(\d{2})/);
  return match ? new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])) : null;
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
      const marked = [
        ...body.matchAll(/#\+begin_quote[ \t]*(.*)\n([\s\S]*?)#\+end_quote/gi),
      ].filter((quoteMatch) => quoteMatch[2].trim());
      const quotes = marked.map((quoteMatch) => quoteMatch[2].replace(/\s+/g, " ").trim());
      const refs = marked.map((quoteMatch) => quoteMatch[1].trim());
      const passage = (body.match(/#\+begin_page\s*([\s\S]*?)#\+end_page/i)?.[1] ?? "")
        .split(/\n\s*\n/)
        .map((paragraph) =>
          paragraph
            .split(/\\\\\s*\n/)
            .map((line) => line.replace(/\s+/g, " ").trim())
            .join("\n"),
        )
        .filter(Boolean);
      const note =
        body
          .replace(/#\+begin_(quote|page)[\s\S]*?#\+end_\1/gi, "")
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
        writing: props.WRITING || null,
        quotes,
        refs,
        passage,
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
export const progress = (book: Book) =>
  book.state === "read" ? 1 : book.page ? Math.min(1, Math.max(0, book.page / book.pages)) : 0.5;

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

const titleStyle = (
  face: { font: string; fw: number; fst: string; ls: number },
  fontSize: number,
) =>
  `font-family: ${face.font}; font-weight: ${face.fw}; font-style: ${face.fst}; font-size: ${round1(fontSize)}px; letter-spacing: ${face.ls}em`;

export function look(book: Book, now: Date, lying = false): Spine {
  const rand = rng(
    hash(`ink/${book.title}/${book.author}/${book.started?.toISOString() ?? book.id}`),
  );
  const since = book.finished ?? now;
  const age =
    (now.getUTCFullYear() - since.getUTCFullYear()) * 12 + now.getUTCMonth() - since.getUTCMonth();
  const fade = Math.round(Math.min(35, Math.max(0, age) * 1.4));
  const width = Math.round(Math.min(46, 17 + book.pages / 21));
  const height = Math.round(
    136 + rand() * 64 + (rand() < 0.18 ? 24 : 0) - (rand() < 0.15 ? 18 : 0),
  );
  const jitter = () => round1((rand() - 0.5) * 1.8);
  const leftTop = 2 + rand() * 3,
    rightTop = 2 + rand() * 3;
  const body = `M${jitter()} ${height} C ${round1(-0.9 + rand() * 0.6)} ${round1(height * 0.66)}, ${round1(-0.9 + rand() * 0.6)} ${round1(height * 0.33)}, ${jitter()} ${round1(leftTop)} Q ${round1(width / 2)} ${round1(-1.6 + rand() * 1.4)}, ${round1(width + +jitter())} ${round1(rightTop)} C ${round1(width + 0.3 + rand() * 0.6)} ${round1(height * 0.33)}, ${round1(width + 0.3 + rand() * 0.6)} ${round1(height * 0.66)}, ${round1(width + +jitter())} ${height} Z`;
  const clothIndex = Math.floor(rand() * CLOTH.length);
  const kind = CLOTH[clothIndex];

  let caps = "";
  let tone2 = tone(kind, fade);
  let lines = "";
  const wave = (y: number) =>
    `M0.5 ${round1(y)} Q ${round1(width / 2)} ${round1(y + (rand() - 0.5) * 2.4)}, ${round1(width - 0.5)} ${round1(y + (rand() - 0.5) * 1.4)} `;
  const capTop = 14 + rand() * 8,
    capBottom = height - 12 - rand() * 8;
  if (rand() < 0.36) {
    tone2 = `color-mix(in oklab, var(--t-${CLOTH[(clothIndex + 5) % CLOTH.length]}), var(--fg-main) 12%)`;
    caps = `M0 ${round1(leftTop)} Q ${round1(width / 2)} -1, ${width} ${round1(rightTop)} L ${width} ${round1(capTop)} Q ${round1(width / 2)} ${round1(capTop + 1.6)}, 0 ${round1(capTop)} Z M0 ${round1(capBottom)} Q ${round1(width / 2)} ${round1(capBottom - 1.4)}, ${width} ${round1(capBottom)} L ${width} ${height} L 0 ${height} Z`;
    lines += wave(capTop) + wave(capBottom);
  }

  // raised bands, or a pair of thin rules near each end
  let top = caps ? capTop + 5 : 8 + rand() * 4;
  let bottom = caps ? capBottom - 5 : height - 9 - rand() * 4;
  if (rand() < 0.4) {
    lines += wave(top) + wave(top + 3) + wave(bottom - 3) + wave(bottom);
    top += 6;
    bottom -= 6;
  } else if (rand() < 0.6) {
    lines += wave(top) + wave(bottom);
    top += 3;
    bottom -= 3;
  }

  // the title, in one of the faces
  let dots = "";
  const face = FACES[Math.floor(rand() * FACES.length)];
  const cased = (text: string) => (face.caps ? text.toUpperCase() : text);
  const author = book.author.split(" ").pop() ?? "";
  const words = book.title.split(/\s+/);
  const titles: Title[] = [];
  const authorSize = Math.max(6.5, Math.min(8.5, width * 0.24));
  const authorLength = author.length * 0.5 * authorSize;
  const across =
    !lying && width >= 34 && words.length <= 3 && words.every((word) => word.length <= 8);
  if (across) {
    const longest = Math.max(...words.map((word) => word.length));
    const fontSize = Math.min(11.5, (width - 7) / (longest * (face.adv + face.ls)));
    words.forEach((word, i) =>
      titles.push({
        t: cased(word),
        transform: `translate(${round1(width / 2)} ${round1(top + 14 + i * fontSize * 1.15)})`,
        style: titleStyle(face, fontSize),
        o: 0.9,
      }),
    );
    const dotY = top + 14 + words.length * fontSize * 1.15 + 6;
    dots = `M${round1(width / 2 - 1.3)} ${round1(dotY)} a1.3 1.3 0 1 0 2.6 0 a1.3 1.3 0 1 0 -2.6 0 Z`;
    titles.push({
      t: author,
      transform: `translate(${round1(width / 2)} ${round1(bottom - 6 - authorLength / 2)}) rotate(90)`,
      style: titleStyle(AUTHOR_FACE, authorSize),
      o: 0.75,
    });
  } else {
    const spineTitle = cased(book.title);
    const need = spineTitle.length * (face.adv + face.ls) * 1.08;
    const most = Math.min(13, width * 0.52);

    // the author steps aside when the title needs the whole spine
    const signed = width >= 24 && need * 7 <= bottom - top - authorLength - 26;
    const room = bottom - top - (signed ? authorLength + 26 : 14);
    const fontSize = need * most > room ? Math.max(5.5, room / need) : most;
    const titleY = signed ? top + 4 + room / 2 : (top + bottom) / 2;
    titles.push({
      t: spineTitle,
      transform: `translate(${round1(width / 2)} ${round1(titleY)}) rotate(90)`,
      style: titleStyle(face, fontSize),
      o: 0.9,
    });
    if (signed) {
      titles.push({
        t: author,
        transform: `translate(${round1(width / 2)} ${round1(bottom - 6 - authorLength / 2)}) rotate(90)`,
        style: titleStyle(AUTHOR_FACE, authorSize),
        o: 0.72,
      });
      const dotY = bottom - authorLength - 14;
      if (rand() < 0.6)
        dots = `M${round1(width / 2)} ${round1(dotY - 2.2)} l 1.8 2.2 l -1.8 2.2 l -1.8 -2.2 Z`;
    }
  }

  return {
    w: width,
    h: height,
    width: lying ? height : width,
    height: lying ? width : height,
    vb: lying ? `0 0 ${height} ${width}` : `0 0 ${width} ${height}`,
    turn: lying ? `translate(0 ${width}) rotate(-90)` : "",
    body,
    caps: caps || "M0 0",
    tone: tone(kind, fade),
    tone2,
    lines: lines.trim() || "M0 0",
    dots: dots || "M0 0",
    titles,
    wash: `translate(${round1(1.5 + rand() * 2)} ${round1(1 + rand() * 2)})`,
  };
}

// a silk ribbon hanging from (0,0), swallowtail cut
export function ribbon(seed: string, length: number, width: number, sway: number) {
  const rand = rng(hash(seed));
  const segments = 16,
    phase = rand() * Math.PI,
    twist = 0.4 + rand() * 0.5;
  const centre: [number, number][] = [];
  for (let step = 0; step <= segments; step++) {
    const along = step / segments;
    centre.push([
      Math.sin(along * Math.PI * 1.2 + phase) * sway * along + (rand() - 0.5) * 0.3,
      along * length,
    ]);
  }
  const halfWidths = centre.map(
    (_, step) =>
      (width / 2) * (0.25 + 0.75 * Math.abs(Math.cos((step / segments) * Math.PI * twist + 0.3))),
  );
  const leftEdge = centre.map(([x, y], step): [number, number] => [x - halfWidths[step], y]);
  const rightEdge = centre.map(([x, y], step): [number, number] => [x + halfWidths[step], y]);
  const [tipX, tipY] = centre[segments],
    halfWidth = width / 2;
  const tail: [number, number][] = [
    [tipX - halfWidth, tipY + 0.4],
    [tipX - halfWidth * 0.1, tipY - width * 0.9],
    [tipX + halfWidth, tipY],
  ];
  const body = smooth(
    [...leftEdge.slice(0, segments), ...tail, ...rightEdge.slice(0, segments).reverse()],
    true,
  );
  let narrowest = 2;
  halfWidths.forEach((halfAt, step) => {
    if (step > 1 && step < segments - 1 && halfAt < halfWidths[narrowest]) narrowest = step;
  });
  const foldStart = Math.max(1, narrowest - 2),
    foldEnd = Math.min(segments - 1, narrowest + 2);
  const fold =
    "M" +
    [
      ...leftEdge.slice(foldStart, foldEnd + 1),
      ...rightEdge.slice(foldStart, foldEnd + 1).reverse(),
    ]
      .map(([x, y]) => `${round1(x)} ${round1(y)}`)
      .join(" L ") +
    " Z";
  let threads = "";
  for (let thread = 0; thread < 3; thread++) {
    const threadX = tipX - halfWidth + (thread + 0.5) * (width / 3);
    threads += `M${round1(threadX)} ${round1(tipY - 0.5)} l ${round1((rand() - 0.5) * 2)} ${round1(2 + rand() * 3)} `;
  }
  return { body, fold, threads: threads.trim(), lw: width > 6 ? 1.2 : 0.9 };
}

export type Ribbon = ReturnType<typeof ribbon>;

const label = (book: Book) =>
  book.state === "reading"
    ? `${book.title} by ${book.author}, reading now`
    : `${book.title} by ${book.author}, read ${monthOf(book.finished!)}`;

const whisper = (book: Book) =>
  book.state === "reading"
    ? `${book.title} · reading${book.page ? `, p. ${book.page}` : ""}`
    : `${book.title} · ${monthOf(book.finished!)}`;

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
  const rand = rng(hash(`candle/${seed}`));
  const scale = 0.6;
  return {
    width: Math.round(80 * scale),
    height: Math.round(156 * scale),
    vb: "60 12 80 156",
    sw: round1(1.3 / scale),
    wash: `translate(${round1(3 + rand() * 3)} ${round1(2 + rand() * 2)})`,
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
  const rand = rng(hash(`plank/${seed}`));
  const width = Math.round(INSET + items.reduce((sum, item) => sum + item.width, 0) + AIR);

  // board, on two brackets
  const jitter = () => round1((rand() - 0.5) * 2.4);
  const board = `M${jitter()} ${round1(4 + +jitter() * 0.4)} C ${round1(width * 0.3)} ${round1(3 + rand())}, ${round1(width * 0.7)} ${round1(5 + rand())}, ${round1(width + +jitter())} ${round1(4 + +jitter() * 0.4)} L ${round1(width + 1 + rand())} ${round1(15 + +jitter() * 0.5)} C ${round1(width * 0.7)} ${round1(16 + rand())}, ${round1(width * 0.3)} ${round1(14.5 + rand())}, ${round1(1 + rand())} ${round1(15.5 + +jitter() * 0.5)} Z`;
  const brackets = [width * 0.14, width * 0.82]
    .map(
      (bracketX) =>
        `M${round1(bracketX)} 15 L ${round1(bracketX + 3)} 15 L ${round1(bracketX + 3)} 40 C ${round1(bracketX + 6)} 32, ${round1(bracketX + 16)} 22, ${round1(bracketX + 26)} 15 Z`,
    )
    .join(" ");
  let grain = "";
  for (let line = 0; line < 3; line++) {
    const grainY = 7.5 + line * 2.6,
      grainX = rand() * width * 0.3;
    grain += `M${round1(grainX)} ${round1(grainY)} C ${round1(grainX + width * 0.15)} ${round1(grainY - 0.8)}, ${round1(grainX + width * 0.3)} ${round1(grainY + 0.8)}, ${round1(grainX + width * (0.25 + rand() * 0.35))} ${round1(grainY)} `;
  }
  return {
    width: width,
    vb: `0 0 ${width} 56`,
    plank: board,
    brackets,
    grain: grain.trim(),
    pool: { cx: round1(width / 2), rx: round1(width * 0.46) },
    items,
  };
}

// one plank per year, newest on top
export function shelves(books: Book[], now: Date): Shelf[] {
  const when = (book: Book) => (book.finished ?? book.started ?? now).valueOf();
  const yearOf = (book: Book) => (book.finished ?? book.started ?? now).getUTCFullYear();
  const onShelf = books.filter((book) => book.state !== "waiting");
  const years = [...new Set(onShelf.map(yearOf))].sort((former, latter) => latter - former);
  let lit = false;

  return years.map((year, yearIndex) => {
    const list = onShelf
      .filter((book) => yearOf(book) === year)
      .sort((former, latter) => when(former) - when(latter));
    const shelfRand = rng(hash(`shelf/${year}`));
    const count = list.length;

    // where the piles go
    const piles = new Map<number, number>();
    const want = count < 4 ? 0 : Math.min(4, Math.max(1, Math.round(count / 8)));
    let free = 0;
    for (let pile = 0; pile < want; pile++) {
      let pileStart =
        yearIndex === 0 && pile === 0
          ? 0
          : Math.round((pile + 0.25 + shelfRand() * 0.45) * (count / want));
      pileStart = Math.max(pileStart, free);
      let size = 2 + Math.floor(shelfRand() * 3);
      while (pileStart < count && list[pileStart].state === "reading") pileStart++;
      let pileEnd = pileStart;
      while (pileEnd < count && pileEnd - pileStart < size && list[pileEnd].state !== "reading")
        pileEnd++;
      size = pileEnd - pileStart;
      if (size >= 2) {
        piles.set(pileStart, size);
        free = pileEnd + 2;
      }
    }

    const items: Item[] = [];
    let leaned = -2;
    for (let i = 0; i < count; i++) {
      const size = piles.get(i);
      if (size) {
        const lying = list.slice(i, i + size).map((book): Placed => ({
          book: book,
          spine: look(book, now, true),
          label: label(book),
          whisper: whisper(book),
          rot: round1((shelfRand() - 0.5) * 1.2),
          lean: 0,
          gap: 0,
          x: round1((shelfRand() - 0.5) * 10),
          ribbon: null,
        }));
        lying.reverse();
        const pileWidth = Math.max(
          ...lying.map((placed) => placed.spine.width + Math.abs(placed.x)),
        );

        // candle burns on the first pile of the newest shelf that has one
        const lamp = !lit ? candle(String(year)) : null;
        lit = true;
        items.push({
          kind: "pile",
          width: Math.round(pileWidth + PILE_GAP * (i ? 2 : 1)),
          ml: i ? PILE_GAP : 0,
          books: lying,
          candle: lamp,
          candleX: round1(pileWidth * 0.35),
        });
        i += size - 1;
        continue;
      }
      const standing = list[i];
      const spine = look(standing, now);
      const rand = rng(hash(`stand/${standing.id}/${standing.title}`));
      const readShare = progress(standing);
      const ribbonLength = Math.round(30 + readShare * 56);
      const prev = items.at(-1);

      // book leans into the one before it now and then, never onto a pile or a ribbon
      const leans =
        prev?.kind === "book" && standing.state === "read" && leaned < i - 2 && shelfRand() < 0.13;
      const theta = leans ? 6 + shelfRand() * 4 : 0;
      if (leans) leaned = i;
      const lean = leans ? Math.round(spine.h * Math.sin((theta * Math.PI) / 180) - 2) : 0;
      const gap = rand() < 0.08 ? 5 : 1;
      items.push({
        kind: "book",
        width: spine.w + gap + lean,
        book: {
          book: standing,
          spine,
          label: label(standing),
          whisper: whisper(standing),
          rot: leans ? round1(-theta) : round1((rand() - 0.5) * 2.6 * 0.7),
          lean,
          gap,
          x: 0,
          ribbon:
            standing.state === "reading"
              ? {
                  ...ribbon(`rib/${standing.id}/${standing.title}`, ribbonLength, 4.6, 2.4),
                  len: ribbonLength,
                  left: round1(spine.w * (0.5 + rand() * 0.2) - 15),
                  rot: round1((rand() - 0.5) * 4),
                }
              : null,
        },
      });
    }

    const rows: Item[][] = [[]];
    let rowWidth = 0;
    for (const item of items) {
      if (rowWidth + item.width > MAX_ROW - INSET - AIR && rows.at(-1)!.length) {
        rows.push([]);
        rowWidth = 0;
      }
      rows.at(-1)!.push(item);
      rowWidth += item.width;
    }
    const open = list.filter((book) => book.state === "reading").length;
    return {
      year,
      kanji: year === now.getUTCFullYear() ? "今" : "昔",
      count: open ? `${count - open} read · ${open} open` : `${count} read`,
      planks: rows.map((row, index) => plank(`${year}/${index}`, row)),
    };
  });
}

export const PAGE = { w: 500, h: 620 };

export function page(side: "L" | "R", leaves: number, seed: string) {
  const rand = rng(hash(seed));
  const { w: width, h: height } = PAGE;
  const mirror = (x: number) => (side === "L" ? x : width - x);
  const spineX = 16 + leaves * 2.4;
  const jitter = () => round1((rand() - 0.5) * 1.6);
  const toPath = (points: [number, number][]) =>
    points.map(([x, y]) => `${round1(mirror(x))} ${round1(y)}`);
  const top = toPath([
    [spineX, 36 + jitter()],
    [width * 0.3, 8 + jitter()],
    [width * 0.72, 2 + jitter()],
    [width - 1, 32],
  ]);
  const bottom = toPath([
    [width - 1, height - 20],
    [width * 0.72, height - 4 + jitter()],
    [width * 0.3, height - 2 + jitter()],
    [spineX, height - 14 + jitter()],
  ]);
  const shape = `M${top[0]} C ${top.slice(1).join(", ")} L ${bottom[0]} C ${bottom.slice(1).join(", ")} C ${round1(mirror(spineX - 2))} ${round1(height * 0.66)}, ${round1(mirror(spineX - 1))} ${round1(height * 0.33)}, ${top[0]} Z`;
  let stack = "";
  for (let leaf = 1; leaf <= leaves; leaf++) {
    const leafX = spineX - leaf * 2.4,
      leafTop = 36 + leaf * 0.9,
      leafBottom = height - 14 + leaf * 0.6;
    stack += `M${round1(mirror(leafX + 6))} ${round1(leafTop - 1.6)} C ${round1(mirror(leafX + 1))} ${round1(leafTop)}, ${round1(mirror(leafX))} ${round1(leafTop + 4)}, ${round1(mirror(leafX))} ${round1(leafTop + 10)} L ${round1(mirror(leafX - 0.6))} ${round1(leafBottom - 10)} C ${round1(mirror(leafX))} ${round1(leafBottom - 4)}, ${round1(mirror(leafX + 1))} ${round1(leafBottom)}, ${round1(mirror(leafX + 6))} ${round1(leafBottom + 1.4)} `;
  }
  const stackX = spineX - leaves * 2.4 - 1;
  const stackFill = `M${round1(mirror(stackX))} 40 L ${round1(mirror(spineX + 4))} 34 L ${round1(mirror(spineX + 4))} ${height - 12} L ${round1(mirror(stackX))} ${height - 14} Z`;
  const coverX = stackX - 8;
  const cover = `M${round1(mirror(coverX))} ${round1(30 + jitter())} C ${round1(mirror(width * 0.3))} ${round1(14 + jitter())}, ${round1(mirror(width * 0.75))} ${round1(14 + jitter())}, ${round1(mirror(width + 2))} 26 L ${round1(mirror(width + 2))} ${height - 10} C ${round1(mirror(width * 0.75))} ${round1(height + 4 + jitter())}, ${round1(mirror(width * 0.3))} ${round1(height + 6 + jitter())}, ${round1(mirror(coverX))} ${round1(height - 2 + jitter())} Z`;
  const gutterOuter = mirror(width - 2),
    gutterInner = mirror(width - 40);
  const gutter = `M${round1(gutterOuter)} 26 L ${round1(gutterInner)} 16 L ${round1(gutterInner)} ${height - 12} L ${round1(gutterOuter)} ${height - 18} Z`;
  return {
    shape,
    stack: stack.trim() || "M0 0",
    stackFill,
    cover,
    gutter,
    vb: `0 0 ${width} ${height}`,
  };
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
  parts: { t: string; k: "greek" | "read" | "mark" | "br" }[];
  ref?: string;
  copied?: boolean;
}

export function paras(from: number, count: number, quotes: string[], dropCap: boolean): Para[] {
  return Array.from({ length: count }, (_, index) => {
    let text = FILLER[(from + index) % FILLER.length];
    let first = "";
    if (dropCap && index === 0) {
      first = text[0];
      text = text.slice(1);
    }

    // from the second paragraph on, or from the first when every one holds a line
    const quote = quotes[index - (quotes.length < count ? 1 : 0)];
    if (quote) {
      const comma = text.indexOf(",") + 1;
      return {
        cap: first,
        parts: [
          { t: text.slice(0, comma) + " ", k: "greek" },
          { t: quote, k: "mark" },
          { t: " " + text.slice(comma).trim(), k: "greek" },
        ],
      };
    }
    return { cap: first, parts: [{ t: text, k: "greek" }] };
  });
}

// the page as it is printed, to be read, with the lines I marked found in it
export function passage(text: string[], quotes: string[], dropCap: boolean): Para[] {
  return text.map((paragraph, index) => {
    let first = "";
    if (dropCap && index === 0 && /^\p{L}/u.test(paragraph)) {
      first = paragraph[0];
      paragraph = paragraph.slice(1);
    }
    const parts: Para["parts"] = [];
    const read = (printed: string) =>
      printed.split("\n").forEach((line, i) => {
        if (i) parts.push({ t: "", k: "br" });
        if (line) parts.push({ t: line, k: "read" });
      });
    let searchFrom = 0;
    for (;;) {
      const hits = quotes
        .map((quote) => ({ q: quote, i: paragraph.indexOf(quote, searchFrom) }))
        .filter((hit) => hit.i >= 0)
        .sort((former, latter) => former.i - latter.i);
      if (!hits.length) break;
      read(paragraph.slice(searchFrom, hits[0].i));
      parts.push({ t: hits[0].q, k: "mark" });
      searchFrom = hits[0].i + hits[0].q.length;
    }
    read(paragraph.slice(searchFrom));
    return { cap: first, parts };
  });
}

// the page of a book I may not print:
// only the lines I copied out of it, each with where it stands in the book
export const excerpts = (quotes: string[], refs: string[]): Para[] =>
  quotes.map((quote, index) => ({
    cap: "",
    parts: [{ t: quote, k: "mark" }],
    ref: refs[index] || undefined,
    copied: true,
  }));
