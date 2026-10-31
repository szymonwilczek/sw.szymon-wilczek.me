import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { visit } from "unist-util-visit";

const PLACEHOLDER_WIDTH = 24;
const PLACEHOLDER_QUALITY = 40;
const RASTER = /\.(png|jpe?g|webp|avif)$/i;

const measured = new Map<string, Promise<Record<string, unknown> | null>>();

async function measure(src: string) {
  const file = path.join("public", src);
  if (!src.startsWith("/") || !RASTER.test(src) || !fs.existsSync(file)) return null;
  const image = sharp(file);
  const { width, height } = await image.metadata();
  const tiny = await image
    .resize({ width: PLACEHOLDER_WIDTH })
    .webp({ quality: PLACEHOLDER_QUALITY })
    .toBuffer();
  const placeholder = `data:image/webp;base64,${tiny.toString("base64")}`;
  return { width, height, style: `background: url(${placeholder}) center / cover` };
}

// Build only, the /org/ reader runs in the browser
export function rehypeSizedImages() {
  return async (tree: any) => {
    const images: any[] = [];
    visit(tree, "element", (node: any) => {
      if (node.tagName === "img") images.push(node);
    });
    await Promise.all(
      images.map(async (node) => {
        const { src } = node.properties;
        if (!measured.has(src)) measured.set(src, measure(src));
        Object.assign(node.properties, await measured.get(src));
      }),
    );
  };
}
