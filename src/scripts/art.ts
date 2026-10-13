// Fills an empty frame from its drawing under /art/ (see utils/art.ts):
// the paths come in from a cached file, the frame keeps its own size and label.
const cache = new Map<string, Promise<Element>>();

export async function fillArt(svg: SVGSVGElement) {
  const artUrl = svg.dataset.art!;
  if (!cache.has(artUrl))
    cache.set(
      artUrl,
      fetch(artUrl, { priority: "low" })
        .then((response) => response.text())
        .then((text) => new DOMParser().parseFromString(text, "image/svg+xml").documentElement),
    );
  const art = await cache.get(artUrl)!;
  for (const { name, value } of art.attributes)
    if (name.startsWith("data-")) svg.setAttribute(name, value);
  svg.replaceChildren(...[...art.childNodes].map((node) => document.importNode(node, true)));
}
