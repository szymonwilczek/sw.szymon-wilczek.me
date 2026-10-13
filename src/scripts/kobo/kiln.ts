import {
  newGroup,
  rng,
  hash,
  piece,
  chamber,
  heatBar,
  addSolid,
  wobblyRing,
  addWash,
  PROFILES,
  groupSvg,
  note,
} from "../../utils/tea/ink.js";
import { tones, stage, drag, look, fit, clamp, wait, type Work } from "./stage";

const WIDTH = 1100,
  HEIGHT = 470;
const CENTER_X = 400,
  CENTER_Y = 400,
  HEAT_BAR = { x: 720, y: 250, w: 300 };

export function run(host: HTMLElement, work: Work, done: (w: Work) => void, back: () => void) {
  const glaze = work.step === "fire";
  const band = glaze ? { lo: 0.62, hi: 0.85, secs: 10 } : { lo: 0.5, hi: 0.75, secs: 8 };
  const scale = fit(work.spec, 170, 170, 2.2);
  const words = newGroup();
  note(words, HEAT_BAR.x + 20, HEAT_BAR.y + 28, "cold", tones, 14, 0.6);
  note(
    words,
    HEAT_BAR.x + HEAT_BAR.w * ((band.lo + band.hi) / 2),
    HEAT_BAR.y - 34,
    "keep it here",
    tones,
    15,
    0.7,
  );
  note(words, HEAT_BAR.x + HEAT_BAR.w - 26, HEAT_BAR.y + 28, "too hot", tones, 14, 0.6);
  note(
    words,
    HEAT_BAR.x + HEAT_BAR.w / 2,
    HEAT_BAR.y + 72,
    "how far the firing has come",
    tones,
    14,
    0.6,
  );
  const view = stage(
    host,
    WIDTH,
    HEIGHT,
    ["窯", glaze ? "the glaze firing" : "the first firing"],
    [words],
  );

  let heat = 0.12,
    progress = 0,
    hotTime = 0,
    lit = false,
    over = false,
    heatStep = -1,
    lastTime = performance.now(),
    flash = 0;

  // chamber is redrawn only when the heat changes colour
  let chamberSvg = "";
  function draw() {
    const step = heat < 0.3 ? 0 : heat < 0.55 ? 1 : heat < 0.8 ? 2 : 3;
    if (step !== heatStep) {
      heatStep = step;
      const rand = rng(hash("kobo/kiln"));
      const group = newGroup();
      chamber(group, rand, CENTER_X, CENTER_Y, 380, 290, tones, heatStep);
      const others = [
        { ...PROFILES.cup, clay: 3 },
        { ...PROFILES.hira, clay: 0 },
      ];
      piece(group, rand, CENTER_X - 152, CENTER_Y - 2, 0.6, tones, {
        ...others[0],
        glaze: glaze ? { c: 4, dip: 0.6 } : { none: true },
        fire: 5,
      });
      piece(group, rand, CENTER_X + 150, CENTER_Y - 2, 0.5, tones, {
        ...others[1],
        glaze: glaze ? { c: 2, dip: 0.7 } : { none: true },
        fire: 6,
      });
      piece(group, rng(hash("kobo/mine")), CENTER_X, CENTER_Y - 6, scale, tones, look(work.spec));
      chamberSvg = groupSvg(group);
    }
    const barRand = rng(hash("kobo/bar"));
    const bar = newGroup();
    heatBar(bar, barRand, HEAT_BAR.x, HEAT_BAR.y, HEAT_BAR.w, tones, heat, band.lo, band.hi);

    // how much of the firing is done
    addSolid(
      bar,
      `M${HEAT_BAR.x} ${HEAT_BAR.y + 50}h${Math.round(HEAT_BAR.w * progress)}v4h-${Math.round(HEAT_BAR.w * progress)}z`,
      tones.ink,
      0.6,
    );
    if (flash > 0)
      addWash(
        bar,
        barRand,
        wobblyRing(barRand, CENTER_X, CENTER_Y - 30, 120, 70, 6, 12),
        tones.gold,
        flash * 0.5,
        "url(#bk-bleed)",
      );
    view.live.innerHTML = chamberSvg + groupSvg(bar);
  }

  function stoke() {
    if (over) return;
    if (!lit) {
      lit = true;
      view.say("keep the heat inside the band. too hot and the kiln takes its toll.");
      requestAnimationFrame(tick);
    }
    heat = clamp(heat + 0.08, 0, 1);
    flash = 1;
  }

  function tick(time: number) {
    if (!view.root.isConnected || over) return;
    const elapsed = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    heat = clamp(heat - elapsed * 0.06, 0.05, 1);
    flash = Math.max(0, flash - elapsed * 3);
    if (heat >= band.lo) progress = clamp(progress + elapsed / band.secs, 0, 1);
    if (heat > band.hi) hotTime += elapsed;
    draw();
    if (progress >= 1) finish();
    else requestAnimationFrame(tick);
  }

  async function finish() {
    over = true;
    view.clearUi();
    view.say("enough. the fire is left to die and the kiln to cool…");
    await wait(2400);
    if (!glaze) {
      heatStep = -1;
      heat = 0.05;
      draw();
      view.say(
        hotTime > 1.5
          ? "it ran hot, but the clay held. pale and hard now; it rings when you tap it."
          : "pale and hard now; it rings when you tap it.",
      );
      view.button("take it to the glazes", () =>
        done({ ...work, step: "glaze", flaw: work.flaw + Math.min(0.2, hotTime * 0.04) }),
      );
      return;
    }

    // what the kiln decided
    const roll = Math.random;
    const flaw = work.flaw + Math.min(0.3, hotTime * 0.05);
    const cracked = roll() < 0.06 + Math.min(0.6, flaw);
    const spec = { ...work.spec, fire: 1 + Math.floor(roll() * 999_999) };
    if (spec.glaze && hotTime > 1)
      spec.glaze = {
        ...spec.glaze,
        drips: spec.glaze.drips.map(([at, length, width]) => [
          at,
          Math.min(0.4, length * (1.2 + roll() * 0.3)),
          width,
        ]),
      };
    if (cracked) {
      let crackX = (roll() - 0.5) * 1.2;
      spec.kin = [0, 0.15 + roll() * 0.1, 0.3 + roll() * 0.15, 0.45 + roll() * 0.2].map((level) => {
        const point: [number, number] = [
          Math.round(crackX * 100) / 100,
          Math.round(level * 100) / 100,
        ];
        crackX += (roll() - 0.5) * 0.25;
        return point;
      });
    }
    const fired = { ...work, spec, step: "brush" as const, flaw };
    work.spec = spec;
    heatStep = -1;
    heat = 0.05;
    draw();
    view.say(
      cracked
        ? "it cracked in the kiln. the crack is mended with lacquer and gold: kintsugi."
        : hotTime > 1
          ? "it ran hot: the glaze ran further than you left it. the kiln decided the rest."
          : "out of the kiln. the glaze came out as only this firing could make it.",
    );
    view.button("take it to the brush", () => done(fired));
  }

  view.button("← back to the workshop", back, "quiet");
  view.button("throw in wood", stoke);
  view.say("tap the kiln, or press throw in wood, to light it.");
  drag(view, { down: () => (stoke(), false) });
  draw();
}
