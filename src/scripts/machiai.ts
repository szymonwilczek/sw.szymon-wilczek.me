// shelf in the waiting room, close up

import {
  G,
  rng,
  hash,
  piece,
  inked,
  wbox,
  So,
  Br,
  Tx,
  note,
  sceneShelf,
} from "../utils/tea/ink.js";
import { turned, sealOf, pieceWords, type PieceSpec } from "../utils/tea/pottery";
import { mine } from "../utils/tea/inbox";
import { K, stage, drag, frame, fit } from "./kobo/stage";

// a guest's piece I've approved approved is on the shelf already
const same = (a: PieceSpec, b: PieceSpec) =>
  a.name === b.name && a.made === b.made && a.fire === b.fire;

export function enter(host: HTMLElement, approved: PieceSpec[], leave: () => void) {
  const own = mine().filter((p) => !approved.some((q) => same(p, q)));
  shelf(host, approved, own, leave);
}

function shelf(host: HTMLElement, approved: PieceSpec[], own: PieceSpec[], leave: () => void) {
  const scene = sceneShelf(K, {
    pieces: approved.map((p) => turned(p)),
    own: own.map((p) => turned(p)),
  });
  const st = stage(host, scene.W, scene.H, ["待合", "the shelf in the waiting room"], scene.groups);
  // the shelf keeps the newest 18
  const shown = [...approved, ...own.slice(0, -1)].slice(-18);
  const all = own.length ? [...shown, own[own.length - 1]] : shown;
  st.say(
    all.length
      ? "take a piece down to look at it."
      : "nothing on the shelf yet. the workshop up the path is open to anyone with the key.",
  );
  st.over("Back to the garden", 110, 34, 220, 44, leave);
  for (const { i, x, y, own: theirs } of scene.spots as {
    i: number;
    x: number;
    y: number;
    own: boolean;
  }[]) {
    const p = all[i];
    if (!p) continue;
    st.over(`${theirs ? "your piece" : "a piece"} by ${p.name}`, x, y, 120, 130, () =>
      hands(host, p, theirs, () => shelf(host, approved, own, leave)),
    );
  }
}

const W = 1100,
  H = 460;
const CARD = { x0: 700, y0: 70, x1: 1040, y1: 400 };

function hands(host: HTMLElement, p: PieceSpec, theirs: boolean, back: () => void) {
  const r = rng(hash("machiai/card"));
  const card = G();
  inked(card, r, wbox(r, CARD.x0, CARD.y0, CARD.x1, CARD.y1, 0.8), K.paper, K.ink, 1.1);
  const mx = (CARD.x0 + CARD.x1) / 2;
  // the name as they wrote it, else in a hand like theirs
  if (p.sign.length) {
    const bw = 220,
      bh = (bw * 170) / 360;
    p.sign.forEach((line) =>
      Br(
        card,
        r,
        line.map(([u, v]) => [mx - bw / 2 - 20 + u * bw, CARD.y0 + 6 + v * bh]),
        2.4,
        K.ink,
        0.88,
        { tip: 0.3, head: 0.2 },
      ),
    );
  } else
    Tx(card, {
      t: p.name,
      tr: `translate(${mx - 20} ${CARD.y0 + 60})`,
      fs: 30,
      font: "Kalam, cursive",
      fill: K.ink,
      o: 0.85,
    });
  const sx = CARD.x1 - 36,
    sy = CARD.y0 + 40;
  So(card, wbox(r, sx - 18, sy - 18, sx + 18, sy + 18, 0.4), K.red, 0.88);
  Tx(card, {
    t: sealOf(p.name),
    tr: `translate(${sx} ${sy})`,
    fs: 22,
    font: "'Yuji Syuku', serif",
    fill: K.paper,
  });
  note(card, mx, CARD.y0 + 130, p.name, K, 18, 0.8);
  pieceWords(p).forEach((t, k) => note(card, mx, CARD.y0 + 175 + k * 30, t, K, 16, 0.7));
  const day = new Date(p.made + "T12:00:00");
  if (!isNaN(+day))
    note(
      card,
      mx,
      CARD.y1 - 40,
      day.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      K,
      16,
      0.6,
    );
  if (theirs) note(card, mx, CARD.y1 + 34, "仮 · yours, waiting for the host", K, 14, 0.6);

  const st = stage(host, W, H, ["手", "in your hands"], [card]);
  const s = fit(p, 420, 330, 4);
  let turn = 0;
  const draw = () => {
    const g = G();
    piece(g, rng(hash("piece/" + p.name + p.fire)), 330, 400, s, K, turned(p, turn));
    st.draw([g]);
  };
  const redraw = frame(draw);
  st.say("drag to turn it in your hands.");
  st.button("← put it back", back, "quiet");
  st.button("↺ turn", () => ((turn -= 0.5), redraw()));
  st.button("turn ↻", () => ((turn += 0.5), redraw()));
  let from: [number, number] | null = null;
  const rw = Math.max(...p.prof.map(([x]) => x)) * s;
  drag(st, {
    down: (q) => {
      if (q[0] > CARD.x0 - 20) return false;
      from = [q[0], turn];
    },
    move: (q) => {
      if (!from) return;
      turn = from[1] - (q[0] - from[0]) / rw;
      redraw();
    },
    up: () => (from = null),
  });
  draw();
}
