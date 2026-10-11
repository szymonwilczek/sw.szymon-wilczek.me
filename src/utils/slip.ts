// Key to the stone on /roji, on a slip of paper tucked into one book on /books.
// The cipher in the static book says which: the number on its spine.
// Both come from the build's environment:
//
//   ROJI_KEY   the key, the same answer `npm run roji-key` hashed into key.ts
//   ROJI_BOOK  the :NO: of the book the slip is in

import satori from "satori";
import { readFileSync } from "node:fs";
import { KEY_HASH, keyHash } from "./tea/key";

export interface Slip {
  no: number;
  w: number;
  h: number;
  ink: string;
}

const W = 280;
const FS = 30;

export async function slip(): Promise<Slip | null> {
  const key = process.env.ROJI_KEY?.trim();
  const no = Number(process.env.ROJI_BOOK);
  if (!key || !Number.isInteger(no)) return null;
  if ((await keyHash(key)) !== KEY_HASH)
    console.warn("[slip] ROJI_KEY does not fit KEY_HASH in key.ts: the stone will not move");
  const font = readFileSync("src/assets/fonts/Kalam-Regular.ttf");
  const h = Math.ceil((key.length * FS * 0.44) / W) * FS * 1.3 + 8;
  const svg = await satori(
    {
      type: "div",
      props: {
        style: { display: "flex", flexWrap: "wrap", width: W, fontSize: FS, lineHeight: 1.3 },
        children: key,
      },
    },
    { width: W, height: h, fonts: [{ name: "Kalam", data: font, weight: 400, style: "normal" }] },
  );
  const ink = [...svg.matchAll(/<path[^>]* d="([^"]+)"/g)].map((m) => m[1]).join(" ");
  return { no, w: W, h, ink };
}
