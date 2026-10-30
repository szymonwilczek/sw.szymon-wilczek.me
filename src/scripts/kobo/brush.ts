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
import {
  clean,
  sealOf,
  PIGMENT_NAMES,
  TIP_NAMES,
  type Stroke,
  type UV,
} from "../../utils/tea/pottery";
import { earn } from "../../utils/garden";
import { keep, send } from "../../utils/tea/inbox";
import {
  tones,
  stage,
  drag,
  frame,
  look,
  fit,
  fitUnderside,
  underside,
  turnOver,
  standing,
  clamp,
  type Work,
  type Point,
} from "./stage";

const WIDTH = 1100,
  HEIGHT = 560;
const WHEEL_X = 360,
  WHEEL_Y = 500;
const DISH_AT = (index: number): Point => [
  770 + (index % 3) * 120,
  110 + Math.floor(index / 3) * 120,
];
const NAME_CARD = { x0: 700, y0: 330, x1: 1060, y1: 500 };
const UNDERSIDE_AT = { x: WHEEL_X, y: 290 };
const UNDERSIDE_ROOM = 190;
const PIGMENT_KANJI = ["呉須", "鬼板", "弁柄", "白化粧", "緑青", "黄土", "臙脂", "墨", "金彩"];
const SQUASH = 0.3;
const SIZES: [string, number][] = [
  ["fine", 0.45],
  ["medium", 1],
  ["broad", 1.7],
];

export function run(host: HTMLElement, work: Work, done: (w: Work) => void) {
  const spec = { ...work.spec, paint: [...work.spec.paint] };
  const back = () => done({ ...work, spec });
  const scale = fit(spec, 280, 360, 3.4);
  const rimRadius = spec.prof[spec.prof.length - 1][0] * scale;
  const height = spec.H * scale;
  const foot = WHEEL_Y - 12;
  const rimY = foot - height;
  const shallow = height < rimRadius * 0.45;
  const undersideSize = fitUnderside(spec, UNDERSIDE_ROOM, scale);

  const wheelRand = rng(hash("kobo/banding"));
  const base = newGroup();
  addSolid(
    base,
    wobblyRing(wheelRand, WHEEL_X + 6, WHEEL_Y + 38, 150, 22, 0.5, 14),
    tones.ink,
    0.14,
  );
  inked(
    base,
    wheelRand,
    wobblyBox(wheelRand, WHEEL_X - 24, WHEEL_Y + 8, WHEEL_X + 24, WHEEL_Y + 34, 0.4),
    tones.iron,
    tones.ink,
    1,
  );
  addSolid(
    base,
    wobblyBox(wheelRand, WHEEL_X - 130, WHEEL_Y, WHEEL_X + 130, WHEEL_Y + 8, 0.4),
    tones.ink,
    0.3,
  );
  inked(
    base,
    wheelRand,
    wobblyRing(wheelRand, WHEEL_X, WHEEL_Y, 130, 26, 0.4, 18),
    tones.iron,
    tones.ink,
    1.2,
  );
  spin(base, wheelRand, WHEEL_X, WHEEL_Y + 6, 150, 34, tones);
  const view = stage(host, WIDTH, HEIGHT, ["筆", "the brush and the seal"], [base]);

  let phase: "paint" | "sign" | "seal" = "paint";
  let turn = 0,
    pigment = 0,
    size = 1,
    tip = 0,
    steady = false,
    stroke: { pts: UV[]; c: number; w: number; d: number; t: number } | null = null,
    name = "",
    sign: [number, number][][] = [],
    penLine: [number, number][] | null = null,
    brushAt: Point | null = null,
    stamped = false,
    turningOver = false,
    stamping = false;

  // drawing point under (x, y)
  const bodyRadius = (level: number) => radiusAt(spec.prof, 1 - level) * scale;
  function uvAt([x, y]: Point): UV | null {
    if (shallow) {
      const across = (y - rimY) / (rimRadius * SQUASH * 0.78);
      if (Math.abs(across) >= 1) return null;
      const around = (x - WHEEL_X) / (Math.sqrt(1 - across * across) * rimRadius * 0.82);
      return Math.abs(around) < 0.98 ? [around, (across + 1) / 2] : null;
    }
    let level = (y - rimY) / height,
      horizontal = 0;
    for (let k = 0; k < 4; k++) {
      const radius = bodyRadius(clamp(level, 0, 1));
      horizontal = (x - WHEEL_X) / (radius * 0.97);
      if (Math.abs(horizontal) >= 0.98) return null;
      level = (y - rimY - radius * SQUASH * Math.sqrt(1 - horizontal * horizontal)) / height;
    }
    return level >= 0 && level <= 0.97 ? [horizontal, level] : null;
  }
  const wrap = (around: number) => ((((around + 2) % 4) + 4) % 4) - 2;
  const round = (value: number) => Math.round(value * 100) / 100;
  const width = (current: NonNullable<typeof stroke>) => {
    const speed = current.d / Math.max(1, performance.now() - current.t); // drawing units per ms
    const swell = steady ? 4 : clamp(7 - speed * 7, 1.2, 7);
    return round(clamp(swell * SIZES[size][1], 0.5, 12));
  };
  const laid = (current: NonNullable<typeof stroke>): Stroke => ({
    pts: current.pts,
    c: current.c,
    w: width(current),
    ...(tip ? { s: tip } : {}),
  });

  function draw() {
    const groups = [];
    if (phase === "seal")
      groups.push(
        ...underside(spec, UNDERSIDE_AT.x, UNDERSIDE_AT.y, undersideSize, turn, {
          seal: stamped ? sealOf(name) : undefined,
          turningOver,
          stamping,
        }),
      );
    else {
      const group = standing([UNDERSIDE_AT.x, UNDERSIDE_AT.y], turningOver);
      const paint: Stroke[] =
        stroke && stroke.pts.length > 1 ? [...spec.paint, laid(stroke)] : spec.paint;
      piece(
        group,
        rng(hash("kobo/mine")),
        WHEEL_X,
        foot,
        scale,
        tones,
        look({ ...spec, paint }, turn),
      );
      groups.push(group);
    }
    turningOver = stamping = false;
    const rand = rng(hash("kobo/brush"));
    const side = newGroup();
    if (phase === "paint") {
      PAINTS(tones).forEach((color: string, i: number) => {
        const [x, y] = DISH_AT(i);
        inked(
          side,
          rand,
          wobblyRing(rand, x, y, 44, 14, 0.3, 14),
          tones.paper,
          tones.ink,
          i === pigment ? 2 : 1.1,
        );
        addSolid(side, wobblyRing(rand, x - 2, y + 1, 30, 8, 0.6, 12), color, 0.95);
        kanji(side, x, y + 40, PIGMENT_KANJI[i], tones, 15);
        note(side, x, y + 60, PIGMENT_NAMES[i], tones, 13, i === pigment ? 0.9 : 0.55);
      });
      if (brushAt)
        brushTool(side, rand, brushAt[0], brushAt[1], -0.95, 150, tones, PAINTS(tones)[pigment]);
      else
        brushTool(
          side,
          rand,
          WHEEL_X + rimRadius + 40,
          rimY - 20,
          -0.95,
          150,
          tones,
          PAINTS(tones)[pigment],
        );
    } else {
      // card for the name, and seal that comes from it
      inked(
        side,
        rand,
        wobblyBox(rand, NAME_CARD.x0, NAME_CARD.y0, NAME_CARD.x1, NAME_CARD.y1, 0.8),
        tones.paper,
        tones.ink,
        1.1,
      );
      addLine(
        side,
        `M${NAME_CARD.x0 + 30} ${NAME_CARD.y1 - 40}H${NAME_CARD.x1 - 30}`,
        tones.ink,
        0.8,
        0.35,
      );
      if (!sign.length && !penLine)
        note(
          side,
          (NAME_CARD.x0 + NAME_CARD.x1) / 2,
          NAME_CARD.y1 - 60,
          "write your name here",
          tones,
          16,
          0.4,
        );
      const cardWidth = NAME_CARD.x1 - NAME_CARD.x0,
        cardHeight = NAME_CARD.y1 - NAME_CARD.y0;
      [...sign, ...(penLine ? [penLine] : [])].forEach((line) => {
        if (line.length < 2) return;
        brushStroke(
          side,
          rand,
          line.map(([across, down]) => [
            NAME_CARD.x0 + across * cardWidth,
            NAME_CARD.y0 + down * cardHeight,
          ]),
          3,
          tones.ink,
          0.88,
          { tip: 0.3, head: 0.2 },
        );
      });
      if (name) {
        const sealX = 880,
          sealY = 200;
        addSolid(
          side,
          wobblyBox(rand, sealX - 34, sealY - 34, sealX + 34, sealY + 34, 0.6),
          tones.red,
          0.88,
        );
        addText(side, {
          t: sealOf(name),
          tr: `translate(${sealX} ${sealY})`,
          fs: 44,
          font: "'Yuji Syuku', serif",
          fill: tones.paper,
        });
        note(side, sealX, sealY + 62, "your seal, for the foot", tones, 14, 0.6);
      }
    }
    groups.push(side);
    view.draw(groups);
  }
  const redraw = frame(draw);

  function say() {
    view.clearUi();
    view.button("← back to the workshop", back, "quiet");
    if (phase === "seal") {
      view.say(
        stamped ? "it carries your seal now." : "the foot takes no paint. press your seal into it.",
      );
      view.button(
        "back to the card",
        () =>
          turnOver(view, () => {
            phase = "sign";
            turningOver = true;
            say();
            redraw();
          }),
        "quiet",
      );
      view.button("↺ turn", () => ((turn = wrap(turn - 0.5)), redraw()));
      view.button("turn ↻", () => ((turn = wrap(turn + 0.5)), redraw()));
      if (stamped) view.button("put it on the shelf", give);
      else
        view.button("press the seal", () => {
          stamped = stamping = true;
          say();
          redraw();
        });
    } else if (phase === "paint") {
      view.say(
        steady
          ? "paint on it. the line keeps one width. turn the wheel to reach round the back."
          : "paint on it. slow is thick, fast is thin. turn the wheel to reach round the back.",
      );
      PAINTS(tones).forEach((_: string, i: number) =>
        view.over(PIGMENT_NAMES[i], ...DISH_AT(i), 100, 60, () => {
          pigment = i;
          redraw();
        }),
      );
      view.button("↺ turn", () => ((turn = wrap(turn - 0.5)), redraw()));
      view.button("turn ↻", () => ((turn = wrap(turn + 0.5)), redraw()));
      view.button("wipe the last stroke", () => (spec.paint.pop(), redraw()), "quiet");
      pick(
        "brush",
        SIZES.map(([label]) => label),
        size,
        (i) => (size = i),
      );
      pick("tip", TIP_NAMES, tip, (i) => (tip = i));
      pick("line", ["follows your speed", "steady"], steady ? 1 : 0, (i) => {
        steady = i === 1;
        say();
      });
      view.button("done painting", () => {
        phase = "sign";
        turn = 0;
        say();
        redraw();
      });
    } else {
      view.say("now your name. the seal comes from it; then write it by hand on the card.");
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
      view.root.querySelector(".kobo-do")!.append(label);
      view.button("write it again", () => ((sign = []), redraw()), "quiet");
      view.button("back to the brush", () => ((phase = "paint"), say(), redraw()), "quiet");
      const finish = view.button("turn it over", () =>
        turnOver(view, () => {
          phase = "seal";
          stamped = false;
          turningOver = true;
          turn = 0;
          say();
          redraw();
        }),
      );
      finish.disabled = !name;
    }
  }

  // row of choices under the drawing, one of them pressed
  function pick(title: string, labels: string[], current: number, choose: (i: number) => void) {
    const row = document.createElement("span");
    row.className = "kobo-pick hand";
    row.setAttribute("role", "group");
    row.setAttribute("aria-label", title);
    row.textContent = title;
    labels.forEach((label, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "kobo-btn";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(i === current));
      button.addEventListener("click", () => {
        row
          .querySelectorAll("button")
          .forEach((other, j) => other.setAttribute("aria-pressed", String(j === i)));
        choose(i);
        redraw();
      });
      row.append(button);
    });
    view.root.querySelector(".kobo-do")!.append(row);
  }

  async function give() {
    const made = new Date().toISOString().slice(0, 10);
    const finished = clean({ ...spec, name, sign, made });
    if (!finished) return;
    keep(finished);
    earn("陶");
    view.clearUi();
    view.say("it goes to the host, and onto the shelf in the waiting room…");
    const outcome = await send(finished, localStorage.getItem("roji:key") || "");
    const message = {
      sent: "sent. it is on your shelf now, marked 仮, until the host sets it out for everyone.",
      kept: "it is on your shelf in the waiting room, marked 仮. the host's inbox is not open yet.",
      failed: "it could not reach the host just now, but it is on your shelf, marked 仮.",
    }[outcome];
    done({ ...work, step: "done", spec });
    // room is drawn again by done()
    const line = document.querySelector(".kobo-say");
    if (line) line.textContent = message;
  }

  drag(view, {
    down(point) {
      if (phase === "seal") {
        if (point[0] > NAME_CARD.x0) return false;
        spinFrom = [point[0], turn];
        return;
      }
      if (phase === "sign") {
        if (
          point[0] < NAME_CARD.x0 ||
          point[0] > NAME_CARD.x1 ||
          point[1] < NAME_CARD.y0 ||
          point[1] > NAME_CARD.y1 ||
          sign.length >= 12
        )
          return false;
        penLine = [
          [
            round((point[0] - NAME_CARD.x0) / (NAME_CARD.x1 - NAME_CARD.x0)),
            round((point[1] - NAME_CARD.y0) / (NAME_CARD.y1 - NAME_CARD.y0)),
          ],
        ];
        return;
      }

      // drag on the wheel's rim turns it
      if (point[1] > WHEEL_Y - 4 && Math.abs(point[0] - WHEEL_X) < 150) {
        brushAt = null;
        stroke = null;
        spinFrom = [point[0], turn];
        return;
      }
      const spot = uvAt(point);
      if (!spot || spec.paint.length >= 24) return false;
      stroke = {
        pts: [[round(wrap(spot[0] - turn)), round(spot[1])]],
        c: pigment,
        w: 3,
        d: 0,
        t: performance.now(),
      };
      lastPoint = point;
      brushAt = point;
    },
    move(point) {
      if (phase === "sign") {
        if (!penLine || penLine.length >= 48) return;
        const next: [number, number] = [
          round(clamp((point[0] - NAME_CARD.x0) / (NAME_CARD.x1 - NAME_CARD.x0), 0, 1)),
          round(clamp((point[1] - NAME_CARD.y0) / (NAME_CARD.y1 - NAME_CARD.y0), 0, 1)),
        ];
        const previous = penLine[penLine.length - 1];
        if (!previous || Math.hypot(next[0] - previous[0], next[1] - previous[1]) > 0.015)
          penLine.push(next);
        redraw();
        return;
      }
      if (spinFrom) {
        turn = wrap(spinFrom[1] - (point[0] - spinFrom[0]) / (rimRadius || 100));
        redraw();
        return;
      }
      if (!stroke) return;
      brushAt = point;
      const spot = uvAt(point);
      if (spot && stroke.pts.length < 64) {
        const next: UV = [round(wrap(spot[0] - turn)), round(spot[1])];
        const previous = stroke.pts[stroke.pts.length - 1];
        if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) > 0.025) {
          stroke.pts.push(next);
          stroke.d += Math.hypot(point[0] - lastPoint[0], point[1] - lastPoint[1]);
          lastPoint = point;
        }
      }
      redraw();
    },
    up() {
      if (phase === "sign") {
        if (penLine && penLine.length > 1) sign.push(penLine);
        penLine = null;
        redraw();
        return;
      }
      spinFrom = null;
      if (stroke && stroke.pts.length > 1) spec.paint.push(laid(stroke));
      stroke = null;
      brushAt = null;
      redraw();
    },
  });
  let spinFrom: [number, number] | null = null,
    lastPoint: Point = [0, 0];

  say();
  draw();
}
