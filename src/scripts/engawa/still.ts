const ns = "http://www.w3.org/2000/svg";
const fonts = new Map<string, Promise<string>>();

// face as a data URL
const dataOf = (url: string) => {
  if (!fonts.has(url))
    fonts.set(
      url,
      fetch(url)
        .then((r) => r.blob())
        .then(
          (b) =>
            new Promise<string>((ok) => {
              const fr = new FileReader();
              fr.onload = () => ok(fr.result as string);
              fr.readAsDataURL(b);
            }),
        ),
    );
  return fonts.get(url)!;
};

// @font-face rules of the families the drawing writes in
async function facesFor(families: Set<string>) {
  const rules: CSSFontFaceRule[] = [];
  for (const sheet of document.styleSheets) {
    let list: CSSRuleList;
    try {
      list = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of list)
      if (r instanceof CSSFontFaceRule) {
        const fam = r.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
        if (families.has(fam)) rules.push(r);
      }
  }
  const css = await Promise.all(
    rules.map(async (r) => {
      const url = /url\(["']?([^"')]+)/.exec(r.style.getPropertyValue("src"))?.[1];
      if (!url) return "";
      const src = await dataOf(new URL(url, location.href).href).catch(() => "");
      return src ? r.cssText.replace(/src:[^;]+;/, `src: url("${src}");`) : "";
    }),
  );
  return css.join("\n");
}

// CSS cubic-bezier, so the drawn circle keeps the frame's own pace
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const at = (a: number, b: number, t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x: number) => {
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 24; i++) {
      const t = (lo + hi) / 2;
      if (at(x1, x2, t) < x) lo = t;
      else hi = t;
    }
    return at(y1, y2, (lo + hi) / 2);
  };
}
const OPEN = bezier(0.2, 0.7, 0.2, 1);

export function stillOf(fig: HTMLElement) {
  const svg = fig.querySelector("svg")!;
  const sheets = () => [...fig.querySelectorAll<SVGSVGElement>(":scope > svg")];
  const box = document.createElement("div");
  box.className = "still";
  box.setAttribute("aria-hidden", "true");
  const sharp = document.createElement("canvas");
  const soft = document.createElement("canvas");
  soft.className = "soft";
  const iris = document.createElement("canvas");
  iris.className = "iris";
  box.append(sharp, soft, iris);
  let made = "";
  let making: Promise<boolean> | null = null;

  function size() {
    const vb = svg.viewBox.baseVal;
    const fit = Math.min(screen.width, (screen.height * vb.width) / vb.height);
    let w = Math.max(fig.clientWidth, fit) * devicePixelRatio;
    const cap = Math.sqrt(8e6 / (vb.height / vb.width));
    w = Math.round(Math.min(w, cap, 4096));
    return [w, Math.round((w * vb.height) / vb.width)];
  }

  // what the picture depends on: the drawing, its tones, its size
  function key() {
    const css = getComputedStyle(fig);
    const tones = [...fig.style]
      .filter((p) => p.startsWith("--"))
      .map((p) => css.getPropertyValue(p));
    return `${size()}|${tones}|${sheets()
      .map((s) => s.innerHTML)
      .join("")}`;
  }

  async function make(k: string) {
    const [w, h] = size();
    const copy = svg.cloneNode(true) as SVGSVGElement;

    for (const s of sheets().slice(1))
      copy.append(...[...s.children].map((c) => c.cloneNode(true)));

    copy.setAttribute("xmlns", ns);
    copy.setAttribute("width", String(w));
    copy.setAttribute("height", String(h));

    const css = getComputedStyle(fig);
    const tones = [...fig.style]
      .filter((p) => p.startsWith("--"))
      .map((p) => `${p}:${css.getPropertyValue(p)}`)
      .join(";");

    copy.setAttribute("style", tones);

    const families = new Set<string>();
    fig.querySelectorAll(":scope > svg text").forEach((t) =>
      getComputedStyle(t)
        .fontFamily.split(",")
        .forEach((f) => families.add(f.replace(/["']/g, "").trim())),
    );

    const style = document.createElementNS(ns, "style");
    style.textContent = await facesFor(families);
    copy.prepend(style);

    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }),
    );

    try {
      const img = new Image();
      img.src = url;
      await img.decode();

      if (key() !== k) return false;
      for (const c of [sharp, soft, iris]) [c.width, c.height] = [w, h];
      sharp.getContext("2d")!.drawImage(img, 0, 0, w, h);

      const px = (2 * w) / fig.clientWidth;
      const ctx = soft.getContext("2d")!;
      if ("filter" in (ctx as object)) {
        ctx.filter = `blur(${px}px)`;
        ctx.drawImage(sharp, 0, 0);
      } else {
        // no canvas filters: small and back up is a blur too
        const s = Math.max(1, px * 1.5);
        const tmp = new OffscreenCanvas(Math.ceil(w / s), Math.ceil(h / s));
        tmp.getContext("2d")!.drawImage(sharp, 0, 0, tmp.width, tmp.height);
        ctx.drawImage(tmp, 0, 0, w, h);
      }
      made = k;
      return true;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  return {
    prepare(): Promise<boolean> {
      const k = key();
      if (made === k) return Promise.resolve(true);
      making ??= make(k)
        .catch(() => false)
        .finally(() => (making = null));
      return making;
    },
    get ready() {
      return made !== "" && made === key();
    },
    show() {
      sheets().at(-1)!.after(box);
      fig.classList.add("stilled");
    },
    open() {
      const a = fig
        .getAnimations()
        .find((x) => (x as CSSAnimation).animationName === "radio-open-still");
      if (!box.isConnected || !a) return;
      const [w, h] = [sharp.width, sharp.height];
      const ctx = iris.getContext("2d")!;
      const r = (0.75 * Math.hypot(w, h)) / Math.SQRT2;
      const span = Number(a.effect?.getComputedTiming().duration) || 900;
      const frame = () => {
        if (!fig.classList.contains("radio-opening")) return;
        const t = Math.min(1, (Number(a.currentTime) || 0) / span);
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath();
        ctx.arc(w / 2, h * 0.6, r * OPEN(t), 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(sharp, 0, 0);
        ctx.restore();
        requestAnimationFrame(frame);
      };
      frame();
    },
    hide() {
      if (!box.isConnected) return;
      fig.classList.remove("stilled");
      requestAnimationFrame(() => requestAnimationFrame(() => box.remove()));
    },
  };
}
