import {
  newGroup,
  rng,
  hash,
  piece,
  inked,
  wobblyBox,
  wobblyPolygon,
  addSolid,
  wobblyRing,
  PROFILES,
  radiusAt,
} from "../../utils/tea/ink.js";
import { K, stage, look, fit, wait, type Work } from "./stage";

const W = 1100,
  H = 380,
  Y = 300;

export function run(host: HTMLElement, w: Work, done: (w: Work) => void, back: () => void) {
  const r = rng(hash("kobo/shelf"));
  const wall = newGroup();
  inked(wall, r, wobblyBox(r, 150, 30, 950, 360, 1), K.plaster, K.ink, 1.1);
  for (let k = 0; k < 30; k++)
    addSolid(
      wall,
      wobblyRing(r, 170 + r() * 760, 50 + r() * 290, 1 + r() * 2, 0.6 + r(), 0.3, 6),
      K.plasterDk,
      0.3,
    );
  const plank = newGroup();
  inked(
    plank,
    r,
    wobblyPolygon(
      r,
      [
        [180, Y],
        [920, Y],
        [936, Y - 14],
        [196, Y - 14],
      ],
      0.5,
    ),
    K.woodLt,
    K.ink,
    1.1,
  );
  const others = newGroup();
  (["cup", "hira", "yunomi", "bowl"] as const).forEach((k, i) => {
    const x = [250, 360, 750, 860][i];
    const foot = (radiusAt(PROFILES[k].prof, 0) * 0.3 + 5) * 0.8;
    piece(others, r, x, Y - 5 - foot, 0.8, K, {
      ...PROFILES[k],
      clay: (i * 3) % 4,
      glaze: { none: true },
      fire: 20 + i,
    });
  });
  const mine = newGroup({ cls: "kobo-wet" });
  const s = fit(w.spec, 260, 240, 2.4);
  const foot = (radiusAt(w.spec.prof, 0) * 0.3 + 5) * s;
  piece(mine, rng(hash("kobo/mine")), 550, Y - 2 - foot, s, K, look(w.spec));
  const edge = newGroup();
  inked(edge, r, wobblyBox(r, 180, Y, 920, Y + 9, 0.4), K.wood, K.ink, 1);

  const st = stage(host, W, H, ["棚", "the drying shelf"], [wall, plank, others, mine, edge]);
  const wet = st.svg.querySelector<SVGGElement>(".kobo-wet")!;
  wet.style.transition = "filter 4s ease-in";
  wet.style.filter = "brightness(0.78) saturate(1.2)";

  function first() {
    st.clearUi();
    st.button("← back to the workshop", back, "quiet");
    st.say("still wet and soft. it needs a night to dry before the kiln.");
    st.button("leave it to dry", async () => {
      st.clearUi();
      wet.style.filter = "none";
      st.say("leather-hard by evening…");
      await wait(2200);
      st.say("leather-hard by evening… bone dry by morning.");
      await wait(1800);
      st.clearUi();
      st.button("carry it out to the kiln", () => done({ ...w, step: "bisque" }));
    });
    st.button(
      "take it now, still damp",
      () => done({ ...w, step: "bisque", flaw: w.flaw + 0.25 }),
      "quiet",
    );
  }
  first();
}
