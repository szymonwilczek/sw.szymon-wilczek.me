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
import { K, stage, drag, frame, clamp, still, type Work, type P } from "./stage";

const W = 1100,
  H = 480;
const CX = 550,
  HEAD = 280, // the wheel head
  WS = 2.2,
  CS = 2; // clay scale: one unit of the piece is two of the drawing
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
const VS = [0, 0.3, 0.7, 1];

// the wall pulled to height h: the same clay, narrower as it rises
const pulled = (h: number): [number, number][] => {
  const f = Math.sqrt(34 / h);
  return [26, 27, 25.5, 23].map((r, i) => [Math.max(8, r * f), VS[i]]);
};
export const kindOf = (h: number, handle: boolean) =>
  h < 20 ? "a plate" : handle ? "a cup" : h < 50 ? "a bowl" : "a tall cup";

export function run(host: HTMLElement, w: Work, done: (w: Work) => void, back: () => void) {
  const base = newGroup();
  wheel(base, rng(hash("kobo/wheel")), CX, HEAD, WS, K);
  spin(base, rng(hash("kobo/spin")), CX, HEAD + 10, 120, 30, K);
  const s = stage(host, W, H, ["轆轤", "the wheel"], [base]);

  type Phase = "clay" | "centre" | "open" | "pull" | "shape";
  let phase: Phase = "clay";
  let wob = 1,
    pressing = false,
    depth = 0,
    h = 34,
    prof = LUMP,
    handle = false;
  const spec = w.spec;

  const lump = () => {
    if (phase === "clay" || phase === "centre") return { prof: LUMP, H: 40 };
    if (phase === "open") return { prof: OPENED, H: 34 };
    return { prof, H: h };
  };

  function draw() {
    const r = rng(hash("kobo/clay"));
    const groups = [];
    if (phase === "clay") {
      const g = newGroup();
      CLAYS(K).forEach((c: string, i: number) => {
        const x = CX + (i - 1.5) * 120;
        addSolid(g, wobblyRing(r, x + 4, 152, 34, 8, 0.4, 10), K.ink, 0.14);
        addSolid(g, wobblyRing(r, x, 130, 30, 22, 3, 10), c, 1);
        addLine(g, wobblyRing(r, x, 130, 30, 22, 3, 10), K.ink, 1.1, 0.85);
        note(g, x, 182, CLAY_NAMES[i], K, 15, 0.7);
      });
      groups.push(g);
    } else {
      const { prof: p, H: ht } = lump();
      const c = newGroup({ cls: "kobo-clay" });
      piece(c, r, CX, FOOT, CS, K, {
        prof: p,
        H: ht,
        clay: spec.clay,
        glaze: { none: true },
        fire: 3,
        handle,
      });
      groups.push(c);
      const top = FOOT - ht * CS;
      const f = newGroup();
      if (phase === "centre" && pressing) {
        const half = p[1][0] * CS + 18;
        fingertip(f, r, CX - half, FOOT - ht * CS * 0.5, K);
        fingertip(f, r, CX + half, FOOT - ht * CS * 0.5, K);
      }
      if (phase === "open" && depth > 0) {
        const rx = (5 + Math.min(depth, 1.2) * 16) * CS;
        addSolid(f, wobblyRing(r, CX, top + 2, rx, rx * 0.28, 0.4, 14), K.ink, 0.28 + depth * 0.2);
        fingertip(f, r, CX, top - 8 + depth * 30, K);
      }
      if (phase === "pull" && pressing) {
        const rr = p[2][0] * CS;
        fingertip(f, r, CX + rr + 14, top + ht * CS * 0.3, K);
      }
      if (phase === "shape") {
        p.forEach(([rr, v]) => {
          const at = dot(rr, v);
          addSolid(f, wobblyRing(r, at[0], at[1], 7, 7, 0.3, 10), K.paper, 1);
          addLine(f, wobblyRing(r, at[0], at[1], 7, 7, 0.3, 10), K.ink, 1.2, 0.9);
        });
      }
      groups.push(f);
    }
    s.draw(groups);
    shake();
  }
  const redraw = frame(draw);
  const dot = (rr: number, v: number): P => [CX + rr * CS, FOOT - v * h * CS];

  // the lump runs out of true until it is held still
  let t0 = performance.now(),
    phi = 0;
  function shake() {
    const c = s.live.querySelector<SVGGElement>(".kobo-clay");
    if (!c) return;
    const k = phase === "centre" ? wob : 0;
    c.setAttribute(
      "transform",
      `translate(${(Math.sin(phi) * 9 * k).toFixed(1)} 0) skewX(${(Math.sin(phi + 1) * 5 * k).toFixed(1)})`,
    );
    c.style.transformOrigin = `${CX}px ${FOOT}px`;
  }
  function tick(t: number) {
    if (!s.root.isConnected) return;
    const dt = Math.min(0.05, (t - t0) / 1000);
    t0 = t;
    phi += dt * (still() ? 0 : 9);
    if (phase === "centre") {
      wob = clamp(wob + (pressing ? -0.32 : 0.04) * dt, 0, 1);
      if (wob === 0) {
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
    s.clearUi();
    s.button("← back to the workshop", back, "quiet");
    if (phase === "clay") {
      s.say("choose a clay.");
      CLAYS(K).forEach((_: string, i: number) =>
        s.over(`${CLAY_NAMES[i]} clay`, CX + (i - 1.5) * 120, 144, 90, 90, () => {
          spec.clay = i;
          phase = "centre";
          say();
          redraw();
        }),
      );
    } else if (phase === "centre") {
      s.say("一 · it runs out of true. hold it, press and keep pressing, until it spins still.");
    } else if (phase === "open") {
      s.say("二 · press your thumb down into the middle. not too deep.");
    } else if (phase === "pull") {
      s.say(`三 · drag up to pull the wall, down to press it low. now: ${kindOf(h, false)}.`);
      s.button("shape it", () => {
        phase = "shape";
        prof = prof.map(([r], i) => [r, VS[i]]);
        say();
        redraw();
      });
    } else {
      s.say(`四 · drag the dots out or in. ${kindOf(h, handle)}.`);
      if (h >= 40)
        s.button(handle ? "take the handle off" : "pull a handle", () => {
          handle = !handle;
          say();
          redraw();
        });
      s.button("cut it off the wheel", () => {
        done({
          ...w,
          step: "shelf",
          spec: {
            ...spec,
            prof: prof.map(([r, v]) => [Math.round(r), v]),
            H: Math.round(h),
            handle,
          },
        });
      });
    }
  }

  let from: P = [0, 0],
    h0 = h,
    grab = -1,
    began: Phase = phase,
    tallOnce = false;
  drag(s, {
    down(p) {
      from = p;
      began = phase;
      if (phase === "clay") return false;
      if (phase === "centre") pressing = true;
      if (phase === "pull") ((h0 = h), (pressing = true));
      if (phase === "shape") {
        grab = -1;
        let best = 40;
        prof.forEach(([rr, v], i) => {
          const d = Math.hypot(p[0] - dot(rr, v)[0], p[1] - dot(rr, v)[1]);
          if (d < best) ((best = d), (grab = i));
        });
        if (grab < 0) return false;
      }
      redraw();
    },
    move(p) {
      if (phase === "open") depth = clamp((p[1] - from[1]) / 80, 0, 1.3);
      if (phase === "pull") {
        h = clamp(h0 + (from[1] - p[1]) / CS, 12, 76);
        prof = pulled(h);
        s.say(`三 · drag up to pull the wall, down to press it low. now: ${kindOf(h, false)}.`);
      }
      if (phase === "shape" && grab >= 0) {
        const rr = clamp(Math.abs(p[0] - CX) / CS, 8, 96);
        const near = [prof[grab - 1]?.[0], prof[grab + 1]?.[0]].filter((x) => x !== undefined);
        prof[grab] = [
          clamp(
            rr,
            Math.max(8, ...near.map((x) => x - 36)),
            Math.min(96, ...near.map((x) => x + 36)),
          ),
          prof[grab][1],
        ];
      }
      redraw();
    },
    up() {
      pressing = false;
      if (phase === "open" && began === "open") {
        if (depth < 0.35) {
          s.say("二 · a little deeper.");
          depth = 0;
        } else {
          if (depth > 1) {
            w.flaw += 0.2;
            s.say("too deep: the floor is thin now. it may crack in the kiln.");
          }
          const deep = depth > 1;
          phase = "pull";
          prof = pulled(h);
          if (!deep) say();
          else setTimeout(say, 1800);
        }
      }
      if (phase === "pull" && began === "pull" && h > 70 && !tallOnce) {
        tallOnce = true;
        w.flaw += 0.1;
        s.say("the wall is very thin up there. careful.");
      }
      grab = -1;
      redraw();
    },
  });

  say();
  draw();
}
