import {
  G,
  rng,
  hash,
  piece,
  bucket,
  tongs,
  note,
  kan,
  GLAZES,
  GLAZE_NAMES,
} from "../../utils/tea/ink.js";
import { K, stage, drag, frame, look, fit, clamp, markup, type Work, type P } from "./stage";

const W = 1100,
  H = 520;
const BX = 550,
  BY = 470,
  BS = 3,
  SURFACE = BY - 36 * BS + 1;
const KANJI = ["天目", "志野", "飴", "青磁", "瑠璃", "織部", "朱"];

export function run(host: HTMLElement, w: Work, done: (w: Work) => void, back: () => void) {
  const st = stage(
    host,
    W,
    H,
    ["釉", "the glazes"],
    [],
    `<clipPath id="kobo-above"><rect width="${W}" height="${SURFACE}"/></clipPath>`,
  );
  const spec = w.spec;
  let phase: "choose" | "dip" | "drip" = "choose";
  let c = 0,
    sink = 0, // how far the piece is pushed down, in drawing units
    dip = 0,
    drips: [number, number, number][] = [],
    growing = -1;
  const ps = fit(spec, 200, 210, 2.2);
  const big = fit(spec, 320, 300, 3.2);
  const rest = SURFACE - 40; // where the rim hangs before the dip

  function draw() {
    const r = rng(hash("kobo/glaze"));
    const groups = [];
    if (phase === "choose") {
      const g = G();
      GLAZES(K).forEach((col: string, i: number) => {
        const x = 110 + i * 147;
        bucket(g, r, x, 290, 1.7, K, col);
        note(g, x, 342, GLAZE_NAMES[i], K, 16, 0.75);
        kan(g, x, 372, KANJI[i], K, 15);
      });
      groups.push(g);
    } else if (phase === "dip") {
      const b = G();
      bucket(b, r, BX, BY, BS, K, GLAZES(K)[c]);
      groups.push(b);
      const hs = spec.H * ps,
        rim = rest + sink,
        mid = rim - hs / 2;
      const flip = G({ tf: `rotate(180deg)`, to: `${BX}px ${Math.round(mid)}px` });
      piece(
        flip,
        rng(hash("kobo/mine")),
        BX,
        rim,
        ps,
        K,
        look({ ...spec, glaze: dip > 0 ? { c, dip, drips: [] } : null }),
      );
      flip.solid.shift(); // its shadow, which would hang in the air

      // clip stays upright outside the turned piece
      const t = G();
      tongs(t, r, BX, rim - hs - 2, K);
      st.live.innerHTML =
        markup(groups) + `<g clip-path="url(#kobo-above)">${markup([flip])}</g>` + markup([t]);
      return;
    } else {
      const g = G();
      piece(
        g,
        rng(hash("kobo/mine")),
        BX,
        440,
        big,
        K,
        look({ ...spec, glaze: { c, dip, drips } }),
      );
      groups.push(g);
    }
    st.draw(groups);
  }
  const redraw = frame(draw);

  function say() {
    st.clearUi();
    st.button("← back to the workshop", back, "quiet");
    if (phase === "choose") {
      st.say("choose a glaze. each comes out of the kiln its own way.");
      GLAZES(K).forEach((_: string, i: number) =>
        st.over(`${GLAZE_NAMES[i]} glaze`, 110 + i * 147, 290, 120, 140, () => {
          c = i;
          phase = "dip";
          say();
          redraw();
        }),
      );
    } else if (phase === "dip") {
      st.say(`${GLAZE_NAMES[c]}. drag the piece down into the bucket; let go to lift it out.`);
      st.button(
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
      st.say("hold your finger on the piece where you want the glaze to run.");
      st.button(
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
      st.button("into the kiln", () =>
        done({
          ...w,
          step: "fire",
          spec: {
            ...spec,
            glaze: {
              c,
              dip: round(dip),
              drips: drips.map((d) => d.map(round) as [number, number, number]),
            },
          },
        }),
      );
    }
  }

  // drip being held grows until the finger lifts
  let last = 0;
  function grow(t: number) {
    if (growing < 0 || !st.root.isConnected) return;
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
    last = t;
    const d = drips[growing];
    d[1] = clamp(d[1] + dt * 0.2, 0, 0.4);
    draw();
    requestAnimationFrame(grow);
  }

  let from: P = [0, 0];
  drag(st, {
    down(p) {
      from = p;
      if (phase === "choose") return false;
      if (phase === "drip") {
        const rw = Math.max(...spec.prof.map(([r]) => r)) * big;
        const u = (p[0] - BX) / rw;
        if (Math.abs(u) > 1 || p[1] < 440 - spec.H * big - 30 || p[1] > 460) return false;
        if (drips.length >= 6) {
          st.say("that is plenty of drips.");
          return false;
        }
        drips.push([clamp(u, -0.95, 0.95), 0.02, 0.06 + Math.random() * 0.04]);
        growing = drips.length - 1;
        last = 0;
        requestAnimationFrame(grow);
      }
    },
    move(p) {
      if (phase !== "dip") return;
      sink = clamp(p[1] - from[1], 0, spec.H * ps + 40);
      dip = Math.max(dip, clamp((rest + sink - SURFACE) / (spec.H * ps), 0, 1));
      redraw();
    },
    up() {
      if (phase === "drip") growing = -1;
      if (phase !== "dip") return;
      sink = 0;
      if (dip < 0.05) {
        st.say("deeper: it has to go into the glaze.");
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

const round = (x: number) => Math.round(x * 100) / 100;
