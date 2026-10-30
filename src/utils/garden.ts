// What the reader has done in the garden: paths walked, essays read, seals earned.
// It lives in localStorage only, so it never leaves the browser.

export interface SealPage {
  glyph: string;
  note: string;
  hint: string;
}

// Seal book, in the order its pages are bound
export const SEALS: SealPage[] = [
  { glyph: "狼", note: "first visit", hint: "come in" },
  { glyph: "書", note: "opened an essay", hint: "pick something to read" },
  { glyph: "終", note: "read one to the end", hint: "all the way down" },
  { glyph: "写", note: "walked an album", hint: "look at every photo" },
  { glyph: "秋", note: "came in autumn", hint: "when the maples turn" },
  { glyph: "北", note: "the garden is round", hint: "there is a map" },
  { glyph: "迷", note: "get properly lost", hint: "a page that isn't" },
  { glyph: "夜", note: "stay after dark", hint: "late, and a while" },
  { glyph: "冬", note: "snow on the crack", hint: "come back in winter" },
  { glyph: "春", note: "first blossom", hint: "come back in spring" },
  { glyph: "夏", note: "when it is warm", hint: "come back in summer" },
  { glyph: "文", note: "write me a letter", hint: "the mailbox" },
  { glyph: "波", note: "a leaf across the water", hint: "no hands on the leaf" },
  { glyph: "寂", note: "an old word on the stone", hint: "wet the middle of the stone" },
  { glyph: "雀", note: "a guest who stayed", hint: "keep very still while you read" },
  { glyph: "修", note: "read a patch upstream", hint: "what I sent upstream" },
  { glyph: "陶", note: "a bowl on the shelf", hint: "the workshop behind a stone" },
  { glyph: "茶", note: "stepped into the tea house", hint: "a garden for tea" },
  { glyph: "年", note: "counted the rings", hint: "how old is this place" },
  { glyph: "縁", note: "followed a red thread", hint: "the small sites I keep" },
];

export const DOORS = ["enso", "minibuffer", "seal"] as const;
export type Door = (typeof DOORS)[number];

export interface GardenState {
  seals: Record<string, string>;
  paths: string[];
  read: string[];
  stops: Record<string, { at: number; when: number }>;
  doors: Door[];
  sparrow: number;
}

const STORAGE_KEY = "garden";

function empty(): GardenState {
  return { seals: {}, paths: [], read: [], stops: {}, doors: [], sparrow: 0 };
}

export function load(): GardenState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...empty(), ...JSON.parse(raw) } : empty();
  } catch {
    return empty();
  }
}

function save(state: GardenState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // private window or blocked storage: the garden simply forgets
  }
}

export function update(change: (state: GardenState) => void): GardenState {
  const state = load();
  change(state);
  save(state);
  return state;
}

export function reset() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // nothing to forget
  }
}

/** Date as the seal book writes it */
export function stampDate(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}·${pad(date.getMonth() + 1)}·${pad(date.getDate())}`;
}

/** Stamps a seal once */
export function earn(glyph: string): boolean {
  if (!SEALS.some((seal) => seal.glyph === glyph)) return false;
  let fresh = false;
  update((state) => {
    if (state.seals[glyph]) return;
    state.seals[glyph] = stampDate();
    fresh = true;
  });
  if (!fresh) return false;
  // wait for every script on the page, so the stamping is listening
  const tell = () => window.dispatchEvent(new CustomEvent("garden-seal", { detail: { glyph } }));
  if (document.readyState === "complete") tell();
  else window.addEventListener("load", tell, { once: true });
  return true;
}

export function walk(path: string) {
  const clean = path.replace(/\/+$/, "") || "/";
  update((state) => {
    if (!state.paths.includes(clean)) state.paths.push(clean);
  });
}

export function findDoor(door: Door) {
  update((state) => {
    if (!state.doors.includes(door)) state.doors.push(door);
  });
  earn("北");
}

export type Season = "spring" | "summer" | "autumn" | "winter";

export const SEASONS: Record<Season, { glyph: string; romaji: string; next: Season }> = {
  spring: { glyph: "春", romaji: "haru", next: "summer" },
  summer: { glyph: "夏", romaji: "natsu", next: "autumn" },
  autumn: { glyph: "秋", romaji: "aki", next: "winter" },
  winter: { glyph: "冬", romaji: "fuyu", next: "spring" },
};

/** The reader's season, from their own calendar */
export function season(date = new Date()): Season {
  const asked = new URLSearchParams(location.search).get("season");
  if (asked && asked in SEASONS) return asked as Season;
  const month = date.getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}
