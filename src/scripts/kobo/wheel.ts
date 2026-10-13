import {
  newGroup,
  rng,
  hash,
  wheel,
  piece,
  fingertip,
  CLAYS,
  addSolid,
  addLine,
  wobblyRing,
  note,
  spin,
} from "../../utils/tea/ink.js";
import { CLAY_NAMES } from "../../utils/tea/pottery";
import { tones, stage, drag, frame, clamp, still, type Work, type Point } from "./stage";

const WIDTH = 1100,
  HEIGHT = 480;
const CENTER_X = 550,
  HEAD = 280, // the wheel head
  WHEEL_SCALE = 2.2,
  CLAY_SCALE = 2; // clay scale: one unit of the piece is two of the drawing
const FOOT = HEAD - 4;
const LUMP: [number, number][] = [
  [30, 0],
  [36, 0.35],
  [28, 0.8],
  [14, 1],
];
const OPENED: [number, number][] = [
  [30, 0],
  [33, 0.4],
  [32, 0.9],
  [26, 1],
];
const LEVELS = [0, 0.3, 0.7, 1];

// the wall pulled to height h: the same clay, narrower as it rises
const pulled = (height: number): [number, number][] => {
  const narrowing = Math.sqrt(34 / height);
  return [26, 27, 25.5, 23].map((radius, i) => [Math.max(8, radius * narrowing), LEVELS[i]]);
};
export const kindOf = (height: number, handle: boolean) =>
  height < 20 ? "a plate" : handle ? "a cup" : height < 50 ? "a bowl" : "a tall cup";

export function run(host: HTMLElement, work: Work, done: (w: Work) => void, back: () => void) {
  const base = newGroup();
  wheel(base, rng(hash("kobo/wheel")), CENTER_X, HEAD, WHEEL_SCALE, tones);
  spin(base, rng(hash("kobo/spin")), CENTER_X, HEAD + 10, 120, 30, tones);
  const view = stage(host, WIDTH, HEIGHT, ["轆轤", "the wheel"], [base]);

  type Phase = "clay" | "centre" | "open" | "pull" | "shape";
  let phase: Phase = "clay";
  let wobble = 1,
    pressing = false,
    depth = 0,
    height = 34,
    profile = LUMP,
    handle = false;
  const spec = work.spec;

  const lump = () => {
    if (phase === "clay" || phase === "centre") return { prof: LUMP, H: 40 };
    if (phase === "open") return { prof: OPENED, H: 34 };
    return { prof: profile, H: height };
  };

  function draw() {
    const rand = rng(hash("kobo/clay"));
    const groups = [];
    if (phase === "clay") {
      const group = newGroup();
      CLAYS(tones).forEach((color: string, i: number) => {
        const x = CENTER_X + (i - 1.5) * 120;
        addSolid(group, wobblyRing(rand, x + 4, 152, 34, 8, 0.4, 10), tones.ink, 0.14);
        addSolid(group, wobblyRing(rand, x, 130, 30, 22, 3, 10), color, 1);
        addLine(group, wobblyRing(rand, x, 130, 30, 22, 3, 10), tones.ink, 1.1, 0.85);
        note(group, x, 182, CLAY_NAMES[i], tones, 15, 0.7);
      });
      groups.push(group);
    } else {
      const { prof: shape, H: lumpHeight } = lump();
      const clay = newGroup({ cls: "kobo-clay" });
      piece(clay, rand, CENTER_X, FOOT, CLAY_SCALE, tones, {
        prof: shape,
        H: lumpHeight,
        clay: spec.clay,
        glaze: { none: true },
        fire: 3,
        handle,
      });
      groups.push(clay);
      const rimY = FOOT - lumpHeight * CLAY_SCALE;
      const fingers = newGroup();
      if (phase === "centre" && pressing) {
        const half = shape[1][0] * CLAY_SCALE + 18;
        fingertip(fingers, rand, CENTER_X - half, FOOT - lumpHeight * CLAY_SCALE * 0.5, tones);
        fingertip(fingers, rand, CENTER_X + half, FOOT - lumpHeight * CLAY_SCALE * 0.5, tones);
      }
      if (phase === "open" && depth > 0) {
        const holeRadius = (5 + Math.min(depth, 1.2) * 16) * CLAY_SCALE;
        addSolid(
          fingers,
          wobblyRing(rand, CENTER_X, rimY + 2, holeRadius, holeRadius * 0.28, 0.4, 14),
          tones.ink,
          0.28 + depth * 0.2,
        );
        fingertip(fingers, rand, CENTER_X, rimY - 8 + depth * 30, tones);
      }
      if (phase === "pull" && pressing) {
        const radius = shape[2][0] * CLAY_SCALE;
        fingertip(
          fingers,
          rand,
          CENTER_X + radius + 14,
          rimY + lumpHeight * CLAY_SCALE * 0.3,
          tones,
        );
      }
      if (phase === "shape") {
        shape.forEach(([radius, level]) => {
          const handlePoint = handleAt(radius, level);
          addSolid(
            fingers,
            wobblyRing(rand, handlePoint[0], handlePoint[1], 7, 7, 0.3, 10),
            tones.paper,
            1,
          );
          addLine(
            fingers,
            wobblyRing(rand, handlePoint[0], handlePoint[1], 7, 7, 0.3, 10),
            tones.ink,
            1.2,
            0.9,
          );
        });
      }
      groups.push(fingers);
    }
    view.draw(groups);
    shake();
  }
  const redraw = frame(draw);
  const handleAt = (radius: number, level: number): Point => [
    CENTER_X + radius * CLAY_SCALE,
    FOOT - level * height * CLAY_SCALE,
  ];

  // the lump runs out of true until it is held still
  let lastTime = performance.now(),
    angle = 0;
  function shake() {
    const clay = view.live.querySelector<SVGGElement>(".kobo-clay");
    if (!clay) return;
    const sway = phase === "centre" ? wobble : 0;
    clay.setAttribute(
      "transform",
      `translate(${(Math.sin(angle) * 9 * sway).toFixed(1)} 0) skewX(${(Math.sin(angle + 1) * 5 * sway).toFixed(1)})`,
    );
    clay.style.transformOrigin = `${CENTER_X}px ${FOOT}px`;
  }
  function tick(time: number) {
    if (!view.root.isConnected) return;
    const step = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    angle += step * (still() ? 0 : 9);
    if (phase === "centre") {
      wobble = clamp(wobble + (pressing ? -0.32 : 0.04) * step, 0, 1);
      if (wobble === 0) {
        phase = "open";
        pressing = false;
        say();
        redraw();
      }
    }
    shake();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function say() {
    view.clearUi();
    view.button("← back to the workshop", back, "quiet");
    if (phase === "clay") {
      view.say("choose a clay.");
      CLAYS(tones).forEach((_: string, i: number) =>
        view.over(`${CLAY_NAMES[i]} clay`, CENTER_X + (i - 1.5) * 120, 144, 90, 90, () => {
          spec.clay = i;
          phase = "centre";
          say();
          redraw();
        }),
      );
    } else if (phase === "centre") {
      view.say("一 · it runs out of true. hold it, press and keep pressing, until it spins still.");
    } else if (phase === "open") {
      view.say("二 · press your thumb down into the middle. not too deep.");
    } else if (phase === "pull") {
      view.say(
        `三 · drag up to pull the wall, down to press it low. now: ${kindOf(height, false)}.`,
      );
      view.button("shape it", () => {
        phase = "shape";
        profile = profile.map(([radius], i) => [radius, LEVELS[i]]);
        say();
        redraw();
      });
    } else {
      view.say(`四 · drag the dots out or in. ${kindOf(height, handle)}.`);
      if (height >= 40)
        view.button(handle ? "take the handle off" : "pull a handle", () => {
          handle = !handle;
          say();
          redraw();
        });
      view.button("cut it off the wheel", () => {
        done({
          ...work,
          step: "shelf",
          spec: {
            ...spec,
            prof: profile.map(([radius, level]) => [Math.round(radius), level]),
            H: Math.round(height),
            handle,
          },
        });
      });
    }
  }

  let start: Point = [0, 0],
    startHeight = height,
    grab = -1,
    began: Phase = phase,
    tallOnce = false;
  drag(view, {
    down(point) {
      start = point;
      began = phase;
      if (phase === "clay") return false;
      if (phase === "centre") pressing = true;
      if (phase === "pull") ((startHeight = height), (pressing = true));
      if (phase === "shape") {
        grab = -1;
        let best = 40;
        profile.forEach(([radius, level], i) => {
          const distance = Math.hypot(
            point[0] - handleAt(radius, level)[0],
            point[1] - handleAt(radius, level)[1],
          );
          if (distance < best) ((best = distance), (grab = i));
        });
        if (grab < 0) return false;
      }
      redraw();
    },
    move(point) {
      if (phase === "open") depth = clamp((point[1] - start[1]) / 80, 0, 1.3);
      if (phase === "pull") {
        height = clamp(startHeight + (start[1] - point[1]) / CLAY_SCALE, 12, 76);
        profile = pulled(height);
        view.say(
          `三 · drag up to pull the wall, down to press it low. now: ${kindOf(height, false)}.`,
        );
      }
      if (phase === "shape" && grab >= 0) {
        const radius = clamp(Math.abs(point[0] - CENTER_X) / CLAY_SCALE, 8, 96);
        const near = [profile[grab - 1]?.[0], profile[grab + 1]?.[0]].filter(
          (neighbour) => neighbour !== undefined,
        );
        profile[grab] = [
          clamp(
            radius,
            Math.max(8, ...near.map((neighbour) => neighbour - 36)),
            Math.min(96, ...near.map((neighbour) => neighbour + 36)),
          ),
          profile[grab][1],
        ];
      }
      redraw();
    },
    up() {
      pressing = false;
      if (phase === "open" && began === "open") {
        if (depth < 0.35) {
          view.say("二 · a little deeper.");
          depth = 0;
        } else {
          if (depth > 1) {
            work.flaw += 0.2;
            view.say("too deep: the floor is thin now. it may crack in the kiln.");
          }
          const deep = depth > 1;
          phase = "pull";
          profile = pulled(height);
          if (!deep) say();
          else setTimeout(say, 1800);
        }
      }
      if (phase === "pull" && began === "pull" && height > 70 && !tallOnce) {
        tallOnce = true;
        work.flaw += 0.1;
        view.say("the wall is very thin up there. careful.");
      }
      grab = -1;
      redraw();
    },
  });

  say();
  draw();
}
