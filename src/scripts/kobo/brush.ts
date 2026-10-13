import {
  newGroup,
  rng,
  hash,
  piece,
  inked,
  wobblyBox,
  wobblyRing,
  addSolid,
  addLine,
  brushStroke,
  addText,
  kanji,
  note,
  spin,
  brushTool,
  radiusAt,
  PAINTS,
} from "../../utils/tea/ink.js";
import { clean, sealOf, PIGMENT_NAMES, type Stroke, type UV } from "../../utils/tea/pottery";
import { keep, send } from "../../utils/tea/inbox";
import { K, stage, drag, frame, look, fit, clamp, type Work, type P } from "./stage";

const W = 1100,
  H = 560;
const BX = 360,
  BY = 500;
const DISH = (i: number): P => [800 + (i % 2) * 150, 110 + Math.floor(i / 2) * 120];
const CARD = { x0: 700, y0: 330, x1: 1060, y1: 500 };
const KAN = ["呉須", "鬼板", "弁柄", "白化粧"];
const EL = 0.3;

export function run(host: HTMLElement, w: Work, done: (w: Work) => void) {
  const spec = { ...w.spec, paint: [...w.spec.paint] };
  const back = () => done({ ...w, spec });
  const s = fit(spec, 280, 360, 3.4);
  const rw = spec.prof[spec.prof.length - 1][0] * s;
  const h = spec.H * s;
  const foot = BY - 12;
  const top = foot - h;
  const shallow = h < rw * 0.45;

  const r0 = rng(hash("kobo/banding"));
  const base = newGroup();
  addSolid(base, wobblyRing(r0, BX + 6, BY + 38, 150, 22, 0.5, 14), K.ink, 0.14);
  inked(base, r0, wobblyBox(r0, BX - 24, BY + 8, BX + 24, BY + 34, 0.4), K.iron, K.ink, 1);
  addSolid(base, wobblyBox(r0, BX - 130, BY, BX + 130, BY + 8, 0.4), K.ink, 0.3);
  inked(base, r0, wobblyRing(r0, BX, BY, 130, 26, 0.4, 18), K.iron, K.ink, 1.2);
  spin(base, r0, BX, BY + 6, 150, 34, K);
  const st = stage(host, W, H, ["筆", "the brush and the seal"], [base]);

  let phase: "paint" | "sign" = "paint";
  let turn = 0,
    ink = 0,
    stroke: { pts: UV[]; c: number; w: number; d: number; t: number } | null = null,
    name = "",
    sign: [number, number][][] = [],
    pen: [number, number][] | null = null,
    at: P | null = null;

  // drawing point under (x, y)
  const R = (v: number) => radiusAt(spec.prof, 1 - v) * s;
  function uvAt([x, y]: P): UV | null {
    if (shallow) {
      const yy = (y - top) / (rw * EL * 0.78);
      if (Math.abs(yy) >= 1) return null;
      const u = (x - BX) / (Math.sqrt(1 - yy * yy) * rw * 0.82);
      return Math.abs(u) < 0.98 ? [u, (yy + 1) / 2] : null;
    }
    let v = (y - top) / h,
      u = 0;
    for (let k = 0; k < 4; k++) {
      const rr = R(clamp(v, 0, 1));
      u = (x - BX) / (rr * 0.97);
      if (Math.abs(u) >= 0.98) return null;
      v = (y - top - rr * EL * Math.sqrt(1 - u * u)) / h;
    }
    return v >= 0 && v <= 0.97 ? [u, v] : null;
  }
  const wrap = (u: number) => ((((u + 2) % 4) + 4) % 4) - 2;
  const round = (x: number) => Math.round(x * 100) / 100;
  const width = (st: NonNullable<typeof stroke>) => {
    const speed = st.d / Math.max(1, performance.now() - st.t); // drawing units per ms
    return round(clamp(7 - speed * 7, 1.2, 7));
  };

  function draw() {
    const groups = [];
    const g = newGroup();
    const paint: Stroke[] =
      stroke && stroke.pts.length > 1
        ? [...spec.paint, { pts: stroke.pts, c: stroke.c, w: width(stroke) }]
        : spec.paint;
    piece(
      g,
      rng(hash("kobo/mine")),
      BX,
      foot,
      s,
      K,
      look({ ...spec, paint }, turn, phase === "sign"),
    );
    groups.push(g);
    const r = rng(hash("kobo/brush"));
    const side = newGroup();
    if (phase === "paint") {
      PAINTS(K).forEach((c: string, i: number) => {
        const [x, y] = DISH(i);
        inked(side, r, wobblyRing(r, x, y, 44, 14, 0.3, 14), K.paper, K.ink, i === ink ? 2 : 1.1);
        addSolid(side, wobblyRing(r, x - 2, y + 1, 30, 8, 0.6, 12), c, 0.95);
        kanji(side, x, y + 40, KAN[i], K, 15);
        note(side, x, y + 60, PIGMENT_NAMES[i], K, 13, i === ink ? 0.9 : 0.55);
      });
      if (at) brushTool(side, r, at[0], at[1], -0.95, 150, K, PAINTS(K)[ink]);
      else brushTool(side, r, BX + rw + 40, top - 20, -0.95, 150, K, PAINTS(K)[ink]);
    } else {
      // card for the name, and seal that comes from it
      inked(side, r, wobblyBox(r, CARD.x0, CARD.y0, CARD.x1, CARD.y1, 0.8), K.paper, K.ink, 1.1);
      addLine(side, `M${CARD.x0 + 30} ${CARD.y1 - 40}H${CARD.x1 - 30}`, K.ink, 0.8, 0.35);
      if (!sign.length && !pen)
        note(side, (CARD.x0 + CARD.x1) / 2, CARD.y1 - 60, "write your name here", K, 16, 0.4);
      const bw = CARD.x1 - CARD.x0,
        bh = CARD.y1 - CARD.y0;
      [...sign, ...(pen ? [pen] : [])].forEach((line) => {
        if (line.length < 2) return;
        brushStroke(
          side,
          r,
          line.map(([u, v]) => [CARD.x0 + u * bw, CARD.y0 + v * bh]),
          3,
          K.ink,
          0.88,
          { tip: 0.3, head: 0.2 },
        );
      });
      if (name) {
        const sx = 880,
          sy = 200;
        addSolid(side, wobblyBox(r, sx - 34, sy - 34, sx + 34, sy + 34, 0.6), K.red, 0.88);
        addText(side, {
          t: sealOf(name),
          tr: `translate(${sx} ${sy})`,
          fs: 44,
          font: "'Yuji Syuku', serif",
          fill: K.paper,
        });
        note(side, sx, sy + 62, "your seal, pressed on the foot", K, 14, 0.6);
      }
    }
    groups.push(side);
    st.draw(groups);
  }
  const redraw = frame(draw);

  function say() {
    st.clearUi();
    st.button("← back to the workshop", back, "quiet");
    if (phase === "paint") {
      st.say("paint on it. slow is thick, fast is thin. turn the wheel to reach round the back.");
      PAINTS(K).forEach((_: string, i: number) =>
        st.over(PIGMENT_NAMES[i], ...DISH(i), 100, 60, () => {
          ink = i;
          redraw();
        }),
      );
      st.button("↺ turn", () => ((turn = wrap(turn - 0.5)), redraw()));
      st.button("turn ↻", () => ((turn = wrap(turn + 0.5)), redraw()));
      st.button("wipe the last stroke", () => (spec.paint.pop(), redraw()), "quiet");
      st.button("done painting", () => {
        phase = "sign";
        turn = 0;
        say();
        redraw();
      });
    } else {
      st.say("now your name. the seal comes from it; then write it by hand on the card.");
      const label = document.createElement("label");
      label.className = "kobo-name hand";
      label.innerHTML = `name <input maxlength="24" autocomplete="nickname" spellcheck="false" />`;
      const input = label.querySelector("input")!;
      input.value = name;
      input.addEventListener("input", () => {
        name = input.value.replace(/[\p{C}<>&"]/gu, "").trim();
        finish.disabled = !name;
        redraw();
      });
      st.root.querySelector(".kobo-do")!.append(label);
      st.button("write it again", () => ((sign = []), redraw()), "quiet");
      st.button("back to the brush", () => ((phase = "paint"), say(), redraw()), "quiet");
      const finish = st.button("put it on the shelf", give);
      finish.disabled = !name;
    }
  }

  async function give() {
    const made = new Date().toISOString().slice(0, 10);
    const piece = clean({ ...spec, name, sign, made });
    if (!piece) return;
    keep(piece);
    st.clearUi();
    st.say("it goes to the host, and onto the shelf in the waiting room…");
    const how = await send(piece, localStorage.getItem("roji:key") || "");
    const said = {
      sent: "sent. it is on your shelf now, marked 仮, until the host sets it out for everyone.",
      kept: "it is on your shelf in the waiting room, marked 仮. the host's inbox is not open yet.",
      failed: "it could not reach the host just now, but it is on your shelf, marked 仮.",
    }[how];
    done({ ...w, step: "done", spec });
    // room is drawn again by done()
    const line = document.querySelector(".kobo-say");
    if (line) line.textContent = said;
  }

  drag(st, {
    down(p) {
      if (phase === "sign") {
        if (
          p[0] < CARD.x0 ||
          p[0] > CARD.x1 ||
          p[1] < CARD.y0 ||
          p[1] > CARD.y1 ||
          sign.length >= 12
        )
          return false;
        pen = [
          [
            round((p[0] - CARD.x0) / (CARD.x1 - CARD.x0)),
            round((p[1] - CARD.y0) / (CARD.y1 - CARD.y0)),
          ],
        ];
        return;
      }

      // drag on the wheel's rim turns it
      if (p[1] > BY - 4 && Math.abs(p[0] - BX) < 150) {
        at = null;
        stroke = null;
        spinFrom = [p[0], turn];
        return;
      }
      const uv = uvAt(p);
      if (!uv || spec.paint.length >= 24) return false;
      stroke = {
        pts: [[round(wrap(uv[0] - turn)), round(uv[1])]],
        c: ink,
        w: 3,
        d: 0,
        t: performance.now(),
      };
      last = p;
      at = p;
    },
    move(p) {
      if (phase === "sign") {
        if (!pen || pen.length >= 48) return;
        const q: [number, number] = [
          round(clamp((p[0] - CARD.x0) / (CARD.x1 - CARD.x0), 0, 1)),
          round(clamp((p[1] - CARD.y0) / (CARD.y1 - CARD.y0), 0, 1)),
        ];
        const l = pen[pen.length - 1];
        if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.015) pen.push(q);
        redraw();
        return;
      }
      if (spinFrom) {
        turn = wrap(spinFrom[1] - (p[0] - spinFrom[0]) / (rw || 100));
        redraw();
        return;
      }
      if (!stroke) return;
      at = p;
      const uv = uvAt(p);
      if (uv && stroke.pts.length < 64) {
        const q: UV = [round(wrap(uv[0] - turn)), round(uv[1])];
        const l = stroke.pts[stroke.pts.length - 1];
        if (Math.hypot(q[0] - l[0], q[1] - l[1]) > 0.025) {
          stroke.pts.push(q);
          stroke.d += Math.hypot(p[0] - last[0], p[1] - last[1]);
          last = p;
        }
      }
      redraw();
    },
    up() {
      if (phase === "sign") {
        if (pen && pen.length > 1) sign.push(pen);
        pen = null;
        redraw();
        return;
      }
      spinFrom = null;
      if (stroke && stroke.pts.length > 1)
        spec.paint.push({ pts: stroke.pts, c: stroke.c, w: width(stroke) });
      stroke = null;
      at = null;
      redraw();
    },
  });
  let spinFrom: [number, number] | null = null,
    last: P = [0, 0];

  say();
  draw();
}
