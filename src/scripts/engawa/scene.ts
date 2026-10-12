import { sceneEngawa, toSvg, tones2 } from "../../utils/tea/ink.js";
import { skyOf, type Season } from "../../utils/engawa/sky";

export interface View {
  hour: number;
  season: Season;
  hourSet: number | null;
  seasonSet: Season | null;
  incense: { burnt: number; lit: boolean } | null;
}

export function sceneOf(svg: SVGSVGElement) {
  const view: View = { hour: 0, season: "aki", hourSet: null, seasonSet: null, incense: null };
  const listeners: ((v: View) => void)[] = [];

  function draw() {
    const sky = skyOf(new Date());
    view.hour = view.hourSet ?? sky.hour;
    view.season = view.seasonSet ?? sky.season;
    const sun = view.seasonSet ? undefined : (sky.sun ?? undefined);
    const inc = view.incense;
    const out = sceneEngawa(tones2(), view.hour, false, view.season, {
      sun,
      burnt: inc ? inc.burnt : 0,
      unlit: !inc?.lit,
    });
    svg.innerHTML = toSvg(out, true);
    listeners.forEach((f) => f(view));
  }

  draw();
  setInterval(draw, 60_000);
  return {
    view,
    draw,
    on: (f: (v: View) => void) => listeners.push(f),
  };
}
