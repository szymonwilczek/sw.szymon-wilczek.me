import { sceneEngawa, toSvg, tones2 } from "../../utils/tea/ink.js";
import { skyOf, type Season } from "../../utils/engawa/sky";

export interface View {
  hour: number;
  season: Season;
  hourSet: number | null;
  seasonSet: Season | null;
  incense: { burnt: number; lit: boolean } | null;
  lamp: number | null;
}

function split(markup: string) {
  const out: string[] = [];
  const re = /<(\/?)\w+[^>]*?(\/?)>/g;
  let depth = 0,
    start = 0,
    m: RegExpExecArray | null;
  while ((m = re.exec(markup))) {
    if (m[1]) {
      if (--depth === 0) out.push(markup.slice(start, re.lastIndex));
    } else if (!m[2]) {
      if (depth++ === 0) start = m.index;
    } else if (depth === 0) out.push(m[0]);
  }
  return out;
}

const inner = (el: string) => el.slice(el.indexOf(">") + 1, el.lastIndexOf("<"));
const head = (el: string) => el.slice(0, el.indexOf(">"));

function parse(markup: string) {
  const box = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  box.innerHTML = markup;
  return box.firstElementChild!;
}

function patcher(svg: SVGSVGElement) {
  let last: { el: string; subs: string[] }[] = [];
  return (markup: string) => {
    const top = split(markup);
    if (top.length !== last.length || svg.children.length !== last.length) {
      svg.innerHTML = markup;
      last = top.map((el) => ({ el, subs: split(inner(el)) }));
      return;
    }
    top.forEach((el, i) => {
      const was = last[i];
      if (el === was.el) return;
      const node = svg.children[i];
      const subs = split(inner(el));
      if (
        head(el) !== head(was.el) ||
        subs.length !== was.subs.length ||
        node.children.length !== subs.length
      )
        node.replaceWith(parse(el));
      else subs.forEach((s, j) => s !== was.subs[j] && node.children[j].replaceWith(parse(s)));
      last[i] = { el, subs };
    });
  };
}

export function sceneOf(svg: SVGSVGElement) {
  const view: View = {
    hour: 0,
    season: "aki",
    hourSet: null,
    seasonSet: null,
    incense: null,
    lamp: null,
  };
  const listeners: ((v: View) => void)[] = [];
  const patch = patcher(svg);

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
      lamp: view.lamp ?? undefined,
    });
    patch(toSvg(out, true));
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
