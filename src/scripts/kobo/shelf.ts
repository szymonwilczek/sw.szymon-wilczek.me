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
import { tones, stage, look, fit, wait, type Work } from "./stage";

const WIDTH = 1100,
  HEIGHT = 380,
  PLANK_Y = 300;

export function run(host: HTMLElement, work: Work, done: (w: Work) => void, back: () => void) {
  const rand = rng(hash("kobo/shelf"));
  const wall = newGroup();
  inked(wall, rand, wobblyBox(rand, 150, 30, 950, 360, 1), tones.plaster, tones.ink, 1.1);
  for (let spot = 0; spot < 30; spot++)
    addSolid(
      wall,
      wobblyRing(rand, 170 + rand() * 760, 50 + rand() * 290, 1 + rand() * 2, 0.6 + rand(), 0.3, 6),
      tones.plasterDk,
      0.3,
    );
  const plank = newGroup();
  inked(
    plank,
    rand,
    wobblyPolygon(
      rand,
      [
        [180, PLANK_Y],
        [920, PLANK_Y],
        [936, PLANK_Y - 14],
        [196, PLANK_Y - 14],
      ],
      0.5,
    ),
    tones.woodLt,
    tones.ink,
    1.1,
  );
  const others = newGroup();
  (["cup", "hira", "yunomi", "bowl"] as const).forEach((kind, i) => {
    const x = [250, 360, 750, 860][i];
    const foot = (radiusAt(PROFILES[kind].prof, 0) * 0.3 + 5) * 0.8;
    piece(others, rand, x, PLANK_Y - 5 - foot, 0.8, tones, {
      ...PROFILES[kind],
      clay: (i * 3) % 4,
      glaze: { none: true },
      fire: 20 + i,
    });
  });
  const mine = newGroup({ cls: "kobo-wet" });
  const scale = fit(work.spec, 260, 240, 2.4);
  const foot = (radiusAt(work.spec.prof, 0) * 0.3 + 5) * scale;
  piece(mine, rng(hash("kobo/mine")), 550, PLANK_Y - 2 - foot, scale, tones, look(work.spec));
  const edge = newGroup();
  inked(edge, rand, wobblyBox(rand, 180, PLANK_Y, 920, PLANK_Y + 9, 0.4), tones.wood, tones.ink, 1);

  const view = stage(
    host,
    WIDTH,
    HEIGHT,
    ["棚", "the drying shelf"],
    [wall, plank, others, mine, edge],
  );
  const wet = view.svg.querySelector<SVGGElement>(".kobo-wet")!;
  wet.style.transition = "filter 4s ease-in";
  wet.style.filter = "brightness(0.78) saturate(1.2)";

  function first() {
    view.clearUi();
    view.button("← back to the workshop", back, "quiet");
    view.say("still wet and soft. it needs a night to dry before the kiln.");
    view.button("leave it to dry", async () => {
      view.clearUi();
      wet.style.filter = "none";
      view.say("leather-hard by evening…");
      await wait(2200);
      view.say("leather-hard by evening… bone dry by morning.");
      await wait(1800);
      view.clearUi();
      view.button("carry it out to the kiln", () => done({ ...work, step: "bisque" }));
    });
    view.button(
      "take it now, still damp",
      () => done({ ...work, step: "bisque", flaw: work.flaw + 0.25 }),
      "quiet",
    );
  }
  first();
}
