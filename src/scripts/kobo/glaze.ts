import {
  newGroup,
  rng,
  hash,
  piece,
  bucket,
  tongs,
  note,
  kanji,
  GLAZES,
  GLAZE_NAMES,
} from "../../utils/tea/ink.js";
import {
  tones,
  stage,
  drag,
  frame,
  look,
  fit,
  clamp,
  markup,
  type Work,
  type Point,
} from "./stage";

const WIDTH = 1100,
  HEIGHT = 520;
const BUCKET_X = 550,
  BUCKET_Y = 470,
  BUCKET_SCALE = 3,
  SURFACE = BUCKET_Y - 36 * BUCKET_SCALE + 1;
const KANJI = ["天目", "志野", "飴", "青磁", "瑠璃", "織部", "朱"];

export function run(host: HTMLElement, work: Work, done: (w: Work) => void, back: () => void) {
  const view = stage(
    host,
    WIDTH,
    HEIGHT,
    ["釉", "the glazes"],
    [],
    `<clipPath id="kobo-above"><rect width="${WIDTH}" height="${SURFACE}"/></clipPath>`,
  );
  const spec = work.spec;
  let phase: "choose" | "dip" | "drip" = "choose";
  let glazeIndex = 0,
    sink = 0, // how far the piece is pushed down, in drawing units
    dip = 0,
    drips: [number, number, number][] = [],
    growing = -1;
  const dipScale = fit(spec, 200, 210, 2.2);
  const dripScale = fit(spec, 320, 300, 3.2);
  const restY = SURFACE - 40; // where the rim hangs before the dip

  function draw() {
    const rand = rng(hash("kobo/glaze"));
    const groups = [];
    if (phase === "choose") {
      const group = newGroup();
      GLAZES(tones).forEach((color: string, i: number) => {
        const x = 110 + i * 147;
        bucket(group, rand, x, 290, 1.7, tones, color);
        note(group, x, 342, GLAZE_NAMES[i], tones, 16, 0.75);
        kanji(group, x, 372, KANJI[i], tones, 15);
      });
      groups.push(group);
    } else if (phase === "dip") {
      const bucketGroup = newGroup();
      bucket(bucketGroup, rand, BUCKET_X, BUCKET_Y, BUCKET_SCALE, tones, GLAZES(tones)[glazeIndex]);
      groups.push(bucketGroup);
      const pieceHeight = spec.H * dipScale,
        rimY = restY + sink,
        middleY = rimY - pieceHeight / 2;
      const flip = newGroup({ tf: `rotate(180deg)`, to: `${BUCKET_X}px ${Math.round(middleY)}px` });
      piece(
        flip,
        rng(hash("kobo/mine")),
        BUCKET_X,
        rimY,
        dipScale,
        tones,
        look({ ...spec, glaze: dip > 0 ? { c: glazeIndex, dip, drips: [] } : null }),
      );
      flip.solid.shift(); // its shadow, which would hang in the air

      // clip stays upright outside the turned piece
      const tongsGroup = newGroup();
      tongs(tongsGroup, rand, BUCKET_X, rimY - pieceHeight - 2, tones);
      view.live.innerHTML =
        markup(groups) +
        `<g clip-path="url(#kobo-above)">${markup([flip])}</g>` +
        markup([tongsGroup]);
      return;
    } else {
      const group = newGroup();
      piece(
        group,
        rng(hash("kobo/mine")),
        BUCKET_X,
        440,
        dripScale,
        tones,
        look({ ...spec, glaze: { c: glazeIndex, dip, drips } }),
      );
      groups.push(group);
    }
    view.draw(groups);
  }
  const redraw = frame(draw);

  function say() {
    view.clearUi();
    view.button("← back to the workshop", back, "quiet");
    if (phase === "choose") {
      view.say("choose a glaze. each comes out of the kiln its own way.");
      GLAZES(tones).forEach((_: string, i: number) =>
        view.over(`${GLAZE_NAMES[i]} glaze`, 110 + i * 147, 290, 120, 140, () => {
          glazeIndex = i;
          phase = "dip";
          say();
          redraw();
        }),
      );
    } else if (phase === "dip") {
      view.say(
        `${GLAZE_NAMES[glazeIndex]}. drag the piece down into the bucket; let go to lift it out.`,
      );
      view.button(
        "another glaze",
        () => {
          phase = "choose";
          dip = 0;
          say();
          redraw();
        },
        "quiet",
      );
    } else {
      view.say("hold your finger on the piece where you want the glaze to run.");
      view.button(
        "dip it again",
        () => {
          phase = "dip";
          dip = 0;
          drips = [];
          say();
          redraw();
        },
        "quiet",
      );
      view.button("into the kiln", () =>
        done({
          ...work,
          step: "fire",
          spec: {
            ...spec,
            glaze: {
              c: glazeIndex,
              dip: round(dip),
              drips: drips.map((drip) => drip.map(round) as [number, number, number]),
            },
          },
        }),
      );
    }
  }

  // drip being held grows until the finger lifts
  let lastTime = 0;
  function grow(time: number) {
    if (growing < 0 || !view.root.isConnected) return;
    const elapsed = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0;
    lastTime = time;
    const drip = drips[growing];
    drip[1] = clamp(drip[1] + elapsed * 0.2, 0, 0.4);
    draw();
    requestAnimationFrame(grow);
  }

  let start: Point = [0, 0];
  drag(view, {
    down(point) {
      start = point;
      if (phase === "choose") return false;
      if (phase === "drip") {
        const widest = Math.max(...spec.prof.map(([radius]) => radius)) * dripScale;
        const across = (point[0] - BUCKET_X) / widest;
        if (Math.abs(across) > 1 || point[1] < 440 - spec.H * dripScale - 30 || point[1] > 460)
          return false;
        if (drips.length >= 6) {
          view.say("that is plenty of drips.");
          return false;
        }
        drips.push([clamp(across, -0.95, 0.95), 0.02, 0.06 + Math.random() * 0.04]);
        growing = drips.length - 1;
        lastTime = 0;
        requestAnimationFrame(grow);
      }
    },
    move(point) {
      if (phase !== "dip") return;
      sink = clamp(point[1] - start[1], 0, spec.H * dipScale + 40);
      dip = Math.max(dip, clamp((restY + sink - SURFACE) / (spec.H * dipScale), 0, 1));
      redraw();
    },
    up() {
      if (phase === "drip") growing = -1;
      if (phase !== "dip") return;
      sink = 0;
      if (dip < 0.05) {
        view.say("deeper: it has to go into the glaze.");
        dip = 0;
        redraw();
        return;
      }
      phase = "drip";
      say();
      redraw();
    },
  });

  say();
  draw();
}

const round = (value: number) => Math.round(value * 100) / 100;
