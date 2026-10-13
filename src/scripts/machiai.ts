// shelf in the waiting room, close up

import {
  newGroup,
  rng,
  hash,
  piece,
  inked,
  wobblyBox,
  addSolid,
  brushStroke,
  addText,
  note,
  sceneShelf,
} from "../utils/tea/ink.js";
import { turned, sealOf, pieceWords, type PieceSpec } from "../utils/tea/pottery";
import { mine } from "../utils/tea/inbox";
import { tones, stage, drag, frame, fit, fitUnderside, underside } from "./kobo/stage";

// a guest's piece I've approved approved is on the shelf already
const same = (first: PieceSpec, second: PieceSpec) =>
  first.name === second.name && first.made === second.made && first.fire === second.fire;

export function enter(host: HTMLElement, approved: PieceSpec[], leave: () => void) {
  const ownPieces = mine().filter((pot) => !approved.some((shelved) => same(pot, shelved)));
  shelf(host, approved, ownPieces, leave);
}

function shelf(
  host: HTMLElement,
  approved: PieceSpec[],
  ownPieces: PieceSpec[],
  leave: () => void,
) {
  const scene = sceneShelf(tones, {
    pieces: approved.map((pot) => turned(pot)),
    own: ownPieces.map((pot) => turned(pot)),
  });
  const view = stage(
    host,
    scene.W,
    scene.H,
    ["待合", "the shelf in the waiting room"],
    scene.groups,
  );
  // the shelf keeps the newest 18
  const shown = [...approved, ...ownPieces.slice(0, -1)].slice(-18);
  const onShelf = ownPieces.length ? [...shown, ownPieces[ownPieces.length - 1]] : shown;
  view.say(
    onShelf.length
      ? "take a piece down to look at it."
      : "nothing on the shelf yet. the workshop up the path is open to anyone with the key.",
  );
  view.over("Back to the garden", 110, 34, 220, 44, leave);
  for (const { i, x: spotX, y: spotY, own: theirs } of scene.spots as {
    i: number;
    x: number;
    y: number;
    own: boolean;
  }[]) {
    const pot = onShelf[i];
    if (!pot) continue;
    view.over(`${theirs ? "your piece" : "a piece"} by ${pot.name}`, spotX, spotY, 120, 130, () =>
      hands(host, pot, theirs, () => shelf(host, approved, ownPieces, leave)),
    );
  }
}

const WIDTH = 1100,
  HEIGHT = 460;
const CARD = { x0: 700, y0: 70, x1: 1040, y1: 400 };
const PIECE_AT = { x: 330, y: 400 };
const UNDERSIDE_AT = { x: 330, y: 235 };
const UNDERSIDE_ROOM = 165;

function hands(host: HTMLElement, spec: PieceSpec, theirs: boolean, back: () => void) {
  const rand = rng(hash("machiai/card"));
  const card = newGroup();
  inked(
    card,
    rand,
    wobblyBox(rand, CARD.x0, CARD.y0, CARD.x1, CARD.y1, 0.8),
    tones.paper,
    tones.ink,
    1.1,
  );
  const middleX = (CARD.x0 + CARD.x1) / 2;
  // the name as they wrote it, else in a hand like theirs
  if (spec.sign.length) {
    const signWidth = 220,
      signHeight = (signWidth * 170) / 360;
    spec.sign.forEach((line) =>
      brushStroke(
        card,
        rand,
        line.map(([across, down]) => [
          middleX - signWidth / 2 - 20 + across * signWidth,
          CARD.y0 + 6 + down * signHeight,
        ]),
        2.4,
        tones.ink,
        0.88,
        { tip: 0.3, head: 0.2 },
      ),
    );
  } else
    addText(card, {
      t: spec.name,
      tr: `translate(${middleX - 20} ${CARD.y0 + 60})`,
      fs: 30,
      font: "Kalam, cursive",
      fill: tones.ink,
      o: 0.85,
    });
  const sealX = CARD.x1 - 36,
    sealY = CARD.y0 + 40;
  addSolid(
    card,
    wobblyBox(rand, sealX - 18, sealY - 18, sealX + 18, sealY + 18, 0.4),
    tones.red,
    0.88,
  );
  addText(card, {
    t: sealOf(spec.name),
    tr: `translate(${sealX} ${sealY})`,
    fs: 22,
    font: "'Yuji Syuku', serif",
    fill: tones.paper,
  });
  note(card, middleX, CARD.y0 + 130, spec.name, tones, 18, 0.8);
  pieceWords(spec).forEach((words, lineIndex) =>
    note(card, middleX, CARD.y0 + 175 + lineIndex * 30, words, tones, 16, 0.7),
  );
  const madeOn = new Date(spec.made + "T12:00:00");
  if (!isNaN(+madeOn))
    note(
      card,
      middleX,
      CARD.y1 - 40,
      madeOn.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
      tones,
      16,
      0.6,
    );
  if (theirs) note(card, middleX, CARD.y1 + 34, "仮 · yours, waiting for the host", tones, 14, 0.6);

  const view = stage(host, WIDTH, HEIGHT, ["手", "in your hands"], [card]);
  const size = fit(spec, 420, 330, 4);
  const undersideSize = fitUnderside(spec, UNDERSIDE_ROOM, size);
  let turn = 0,
    upsideDown = false,
    turningOver = false;
  const draw = () => {
    if (upsideDown) {
      view.draw(
        underside(spec, UNDERSIDE_AT.x, UNDERSIDE_AT.y, undersideSize, turn, {
          seal: sealOf(spec.name),
          turningOver,
        }),
      );
    } else {
      const group = newGroup({ cls: turningOver ? "kobo-turn-over" : "" });
      piece(
        group,
        rng(hash("piece/" + spec.name + spec.fire)),
        PIECE_AT.x,
        PIECE_AT.y,
        size,
        tones,
        turned(spec, turn),
      );
      view.draw([group]);
    }
    turningOver = false;
  };
  const redraw = frame(draw);
  view.say("drag to turn it in your hands.");
  view.button("← put it back", back, "quiet");
  view.button("↺ turn", () => ((turn -= 0.5), redraw()));
  view.button("turn ↻", () => ((turn += 0.5), redraw()));
  const over = view.button("turn it over", () => {
    upsideDown = !upsideDown;
    turningOver = true;
    over.textContent = upsideDown ? "set it upright" : "turn it over";
    view.say(
      upsideDown ? "the foot, and the seal pressed into it." : "drag to turn it in your hands.",
    );
    redraw();
  });
  let from: [number, number] | null = null;
  const widest = Math.max(...spec.prof.map(([radius]) => radius)) * size;
  drag(view, {
    down: (point) => {
      if (point[0] > CARD.x0 - 20) return false;
      from = [point[0], turn];
    },
    move: (point) => {
      if (!from) return;
      turn = from[1] - (point[0] - from[0]) / widest;
      redraw();
    },
    up: () => (from = null),
  });
  draw();
}
