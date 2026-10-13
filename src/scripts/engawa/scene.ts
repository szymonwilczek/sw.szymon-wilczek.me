import { sceneEngawa, toSvg, toneVars } from "../../utils/tea/ink.js";
import { skyOf, type Season } from "../../utils/engawa/sky";

export interface View {
  hour: number;
  season: Season;
  hourSet: number | null;
  seasonSet: Season | null;
  incense: { burnt: number; lit: boolean } | null;
  lamp: number | null;
  disc: number;
  lifted: number | null;
}

function split(markup: string) {
  const parts: string[] = [];
  const tag = /<(\/?)\w+[^>]*?(\/?)>/g;
  let depth = 0,
    start = 0,
    match: RegExpExecArray | null;
  while ((match = tag.exec(markup))) {
    if (match[1]) {
      if (--depth === 0) parts.push(markup.slice(start, tag.lastIndex));
    } else if (!match[2]) {
      if (depth++ === 0) start = match.index;
    } else if (depth === 0) parts.push(match[0]);
  }
  return parts;
}

const inner = (element: string) =>
  element.slice(element.indexOf(">") + 1, element.lastIndexOf("<"));
const head = (element: string) => element.slice(0, element.indexOf(">"));

function parse(markup: string) {
  const parser = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  parser.innerHTML = markup;
  return parser.firstElementChild!;
}

function patcher(svg: SVGSVGElement) {
  let last: { el: string; subs: string[] }[] = [];
  return (markup: string) => {
    const layers = split(markup);
    if (layers.length !== last.length || svg.children.length !== last.length) {
      svg.innerHTML = markup;
      last = layers.map((element) => ({ el: element, subs: split(inner(element)) }));
      return;
    }
    layers.forEach((element, i) => {
      const previous = last[i];
      if (element === previous.el) return;
      const node = svg.children[i];
      const subs = split(inner(element));
      if (
        head(element) !== head(previous.el) ||
        subs.length !== previous.subs.length ||
        node.children.length !== subs.length
      )
        node.replaceWith(parse(element));
      else
        subs.forEach(
          (sub, index) =>
            sub !== previous.subs[index] && node.children[index].replaceWith(parse(sub)),
        );
      last[i] = { el: element, subs };
    });
  };
}

// drawing as sheets laid one over another, each its own <svg>
function layered(svg: SVGSVGElement) {
  const sheets: { svg: SVGSVGElement; patch: (markup: string) => void }[] = [];
  let kinds = "";
  const kind = (element: string) =>
    / data-still/.test(head(element)) ? "s" : /animation:/.test(head(element)) ? "m" : "c";
  return (markup: string) => {
    const runs: { kind: string; els: string[] }[] = [];
    split(markup).forEach((element) => {
      const layerKind = element.startsWith("<defs") ? "c" : kind(element);
      if (runs.at(-1)?.kind === layerKind) runs.at(-1)!.els.push(element);
      else runs.push({ kind: layerKind, els: [element] });
    });
    const pattern = runs.map((run) => run.kind).join("");
    if (pattern !== kinds) {
      kinds = pattern;
      sheets.splice(0).forEach((sheet, i) => i && sheet.svg.remove());
      runs.forEach((run, i) => {
        let host = svg;
        if (i) {
          host = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          host.setAttribute("viewBox", svg.getAttribute("viewBox")!);
          host.setAttribute("class", "sheet");
          host.setAttribute("aria-hidden", "true");
          if (run.kind === "s") host.setAttribute("data-still", "");
          sheets[i - 1].svg.after(host);
        }
        sheets.push({ svg: host, patch: patcher(host) });
      });
    }
    runs.forEach((run, i) => sheets[i].patch(run.els.join("")));
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
    disc: Number(localStorage.getItem("engawa:disc")) || 0,
    lifted: null,
  };
  const listeners: ((current: View) => void)[] = [];
  const patch = layered(svg);

  function draw() {
    const skyNow = skyOf(new Date());
    view.hour = view.hourSet ?? skyNow.hour;
    view.season = view.seasonSet ?? skyNow.season;
    const sunTimes = view.seasonSet ? undefined : (skyNow.sun ?? undefined);
    const incense = view.incense;
    const drawn = sceneEngawa(toneVars(), view.hour, false, view.season, {
      sun: sunTimes,
      burnt: incense ? incense.burnt : 0,
      unlit: !incense?.lit,
      lamp: view.lamp ?? undefined,
      disc: view.disc,
      lifted: view.lifted ?? undefined,
    });
    patch(toSvg(drawn, true));
    listeners.forEach((listener) => listener(view));
  }

  draw();
  setInterval(draw, 60_000);
  return {
    view,
    draw,
    on: (listener: (current: View) => void) => listeners.push(listener),
  };
}
