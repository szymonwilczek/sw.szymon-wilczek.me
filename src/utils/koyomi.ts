const DAY = 86_400_000;

export interface Month {
  kanji: string;
  name: string;
  gloss: string;
}

export const MONTHS: Month[] = [
  { kanji: "睦月", name: "mutsuki", gloss: "the month of affection" },
  { kanji: "如月", name: "kisaragi", gloss: "the month of extra layers" },
  { kanji: "弥生", name: "yayoi", gloss: "the month of new growth" },
  { kanji: "卯月", name: "uzuki", gloss: "the month of deutzia" },
  { kanji: "皐月", name: "satsuki", gloss: "the month of planting rice" },
  { kanji: "水無月", name: "minazuki", gloss: "the month of water" },
  { kanji: "文月", name: "fumizuki", gloss: "the month of letters" },
  { kanji: "葉月", name: "hazuki", gloss: "the month of leaves" },
  { kanji: "長月", name: "nagatsuki", gloss: "the long month" },
  { kanji: "神無月", name: "kannazuki", gloss: "the month without gods" },
  { kanji: "霜月", name: "shimotsuki", gloss: "the month of frost" },
  { kanji: "師走", name: "shiwasu", gloss: "the month of running priests" },
];

export interface Ko {
  n: number;
  kanji: string;
  reading: string;
  gloss: string;
  from: [number, number];
}

// each solar term opens a group of three small seasons
const SEKKI = [
  "risshun, start of spring",
  "usui, rain water",
  "keichitsu, insects awaken",
  "shunbun, spring equinox",
  "seimei, pure and clear",
  "kokuu, grain rain",
  "rikka, start of summer",
  "shōman, lesser ripening",
  "bōshu, grain in ear",
  "geshi, summer solstice",
  "shōsho, lesser heat",
  "taisho, greater heat",
  "risshū, start of autumn",
  "shosho, heat ends",
  "hakuro, white dew",
  "shūbun, autumn equinox",
  "kanro, cold dew",
  "sōkō, frost descends",
  "rittō, start of winter",
  "shōsetsu, lesser snow",
  "taisetsu, greater snow",
  "tōji, winter solstice",
  "shōkan, lesser cold",
  "daikan, greater cold",
];

const KO_TABLE: Array<[string, string, string, number, number]> = [
  ["東風解凍", "harukaze kōri o toku", "east wind melts the ice", 2, 4],
  ["黄鶯睍睆", "kōō kenkan su", "bush warblers start singing", 2, 9],
  ["魚上氷", "uo kōri o izuru", "fish rise from the ice", 2, 14],
  ["土脉潤起", "tsuchi no shō uruoi okoru", "rain moistens the soil", 2, 19],
  ["霞始靆", "kasumi hajimete tanabiku", "mist starts to linger", 2, 24],
  ["草木萌動", "sōmoku mebae izuru", "grass sprouts, trees bud", 3, 1],
  ["蟄虫啓戸", "sugomori mushi to o hiraku", "hibernating insects surface", 3, 6],
  ["桃始笑", "momo hajimete saku", "first peach blossoms", 3, 11],
  ["菜虫化蝶", "namushi chō to naru", "caterpillars become butterflies", 3, 16],
  ["雀始巣", "suzume hajimete sukuu", "sparrows start to nest", 3, 21],
  ["櫻始開", "sakura hajimete saku", "first cherry blossoms", 3, 26],
  ["雷乃発声", "kaminari sunawachi koe o hassu", "distant thunder", 3, 31],
  ["玄鳥至", "tsubame kitaru", "swallows return", 4, 5],
  ["鴻雁北", "kōgan kaeru", "wild geese fly north", 4, 10],
  ["虹始見", "niji hajimete arawaru", "first rainbows", 4, 15],
  ["葭始生", "ashi hajimete shōzu", "first reeds sprout", 4, 20],
  ["霜止出苗", "shimo yamite nae izuru", "last frost, rice seedlings grow", 4, 25],
  ["牡丹華", "botan hana saku", "peonies bloom", 4, 30],
  ["蛙始鳴", "kawazu hajimete naku", "frogs start singing", 5, 5],
  ["蚯蚓出", "mimizu izuru", "worms surface", 5, 10],
  ["竹笋生", "takenoko shōzu", "bamboo shoots sprout", 5, 15],
  ["蚕起食桑", "kaiko okite kuwa o hamu", "silkworms feast on mulberry", 5, 21],
  ["紅花栄", "benibana sakau", "safflowers bloom", 5, 26],
  ["麦秋至", "mugi no toki itaru", "wheat ripens", 5, 31],
  ["蟷螂生", "kamakiri shōzu", "praying mantises hatch", 6, 6],
  ["腐草為螢", "kusaretaru kusa hotaru to naru", "rotten grass becomes fireflies", 6, 11],
  ["梅子黄", "ume no mi kibamu", "plums turn yellow", 6, 16],
  ["乃東枯", "natsukarekusa karuru", "self-heal withers", 6, 21],
  ["菖蒲華", "ayame hana saku", "irises bloom", 6, 27],
  ["半夏生", "hange shōzu", "crow-dipper sprouts", 7, 2],
  ["温風至", "atsukaze itaru", "warm winds blow", 7, 7],
  ["蓮始開", "hasu hajimete hiraku", "first lotus blossoms", 7, 12],
  ["鷹乃学習", "taka sunawachi waza o narau", "young hawks learn to fly", 7, 17],
  ["桐始結花", "kiri hajimete hana o musubu", "paulownia sets its seeds", 7, 23],
  ["土潤溽暑", "tsuchi uruōte mushiatsushi", "damp earth, humid air", 7, 29],
  ["大雨時行", "taiu tokidoki furu", "great rains sometimes fall", 8, 3],
  ["涼風至", "suzukaze itaru", "cool winds blow", 8, 8],
  ["寒蝉鳴", "higurashi naku", "evening cicadas sing", 8, 13],
  ["蒙霧升降", "fukaki kiri matō", "thick fog descends", 8, 18],
  ["綿柎開", "wata no hana shibe hiraku", "cotton bolls open", 8, 23],
  ["天地始粛", "tenchi hajimete samushi", "the heat starts to die down", 8, 28],
  ["禾乃登", "kokumono sunawachi minoru", "rice ripens", 9, 2],
  ["草露白", "kusa no tsuyu shiroshi", "dew glistens white on grass", 9, 8],
  ["鶺鴒鳴", "sekirei naku", "wagtails sing", 9, 13],
  ["玄鳥去", "tsubame saru", "swallows leave", 9, 18],
  ["雷乃収声", "kaminari sunawachi koe o osamu", "thunder ceases", 9, 23],
  ["蟄虫坏戸", "mushi kakurete to o fusagu", "insects hole up underground", 9, 28],
  ["水始涸", "mizu hajimete karuru", "the fields are drained", 10, 3],
  ["鴻雁来", "kōgan kitaru", "wild geese return", 10, 8],
  ["菊花開", "kiku no hana hiraku", "chrysanthemums bloom", 10, 13],
  ["蟋蟀在戸", "kirigirisu to ni ari", "crickets chirp at the door", 10, 18],
  ["霜始降", "shimo hajimete furu", "first frost", 10, 23],
  ["霎時施", "kosame tokidoki furu", "light rains sometimes fall", 10, 28],
  ["楓蔦黄", "momiji tsuta kibamu", "maples and ivy turn", 11, 2],
  ["山茶始開", "tsubaki hajimete hiraku", "camellias bloom", 11, 7],
  ["地始凍", "chi hajimete kōru", "the land starts to freeze", 11, 12],
  ["金盞香", "kinsenka saku", "daffodils bloom", 11, 17],
  ["虹蔵不見", "niji kakurete miezu", "rainbows hide", 11, 22],
  ["朔風払葉", "kitakaze konoha o harau", "north wind strips the trees", 11, 27],
  ["橘始黄", "tachibana hajimete kibamu", "tachibana starts to yellow", 12, 2],
  ["閉塞成冬", "sora samuku fuyu to naru", "cold sets in, winter begins", 12, 7],
  ["熊蟄穴", "kuma ana ni komoru", "bears go into their dens", 12, 12],
  ["鱖魚群", "sake no uo muragaru", "salmon gather upstream", 12, 16],
  ["乃東生", "natsukarekusa shōzu", "self-heal sprouts", 12, 21],
  ["麋角解", "sawashika no tsuno otsuru", "deer shed their antlers", 12, 26],
  ["雪下出麦", "yuki watarite mugi nobiru", "wheat sprouts under the snow", 12, 31],
  ["芹乃栄", "seri sunawachi sakau", "parsley flourishes", 1, 5],
  ["水泉動", "shimizu atataka o fukumu", "springs thaw", 1, 10],
  ["雉始雊", "kiji hajimete naku", "pheasants start to call", 1, 15],
  ["款冬華", "fuki no hana saku", "butterbur buds", 1, 20],
  ["水沢腹堅", "sawamizu kōri tsumeru", "ice thickens on the streams", 1, 25],
  ["鶏始乳", "niwatori hajimete toya ni tsuku", "hens start laying", 1, 30],
];

export const KO: Ko[] = KO_TABLE.map(([kanji, reading, gloss, m, d], i) => ({
  n: i + 1,
  kanji,
  reading,
  gloss,
  from: [m, d],
}));

/** Local calendar day as a UTC midnight, so day arithmetic stays whole */
function dayOf(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function start(ko: Ko, year: number): number {
  return Date.UTC(year, ko.from[0] - 1, ko.from[1]);
}

export interface KoToday {
  ko: Ko;
  day: number;
  until: Date;
  sekki: string;
}

export function koOf(date: Date): KoToday {
  const today = dayOf(date);
  const year = date.getFullYear();

  // the latest start on or before today,
  // looking back into last year for January
  let i = 0;
  let from = -Infinity;
  KO.forEach((ko, k) => {
    for (const y of [year - 1, year]) {
      const s = start(ko, y);
      if (s <= today && s > from) {
        from = s;
        i = k;
      }
    }
  });
  const next = KO[(i + 1) % KO.length];
  let end = start(next, year);
  if (end <= today) end = start(next, year + 1);
  return {
    ko: KO[i],
    day: Math.round((today - from) / DAY),
    until: new Date(end - DAY),
    sekki: SEKKI[Math.floor(i / 3)],
  };
}

export const SYNODIC = 29.530588853;
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

export interface Moon {
  age: number;
  lit: number;
  waxing: boolean;
  words: string;
}

export function moonOf(date: Date): Moon {
  const age = ((((date.getTime() - NEW_MOON) / DAY) % SYNODIC) + SYNODIC) % SYNODIC;
  const lit = (1 - Math.cos((2 * Math.PI * age) / SYNODIC)) / 2;
  const waxing = age < SYNODIC / 2;
  let words: string;
  if (lit < 0.03) words = "new — the sky keeps it to itself";
  else if (lit > 0.97) words = "full tonight";
  else if (lit < 0.35) words = waxing ? "a thin waxing crescent" : "a thin waning crescent";
  else if (lit < 0.65) words = waxing ? "half lit, waxing" : "half lit, waning";
  else words = waxing ? "waxing, most of the way full" : "waning, still mostly full";
  return { age, lit, waxing, words };
}

/** Days to the nearest full or new moon */
export function moonEventIn(moon: Moon): number {
  const half = SYNODIC / 2;
  return Math.min(moon.age, Math.abs(moon.age - half), SYNODIC - moon.age);
}

/** lit part of a moon of radius r at (cx, cy) */
export function moonPath(moon: Moon, cx: number, cy: number, r: number): string {
  const rx = Math.abs(2 * moon.lit - 1) * r;
  const outer = moon.waxing ? 1 : 0;
  const inner = moon.lit > 0.5 === moon.waxing ? 1 : 0;
  const f = (n: number) => n.toFixed(1);
  return (
    `M${f(cx)} ${f(cy - r)} A${f(r)} ${f(r)} 0 0 ${outer} ${f(cx)} ${f(cy + r)} ` +
    `A${f(rx)} ${f(r)} 0 0 ${inner} ${f(cx)} ${f(cy - r)} Z`
  );
}

export type Card = "moon" | "season" | "window" | "ink";
export const CARDS: Card[] = ["moon", "season", "window", "ink"];

// same date, same number: tie-breaker rotates without flickering
function noise(key: string): number {
  let h = 2166136261;
  for (const ch of key) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const TURNS = new Set([10, 28, 46, 64]);

/**
 * How much a card has to say on a day
 */
function score(card: Card, date: Date, lastInk: number): number {
  switch (card) {
    case "moon": {
      const away = moonEventIn(moonOf(new Date(dayOf(date) + DAY / 2)));
      return away < 1 ? 5 : away < 2 ? 2.5 : 1;
    }
    case "season": {
      const { ko, day } = koOf(date);
      if (day === 0) return TURNS.has(ko.n) ? 3 : 4;
      return day === 1 ? 2 : 1;
    }
    case "window": {
      const { ko, day } = koOf(date);
      return TURNS.has(ko.n) && day === 0 ? 4.5 : 1;
    }
    case "ink": {
      const age = (dayOf(date) - lastInk) / DAY;
      return age <= 1 ? 3.5 : age <= 4 ? 1.5 : 0.6;
    }
  }
}

function best(date: Date, lastInk: number, avoid?: Card): Card {
  const key = new Date(dayOf(date)).toISOString().slice(0, 10);
  let pick: Card = "season";
  let top = -Infinity;
  for (const card of CARDS) {
    const s = score(card, date, lastInk) + noise(key + card) - (card === avoid ? 2 : 0);
    if (s > top) {
      top = s;
      pick = card;
    }
  }
  return pick;
}

export function cardFor(date: Date, lastInk: Date): Card {
  const ink = dayOf(lastInk);
  const yesterday = best(new Date(date.getTime() - DAY), ink);
  return best(date, ink, yesterday);
}
