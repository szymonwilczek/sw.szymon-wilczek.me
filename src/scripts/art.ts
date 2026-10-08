// Fills an empty frame from its drawing under /art/ (see utils/art.ts):
// the paths come in from a cached file, the frame keeps its own size and label.
const cache = new Map<string, Promise<Element>>();

export async function fillArt(svg: SVGSVGElement) {
  const url = svg.dataset.art!;
  if (!cache.has(url))
    cache.set(
      url,
      fetch(url)
        .then((r) => r.text())
        .then((t) => new DOMParser().parseFromString(t, "image/svg+xml").documentElement),
    );
  const art = await cache.get(url)!;
  for (const { name, value } of art.attributes)
    if (name.startsWith("data-")) svg.setAttribute(name, value);
  svg.replaceChildren(...[...art.childNodes].map((n) => document.importNode(n, true)));
}
