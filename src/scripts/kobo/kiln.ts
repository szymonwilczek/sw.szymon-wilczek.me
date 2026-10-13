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
import { K, stage, drag, look, fit, clamp, wait, type Work } from "./stage";

const W = 1100,
  H = 470;
const CX = 400,
  CY = 400,
  BAR = { x: 720, y: 250, w: 300 };

export function run(host: HTMLElement, w: Work, done: (w: Work) => void, back: () => void) {
  const glaze = w.step === "fire";
  const band = glaze ? { lo: 0.62, hi: 0.85, secs: 10 } : { lo: 0.5, hi: 0.75, secs: 8 };
  const s = fit(w.spec, 170, 170, 2.2);
  const words = newGroup();
  note(words, BAR.x + 20, BAR.y + 28, "cold", K, 14, 0.6);
  note(words, BAR.x + BAR.w * ((band.lo + band.hi) / 2), BAR.y - 34, "keep it here", K, 15, 0.7);
  note(words, BAR.x + BAR.w - 26, BAR.y + 28, "too hot", K, 14, 0.6);
  note(words, BAR.x + BAR.w / 2, BAR.y + 72, "how far the firing has come", K, 14, 0.6);
  const st = stage(host, W, H, ["窯", glaze ? "the glaze firing" : "the first firing"], [words]);

  let T = 0.12,
    p = 0,
    hot = 0,
    lit = false,
    over = false,
    bin = -1,
    last = performance.now(),
    flash = 0;

  // chamber is redrawn only when the heat changes colour
  let room = "";
  function draw() {
    const nb = T < 0.3 ? 0 : T < 0.55 ? 1 : T < 0.8 ? 2 : 3;
    if (nb !== bin) {
      bin = nb;
      const r = rng(hash("kobo/kiln"));
      const g = newGroup();
      chamber(g, r, CX, CY, 380, 290, K, bin);
      const others = [
        { ...PROFILES.cup, clay: 3 },
        { ...PROFILES.hira, clay: 0 },
      ];
      piece(g, r, CX - 152, CY - 2, 0.6, K, {
        ...others[0],
        glaze: glaze ? { c: 4, dip: 0.6 } : { none: true },
        fire: 5,
      });
      piece(g, r, CX + 150, CY - 2, 0.5, K, {
        ...others[1],
        glaze: glaze ? { c: 2, dip: 0.7 } : { none: true },
        fire: 6,
      });
      piece(g, rng(hash("kobo/mine")), CX, CY - 6, s, K, look(w.spec));
      room = groupSvg(g);
    }
    const r = rng(hash("kobo/bar"));
    const b = newGroup();
    heatBar(b, r, BAR.x, BAR.y, BAR.w, K, T, band.lo, band.hi);

    // how much of the firing is done
    addSolid(
      b,
      `M${BAR.x} ${BAR.y + 50}h${Math.round(BAR.w * p)}v4h-${Math.round(BAR.w * p)}z`,
      K.ink,
      0.6,
    );
    if (flash > 0)
      addWash(
        b,
        r,
        wobblyRing(r, CX, CY - 30, 120, 70, 6, 12),
        K.gold,
        flash * 0.5,
        "url(#bk-bleed)",
      );
    st.live.innerHTML = room + groupSvg(b);
  }

  function stoke() {
    if (over) return;
    if (!lit) {
      lit = true;
      st.say("keep the heat inside the band. too hot and the kiln takes its toll.");
      requestAnimationFrame(tick);
    }
    T = clamp(T + 0.08, 0, 1);
    flash = 1;
  }

  function tick(t: number) {
    if (!st.root.isConnected || over) return;
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    T = clamp(T - dt * 0.06, 0.05, 1);
    flash = Math.max(0, flash - dt * 3);
    if (T >= band.lo) p = clamp(p + dt / band.secs, 0, 1);
    if (T > band.hi) hot += dt;
    draw();
    if (p >= 1) finish();
    else requestAnimationFrame(tick);
  }

  async function finish() {
    over = true;
    st.clearUi();
    st.say("enough. the fire is left to die and the kiln to cool…");
    await wait(2400);
    if (!glaze) {
      bin = -1;
      T = 0.05;
      draw();
      st.say(
        hot > 1.5
          ? "it ran hot, but the clay held. pale and hard now; it rings when you tap it."
          : "pale and hard now; it rings when you tap it.",
      );
      st.button("take it to the glazes", () =>
        done({ ...w, step: "glaze", flaw: w.flaw + Math.min(0.2, hot * 0.04) }),
      );
      return;
    }

    // what the kiln decided
    const q = Math.random;
    const flaw = w.flaw + Math.min(0.3, hot * 0.05);
    const cracked = q() < 0.06 + Math.min(0.6, flaw);
    const spec = { ...w.spec, fire: 1 + Math.floor(q() * 999_999) };
    if (spec.glaze && hot > 1)
      spec.glaze = {
        ...spec.glaze,
        drips: spec.glaze.drips.map(([u, l, wd]) => [u, Math.min(0.4, l * (1.2 + q() * 0.3)), wd]),
      };
    if (cracked) {
      let u = (q() - 0.5) * 1.2;
      spec.kin = [0, 0.15 + q() * 0.1, 0.3 + q() * 0.15, 0.45 + q() * 0.2].map((v) => {
        const at: [number, number] = [Math.round(u * 100) / 100, Math.round(v * 100) / 100];
        u += (q() - 0.5) * 0.25;
        return at;
      });
    }
    const out = { ...w, spec, step: "brush" as const, flaw };
    w.spec = spec;
    bin = -1;
    T = 0.05;
    draw();
    st.say(
      cracked
        ? "it cracked in the kiln. the crack is mended with lacquer and gold: kintsugi."
        : hot > 1
          ? "it ran hot: the glaze ran further than you left it. the kiln decided the rest."
          : "out of the kiln. the glaze came out as only this firing could make it.",
    );
    st.button("take it to the brush", () => done(out));
  }

  st.button("← back to the workshop", back, "quiet");
  st.button("throw in wood", stoke);
  st.say("tap the kiln, or press throw in wood, to light it.");
  drag(st, { down: () => (stoke(), false) });
  draw();
}
