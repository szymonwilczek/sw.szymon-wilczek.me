import { GROUPS, TOOLS } from "../data/uses";
import { hash, rng } from "./stamp";

type Tone =
  | "clay"
  | "glaze"
  | "deep"
  | "lac"
  | "lacHi"
  | "bamboo"
  | "bambooLt"
  | "water"
  | "paper"
  | "silk"
  | "silkDk"
  | "iron"
  | "bronze"
  | "stone"
  | "ink"
  | "flame"
  | "leaf"
  | "clayRed"
  | "glow";

type Layer =
  | { k: "form"; d: string; tone: Tone }
  | { k: "line"; d: string; w: number }
  | { k: "gold"; d: string };

const round1 = (value: number) => Math.round(value * 10) / 10;
const ellipse = (
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  hole = false,
) =>
  `M${centerX - radiusX} ${centerY} a ${radiusX} ${radiusY} 0 1 ${hole ? 1 : 0} ${2 * radiusX} 0 a ${radiusX} ${radiusY} 0 1 ${hole ? 1 : 0} ${-2 * radiusX} 0 Z`;

const GRAPHICS = {
  bowl: { kanji: "碗", as: "chawan, the tea bowl" },
  caddy: { kanji: "棗", as: "natsume, the lacquer caddy" },
  whisk: { kanji: "筅", as: "chasen, the whisk" },
  brush: { kanji: "筆", as: "fude, the brush on its rest" },
  fan: { kanji: "扇", as: "uchiwa, the painted fan" },
  scroll: { kanji: "軸", as: "kakejiku, the hanging scroll" },
  kettle: { kanji: "釜", as: "kama, the iron kettle" },
  ironpot: { kanji: "瓶", as: "tetsubin, the iron pot" },
  lantern: { kanji: "灯", as: "chōchin, the paper lantern" },
  jar: { kanji: "水", as: "mizusashi, the water jar" },
  boxes: { kanji: "重", as: "jūbako, the stacked boxes" },
  candle: { kanji: "燭", as: "warōsoku, the candle" },
  bell: { kanji: "鈴", as: "fūrin, the wind bell" },
  scoop: { kanji: "杓", as: "chashaku, the scoop and its tube" },
  ladle: { kanji: "柄", as: "hishaku, the ladle" },
  mug: { kanji: "湯", as: "yunomi, the tall cup" },
  teapot: { kanji: "急", as: "kyūsu, the side-handle pot" },
  shears: { kanji: "鋏", as: "hasami, the shears" },
  vase: { kanji: "花", as: "hanaire, the bamboo vase" },
  censer: { kanji: "香", as: "kōro, the censer" },
  abacus: { kanji: "算", as: "soroban, the abacus" },
  daruma: { kanji: "達", as: "daruma, one eye painted" },
  umbrella: { kanji: "傘", as: "wagasa, the oiled umbrella" },
} as const;

export type GraphicName = keyof typeof GRAPHICS;

function draw(name: GraphicName): Layer[] {
  const form = (path: string, tone: Tone): Layer => ({ k: "form", d: path, tone });
  const line = (path: string, width = 1): Layer => ({ k: "line", d: path, w: width });
  const gold = (path: string): Layer => ({ k: "gold", d: path });
  if (name === "bowl")
    return [
      form("M84 154 L 86 166 C 94 169, 106 169, 114 166 L 116 154 Z", "clay"),
      form(
        "M26 80 C 28 118, 46 148, 80 155 C 94 158, 106 158, 120 155 C 154 148, 172 118, 174 80 C 140 89, 60 89, 26 80 Z",
        "glaze",
      ),
      form("M26 80 C 58 70, 142 70, 174 80 C 140 89, 60 89, 26 80 Z", "deep"),
      line(
        "M33 112 C 46 121, 58 113, 70 123 C 82 133, 96 121, 110 128 C 126 135, 144 121, 167 112",
        0.8,
      ),
      gold("M66 86 C 70 101, 61 115, 72 130 C 78 139, 74 148, 82 155"),
    ];
  if (name === "caddy")
    return [
      form("M44 118 C 46 146, 70 165, 100 165 C 130 165, 154 146, 156 118 Z", "lac"),
      form(
        "M44 118 C 44 100, 50 90, 66 86 C 84 82, 116 82, 134 86 C 150 90, 156 100, 156 118 C 120 124, 80 124, 44 118 Z",
        "lacHi",
      ),
      line("M44 118 C 80 124, 120 124, 156 118", 1),
      gold("M128 92 C 120 96, 120 108, 130 110 C 124 106, 123 97, 128 92 Z"),
    ];
  if (name === "whisk") {
    let tines = "";
    for (let tine = -7; tine <= 7; tine++) {
      const tipY = 48 + Math.abs(tine) * 0.9;
      tines += `M${round1(100 + tine * 1.8)} 122 C ${round1(100 + tine * 6.4)} 104, ${round1(100 + tine * 6.6)} 74, ${round1(100 + tine * 4.8)} ${round1(tipY + 6)} C ${round1(100 + tine * 4)} ${round1(tipY)}, ${round1(100 + tine * 3)} ${round1(tipY - 1)}, ${round1(100 + tine * 2.2)} ${round1(tipY + 4)} `;
    }
    return [
      form(
        "M86 122 C 66 106, 54 80, 60 58 C 66 47, 82 43, 100 43 C 118 43, 134 47, 140 58 C 146 80, 134 106, 114 122 Z",
        "bambooLt",
      ),
      line(tines, 0.7),
      form(
        "M87 122 C 87 140, 88 155, 90 167 C 96 169, 104 169, 110 167 C 112 155, 113 140, 113 122 Z",
        "bamboo",
      ),
      line("M86 118 C 94 123, 106 123, 114 118 M 87 123 C 94 127, 106 127, 113 123", 1.4),
    ];
  }
  if (name === "brush")
    return [
      form(
        "M44 167 C 46 150, 52 132, 62 132 C 70 132, 72 146, 78 146 C 86 146, 90 120, 100 120 C 110 120, 114 146, 122 146 C 128 146, 130 132, 138 132 C 148 132, 154 150, 156 167 Z",
        "deep",
      ),
      form(
        "M22 141 C 60 139, 110 138, 142 137 L 142 145 C 110 146, 60 147, 22 149 C 19 147, 19 143, 22 141 Z",
        "bamboo",
      ),
      form("M142 137 L 152 136.5 L 152 145.5 L 142 145 Z", "lac"),
      form("M152 136.5 C 166 136, 182 139, 194 141 C 182 143.5, 166 146, 152 145.5 Z", "ink"),
      line("M60 141 L 60 148 M 100 139 L 100 146", 0.6),
      line("M30 148 C 60 146, 100 145, 140 144", 0.4),
    ];
  if (name === "fan")
    return [
      form(ellipse(100, 82, 54, 50), "silk"),
      line(
        "M100 128 L 100 34 M 100 128 L 70 40 M 100 128 L 130 40 M 100 128 L 52 62 M 100 128 L 148 62 M 100 128 L 47 90 M 100 128 L 153 90",
        0.5,
      ),
      form(
        "M62 104 C 80 90, 96 98, 112 86 C 124 78, 136 80, 148 74 C 150 92, 140 114, 120 126 C 104 132, 82 128, 62 104 Z",
        "silkDk",
      ),
      form("M95 130 L 105 130 L 107 167 L 93 167 Z", "bamboo"),
      line("M96 150 L 104 150", 1),
    ];
  if (name === "scroll")
    return [
      line("M100 8 L 82 24 M 100 8 L 118 24", 0.8),
      form("M64 24 L 136 24 L 136 30 L 64 30 Z", "bamboo"),
      form("M68 30 L 132 30 L 132 156 L 68 156 Z", "clay"),
      form("M76 40 L 124 40 L 124 140 L 76 140 Z", "paper"),
      form(
        "M104 52 C 98 70, 112 84, 100 104 C 94 114, 96 124, 90 132 C 100 124, 106 112, 108 100 C 114 82, 104 70, 104 52 Z",
        "ink",
      ),
      line("M86 120 C 92 112, 96 116, 100 108", 0.6),
      form("M60 156 L 140 156 L 140 164 L 60 164 Z", "lac"),
      form(
        "M54 155 L 60 155 L 60 165 L 54 165 Z M 140 155 L 146 155 L 146 165 L 140 165 Z",
        "bronze",
      ),
    ];
  if (name === "kettle")
    return [
      form(
        "M38 104 C 28 124, 32 152, 58 162 C 84 170, 116 170, 142 162 C 168 152, 172 124, 162 104 C 130 96, 70 96, 38 104 Z",
        "iron",
      ),
      form("M64 101 C 66 88, 134 88, 136 101 C 120 104, 80 104, 64 101 Z", "deep"),
      form("M93 89 C 92 80, 108 80, 107 89 Z", "bronze"),
      form(ellipse(30, 116, 9, 9) + " " + ellipse(30, 116, 5, 5, true), "bronze"),
      form(ellipse(170, 116, 9, 9) + " " + ellipse(170, 116, 5, 5, true), "bronze"),
      line("M38 126 C 80 132, 120 132, 162 126", 0.8),
      line(
        "M54 112 l 0 .1 M 66 113 l 0 .1 M 78 114 l 0 .1 M 90 114 l 0 .1 M 102 114 l 0 .1 M 114 114 l 0 .1 M 126 113 l 0 .1 M 138 112 l 0 .1 M 150 111 l 0 .1 M 60 120 l 0 .1 M 72 121 l 0 .1 M 84 121 l 0 .1 M 96 121 l 0 .1 M 108 121 l 0 .1 M 120 121 l 0 .1 M 132 121 l 0 .1 M 144 120 l 0 .1",
        3,
      ),
    ];
  if (name === "ironpot")
    return [
      form("M150 124 C 162 118, 170 104, 178 94 L 184 98 C 178 112, 168 130, 152 140 Z", "iron"),
      form(
        "M48 122 C 44 150, 70 166, 100 166 C 130 166, 156 150, 152 122 C 148 106, 128 98, 100 98 C 72 98, 52 106, 48 122 Z",
        "iron",
      ),
      form("M80 101 C 82 92, 118 92, 120 101 C 108 104, 92 104, 80 101 Z", "deep"),
      form("M95 93 C 95 86, 105 86, 105 93 Z", "bronze"),
      line("M56 112 C 52 56, 148 56, 144 112", 3),
      line(
        "M64 120 l 0 .1 M 76 118 l 0 .1 M 88 117 l 0 .1 M 100 117 l 0 .1 M 112 117 l 0 .1 M 124 118 l 0 .1 M 136 120 l 0 .1 M 60 132 l 0 .1 M 72 130 l 0 .1 M 84 129 l 0 .1 M 96 129 l 0 .1 M 108 129 l 0 .1 M 120 129 l 0 .1 M 132 130 l 0 .1 M 144 132 l 0 .1",
        3,
      ),
    ];
  if (name === "lantern")
    return [
      line("M100 8 L 100 30", 1),
      form("M76 30 L 124 30 L 124 42 L 76 42 Z", "ink"),
      form("M78 42 C 52 64, 50 120, 78 144 L 122 144 C 150 120, 148 64, 122 42 Z", "glow"),
      line(
        "M70 54 C 90 58, 110 58, 130 54 M 62 70 C 88 75, 112 75, 138 70 M 58 88 C 86 93, 114 93, 142 88 M 58 106 C 86 111, 114 111, 142 106 M 62 124 C 88 129, 112 129, 138 124 M 70 138 C 90 141, 110 141, 130 138",
        0.5,
      ),
      form("M76 144 L 124 144 L 124 156 L 76 156 Z", "ink"),
      line("M100 156 L 100 168", 1),
    ];
  if (name === "jar")
    return [
      form(
        "M56 74 C 52 110, 54 142, 60 166 C 84 170, 116 170, 140 166 C 146 142, 148 110, 144 74 Z",
        "clay",
      ),
      form("M50 74 C 50 62, 150 62, 150 74 C 150 80, 50 80, 50 74 Z", "lac"),
      form("M94 64 C 94 58, 106 58, 106 64 Z", "lacHi"),
      form(
        "M58 82 C 80 87, 120 87, 142 82 C 142 92, 136 98, 132 100 C 128 102, 126 108, 124 114 C 122 108, 120 100, 112 100 C 104 100, 100 96, 96 100 C 90 104, 86 112, 82 118 C 80 108, 78 100, 70 98 C 62 96, 59 90, 58 82 Z",
        "glaze",
      ),
      line("M58 140 C 84 145, 116 145, 142 140", 0.6),
    ];
  if (name === "boxes")
    return [
      form("M44 136 L 156 136 L 154 166 L 46 166 Z", "lac"),
      form("M44 104 L 156 104 L 156 134 L 44 134 Z", "lac"),
      form("M44 72 L 156 72 L 156 102 L 44 102 Z", "lac"),
      form("M40 64 C 70 58, 130 58, 160 64 L 160 72 L 40 72 Z", "lacHi"),
      line("M44 103 L 156 103 M 44 135 L 156 135", 1.2),
      gold(
        "M58 92 C 70 82, 82 90, 92 80 M 112 124 C 124 114, 134 122, 146 112 M 64 156 C 78 148, 90 154, 100 146",
      ),
      form("M88 160 L 112 160 L 112 168 L 88 168 Z", "deep"),
    ];
  if (name === "candle")
    return [
      form("M100 54 C 90 42, 96 28, 100 18 C 104 28, 110 42, 100 54 Z", "flame"),
      form("M86 112 L 88 58 C 94 54, 106 54, 112 58 L 114 112 Z", "silk"),
      line("M100 56 L 100 50", 1),
      form("M76 112 C 76 120, 124 120, 124 112 C 112 108, 88 108, 76 112 Z", "iron"),
      form("M97 118 L 103 118 L 104 158 L 96 158 Z", "iron"),
      form("M64 166 C 66 156, 134 156, 136 166 Z", "iron"),
      gold("M94 76 L 106 76 M 94 90 L 106 90"),
    ];
  if (name === "bell")
    return [
      line("M100 6 L 100 46", 1),
      form("M68 84 C 68 58, 82 46, 100 46 C 118 46, 132 58, 132 84 L 134 92 L 66 92 Z", "water"),
      line("M74 70 C 82 64, 90 72, 98 66 C 106 60, 114 70, 124 64", 0.6),
      line("M100 92 L 100 116", 0.8),
      form("M92 116 L 108 116 L 108 166 L 92 166 Z", "silk"),
      line("M95 128 L 105 128 M 95 138 L 105 138", 0.5),
    ];
  if (name === "scoop")
    return [
      form("M118 40 L 140 40 L 142 166 L 116 166 Z", "bamboo"),
      line("M117 92 C 124 95, 134 95, 141 92 M 117 96 C 124 99, 134 99, 141 96", 0.8),
      form("M114 38 C 116 32, 142 32, 144 38 L 144 46 L 114 46 Z", "paper"),
      form(
        "M24 150 C 22 140, 28 132, 38 134 C 60 137, 88 142, 112 150 L 110 158 C 86 152, 60 149, 38 150 C 30 154, 26 154, 24 150 Z",
        "bambooLt",
      ),
      line("M70 142 C 68 145, 68 148, 70 151", 1),
    ];
  if (name === "ladle")
    return [
      form("M62 132 L 182 46 L 188 52 L 68 140 Z", "bambooLt"),
      form("M24 128 L 24 160 C 24 168, 70 168, 70 160 L 70 128 Z", "bamboo"),
      form("M24 128 C 24 120, 70 120, 70 128 C 70 134, 24 134, 24 128 Z", "deep"),
      line("M24 146 C 36 151, 58 151, 70 146", 0.8),
    ];
  if (name === "mug")
    return [
      form("M70 64 C 68 104, 70 140, 76 166 L 124 166 C 130 140, 132 104, 130 64 Z", "glaze"),
      form("M70 64 C 70 56, 130 56, 130 64 C 130 70, 70 70, 70 64 Z", "deep"),
      line(
        "M71 84 C 90 88, 110 88, 129 84 M 72 104 C 90 108, 110 108, 128 104 M 73 124 C 90 128, 110 128, 127 124",
        0.5,
      ),
      form("M71 70 C 80 90, 74 120, 78 138 C 72 126, 70 100, 71 70 Z", "clay"),
    ];
  if (name === "teapot")
    return [
      form("M62 128 C 50 124, 40 112, 32 102 L 28 106 C 34 120, 46 138, 64 142 Z", "clayRed"),
      form(
        "M60 118 C 56 148, 76 166, 100 166 C 124 166, 144 148, 140 118 C 126 110, 74 110, 60 118 Z",
        "clayRed",
      ),
      form("M74 116 C 78 104, 122 104, 126 116 C 112 119, 88 119, 74 116 Z", "lacHi"),
      form("M96 106 C 96 99, 104 99, 104 106 Z", "lac"),
      form("M138 128 L 188 108 L 192 116 L 140 138 Z", "clayRed"),
    ];
  if (name === "shears")
    return [
      form("M96 98 L 86 30 L 100 46 Z", "iron"),
      form("M104 98 L 114 30 L 100 46 Z", "iron"),
      form("M96 98 C 90 112, 84 120, 78 128 L 84 132 C 92 122, 98 112, 102 102 Z", "iron"),
      form("M104 98 C 110 112, 116 120, 122 128 L 116 132 C 108 122, 102 112, 98 102 Z", "iron"),
      form(ellipse(70, 146, 28, 22) + " " + ellipse(70, 146, 19, 14, true), "iron"),
      form(ellipse(130, 146, 28, 22) + " " + ellipse(130, 146, 19, 14, true), "iron"),
      form(ellipse(100, 98, 5, 5), "bronze"),
    ];
  if (name === "vase")
    return [
      form("M84 66 L 116 66 L 118 166 L 82 166 Z", "bamboo"),
      line("M83 112 C 94 115, 106 115, 117 112 M 83 116 C 94 119, 106 119, 117 116", 0.8),
      form("M86 80 C 92 76, 108 76, 114 80 L 114 104 C 108 100, 92 100, 86 104 Z", "deep"),
      line("M98 82 C 92 60, 80 44, 58 32", 1.4),
      form("M80 52 C 70 40, 74 30, 86 30 C 90 40, 88 48, 80 52 Z", "leaf"),
      form("M92 64 C 100 54, 112 54, 118 60 C 112 66, 100 68, 92 64 Z", "leaf"),
      form(ellipse(56, 30, 11, 10), "silk"),
      form(ellipse(56, 30, 3.5, 3.5), "flame"),
    ];
  if (name === "censer")
    return [
      line("M100 110 L 100 54", 0.8),
      line("M100 52 C 92 44, 108 36, 100 26 C 94 18, 104 12, 98 4", 0.5),
      form(
        "M48 108 C 50 138, 74 152, 100 152 C 126 152, 150 138, 152 108 C 120 114, 80 114, 48 108 Z",
        "bronze",
      ),
      form("M48 108 C 80 100, 120 100, 152 108 C 120 114, 80 114, 48 108 Z", "deep"),
      form("M66 146 L 60 166 L 68 166 L 76 150 Z", "bronze"),
      form("M134 146 L 140 166 L 132 166 L 124 150 Z", "bronze"),
      form("M96 152 L 96 166 L 104 166 L 104 152 Z", "bronze"),
      form(ellipse(40, 112, 8, 7) + " " + ellipse(40, 112, 4, 3.5, true), "bronze"),
      form(ellipse(160, 112, 8, 7) + " " + ellipse(160, 112, 4, 3.5, true), "bronze"),
    ];
  if (name === "abacus") {
    let beads = "",
      rods = "";
    for (let rod = 0; rod < 7; rod++) {
      const x = 38 + rod * 20.7;
      rods += `M${round1(x)} 104 L ${round1(x)} 158 `;
      for (const y of [112, 132, 140, 148])
        beads += `M${round1(x - 9)} ${y} L ${round1(x)} ${y - 4.5} L ${round1(x + 9)} ${y} L ${round1(x)} ${y + 4.5} Z `;
    }
    return [
      form("M22 96 L 178 96 L 178 166 L 22 166 Z M 30 104 L 30 158 L 170 158 L 170 104 Z", "lac"),
      line(rods, 0.6),
      form("M30 120 L 170 120 L 170 124 L 30 124 Z", "lac"),
      form(beads, "deep"),
    ];
  }
  if (name === "daruma")
    return [
      form(
        "M56 122 C 56 86, 76 66, 100 66 C 124 66, 144 86, 144 122 C 144 150, 126 166, 100 166 C 74 166, 56 150, 56 122 Z",
        "silk",
      ),
      form("M76 96 C 76 82, 124 82, 124 96 C 124 118, 76 118, 76 96 Z", "paper"),
      form(ellipse(89, 96, 6, 6), "ink"),
      line(ellipse(111, 96, 6, 6), 0.8),
      line("M84 108 C 92 114, 108 114, 116 108 M 82 88 L 94 86 M 106 86 L 118 88", 1),
      gold("M80 140 C 90 132, 110 132, 120 140 M 84 150 C 94 144, 106 144, 116 150"),
    ];
  if (name === "umbrella")
    return [
      form("M26 98 C 44 58, 156 58, 174 98 C 150 92, 50 92, 26 98 Z", "silk"),
      line(
        "M100 64 L 26 98 M 100 64 L 50 95 M 100 64 L 75 93 M 100 64 L 100 92 M 100 64 L 125 93 M 100 64 L 150 95 M 100 64 L 174 98",
        0.5,
      ),
      form(ellipse(100, 63, 6, 4), "ink"),
      form("M98 96 L 102 96 L 102 166 L 98 166 Z", "bamboo"),
      line("M40 97 L 100 112 L 160 97", 0.5),
      form("M96 146 L 104 146 L 104 166 L 96 166 Z", "ink"),
    ];
  return [];
}

const KANJI_DIGITS = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const kanjiNumber = (value: number) =>
  (value >= 20 ? KANJI_DIGITS[Math.floor(value / 10)] : "") +
  (value >= 10 ? "十" : "") +
  KANJI_DIGITS[value % 10];

export interface Picture {
  forms: { d: string; fill: string }[];
  lines: { d: string; stroke: string; w: number; o: number; ink: boolean }[];
}

export function picture(graphic: GraphicName): Picture {
  const layers = draw(graphic);
  return {
    forms: layers.flatMap((layer) =>
      layer.k === "form" ? [{ d: layer.d, fill: `var(--t-${layer.tone})` }] : [],
    ),
    lines: layers.flatMap((layer): Picture["lines"] =>
      layer.k === "gold"
        ? [{ d: layer.d, stroke: "var(--cursor)", w: 2.2, o: 1, ink: false }]
        : layer.k === "line"
          ? [{ d: layer.d, stroke: "var(--fg-main)", w: round1(layer.w * 0.8), o: 0.6, ink: true }]
          : [],
    ),
  };
}

export function shelf() {
  let numbered = 0;
  const groups = GROUPS.map((group) => ({
    ...group,
    cards: TOOLS.filter((tool) => tool.group === group.name).map((t) => {
      const rand = rng(hash("nijimi/" + t.graphic + "/" + t.name));
      numbered += 1;
      return {
        ...t,
        ...GRAPHICS[t.graphic],
        id: `dg-${numbered}`,
        num: kanjiNumber(numbered),
        rot: round1((rand() - 0.5) * 2.4),
        wash: `translate(${round1(3 + rand() * 3)} ${round1(2 + rand() * 3)})`,
        pool: { cx: round1(90 + rand() * 20), rx: round1(52 + rand() * 12) },
        ...picture(t.graphic),
      };
    }),
  })).filter((group) => group.cards.length);
  const taken = new Set(TOOLS.map((tool) => tool.graphic));
  const storehouse = (Object.keys(GRAPHICS) as GraphicName[])
    .filter((graphic) => !taken.has(graphic))
    .map((graphic) => ({
      graphic,
      ...GRAPHICS[graphic],
      short: GRAPHICS[graphic].as.split(",")[0],
      ...picture(graphic),
    }));
  return { groups, storehouse, count: numbered };
}
