const SVG_NS = "http://www.w3.org/2000/svg";
const fonts = new Map<string, Promise<string>>();

// face as a data URL
const dataOf = (url: string) => {
  if (!fonts.has(url))
    fonts.set(
      url,
      fetch(url)
        .then((response) => response.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
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
    for (const rule of list)
      if (rule instanceof CSSFontFaceRule) {
        const family = rule.style.getPropertyValue("font-family").replace(/["']/g, "").trim();
        if (families.has(family)) rules.push(rule);
      }
  }
  const faces = await Promise.all(
    rules.map(async (rule) => {
      const url = /url\(["']?([^"')]+)/.exec(rule.style.getPropertyValue("src"))?.[1];
      if (!url) return "";
      const source = await dataOf(new URL(url, location.href).href).catch(() => "");
      return source ? rule.cssText.replace(/src:[^;]+;/, `src: url("${source}");`) : "";
    }),
  );
  return faces.join("\n");
}

// CSS cubic-bezier, so the drawn circle keeps the frame's own pace
function bezier(x1: number, y1: number, x2: number, y2: number) {
  const point = (start: number, control: number, share: number) =>
    3 * start * share * (1 - share) ** 2 + 3 * control * share * share * (1 - share) + share ** 3;
  return (input: number) => {
    let low = 0,
      high = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2;
      if (point(x1, x2, mid) < input) low = mid;
      else high = mid;
    }
    return point(y1, y2, (low + high) / 2);
  };
}
const OPEN = bezier(0.2, 0.7, 0.2, 1);

export function stillOf(figure: HTMLElement) {
  const svg = figure.querySelector("svg")!;
  const sheets = () => [...figure.querySelectorAll<SVGSVGElement>(":scope > svg")];
  const holder = document.createElement("div");
  holder.className = "still";
  holder.setAttribute("aria-hidden", "true");
  const sharp = document.createElement("canvas");
  const soft = document.createElement("canvas");
  soft.className = "soft";
  const iris = document.createElement("canvas");
  iris.className = "iris";
  holder.append(sharp, soft, iris);
  let made = "";
  let making: Promise<boolean> | null = null;

  function size() {
    const viewBox = svg.viewBox.baseVal;
    const fitted = Math.min(screen.width, (screen.height * viewBox.width) / viewBox.height);
    let width = Math.max(figure.clientWidth, fitted) * devicePixelRatio;
    const maxWidth = Math.sqrt(8e6 / (viewBox.height / viewBox.width));
    width = Math.round(Math.min(width, maxWidth, 4096));
    return [width, Math.round((width * viewBox.height) / viewBox.width)];
  }

  // what the picture depends on: the drawing, its tones, its size
  function cacheKey() {
    const style = getComputedStyle(figure);
    const tones = [...figure.style]
      .filter((prop) => prop.startsWith("--"))
      .map((prop) => style.getPropertyValue(prop));
    return `${size()}|${tones}|${sheets()
      .map((sheet) => sheet.innerHTML)
      .join("")}`;
  }

  async function make(stamp: string) {
    const [width, height] = size();
    const copy = svg.cloneNode(true) as SVGSVGElement;

    for (const sheet of sheets().slice(1))
      copy.append(...[...sheet.children].map((child) => child.cloneNode(true)));

    copy.setAttribute("xmlns", SVG_NS);
    copy.setAttribute("width", String(width));
    copy.setAttribute("height", String(height));

    const computed = getComputedStyle(figure);
    const tones = [...figure.style]
      .filter((prop) => prop.startsWith("--"))
      .map((prop) => `${prop}:${computed.getPropertyValue(prop)}`)
      .join(";");

    copy.setAttribute("style", tones);

    const families = new Set<string>();
    figure.querySelectorAll(":scope > svg text").forEach((text) =>
      getComputedStyle(text)
        .fontFamily.split(",")
        .forEach((family) => families.add(family.replace(/["']/g, "").trim())),
    );

    const style = document.createElementNS(SVG_NS, "style");
    style.textContent = await facesFor(families);
    copy.prepend(style);

    const blobUrl = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml" }),
    );

    try {
      const image = new Image();
      image.src = blobUrl;
      await image.decode();

      if (cacheKey() !== stamp) return false;
      for (const canvas of [sharp, soft, iris]) [canvas.width, canvas.height] = [width, height];
      sharp.getContext("2d")!.drawImage(image, 0, 0, width, height);

      const pixelScale = (2 * width) / figure.clientWidth;
      const softCtx = soft.getContext("2d")!;
      if ("filter" in (softCtx as object)) {
        softCtx.filter = `blur(${pixelScale}px)`;
        softCtx.drawImage(sharp, 0, 0);
      } else {
        // no canvas filters: small and back up is a blur too
        const shrink = Math.max(1, pixelScale * 1.5);
        const small = new OffscreenCanvas(Math.ceil(width / shrink), Math.ceil(height / shrink));
        small.getContext("2d")!.drawImage(sharp, 0, 0, small.width, small.height);
        softCtx.drawImage(small, 0, 0, width, height);
      }
      made = stamp;
      return true;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }

  return {
    prepare(): Promise<boolean> {
      const stamp = cacheKey();
      if (made === stamp) return Promise.resolve(true);
      making ??= make(stamp)
        .catch(() => false)
        .finally(() => (making = null));
      return making;
    },
    get ready() {
      return made !== "" && made === cacheKey();
    },
    show() {
      sheets().at(-1)!.after(holder);
      figure.classList.add("stilled");
    },
    open() {
      const opening = figure
        .getAnimations()
        .find((animation) => (animation as CSSAnimation).animationName === "radio-open-still");
      if (!holder.isConnected || !opening) return;
      const [width, height] = [sharp.width, sharp.height];
      const irisCtx = iris.getContext("2d")!;
      const radius = (0.75 * Math.hypot(width, height)) / Math.SQRT2;
      const span = Number(opening.effect?.getComputedTiming().duration) || 900;
      const frame = () => {
        if (!figure.classList.contains("radio-opening")) return;
        const progress = Math.min(1, (Number(opening.currentTime) || 0) / span);
        irisCtx.clearRect(0, 0, width, height);
        irisCtx.save();
        irisCtx.beginPath();
        irisCtx.arc(width / 2, height * 0.6, radius * OPEN(progress), 0, 2 * Math.PI);
        irisCtx.clip();
        irisCtx.drawImage(sharp, 0, 0);
        irisCtx.restore();
        requestAnimationFrame(frame);
      };
      frame();
    },
    hide() {
      if (!holder.isConnected) return;
      figure.classList.remove("stilled");
      requestAnimationFrame(() => requestAnimationFrame(() => holder.remove()));
    },
  };
}
