// Key to the stone on /roji, on a slip of paper tucked into one book on /books.
// The cipher in the static book says which: the number on its spine.
// The key comes from the build's environment:
//   ROJI_KEY   the key, the same answer `npm run roji-key` hashed into key.ts

import satori from "satori";
import { readFileSync } from "node:fs";
import { KEY_HASH, keyHash } from "./tea/key";

// which standing book, counted from the top left
export const SLIP_AT = 3;

export interface Slip {
  w: number;
  h: number;
  ink: string;
}

const WIDTH = 280;
const FONT_SIZE = 30;

export async function slip(): Promise<Slip | null> {
  const key = (import.meta.env.ROJI_KEY ?? process.env.ROJI_KEY)?.trim();
  if (!key) return null;
  if ((await keyHash(key)) !== KEY_HASH)
    console.warn("[slip] ROJI_KEY does not fit KEY_HASH in key.ts: the stone will not move");
  const font = readFileSync("src/assets/fonts/Kalam-Regular.ttf");
  const height = Math.ceil((key.length * FONT_SIZE * 0.44) / WIDTH) * FONT_SIZE * 1.3 + 8;
  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          flexWrap: "wrap",
          width: WIDTH,
          fontSize: FONT_SIZE,
          lineHeight: 1.3,
        },
        children: key,
      },
    },
    {
      width: WIDTH,
      height,
      fonts: [{ name: "Kalam", data: font, weight: 400, style: "normal" }],
    },
  );
  const ink = [...svg.matchAll(/<path[^>]* d="([^"]+)"/g)].map((match) => match[1]).join(" ");
  return { w: WIDTH, h: height, ink };
}
