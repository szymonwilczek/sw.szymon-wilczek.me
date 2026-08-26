import fs from "node:fs";
import path from "node:path";
import type { Loader } from "astro/loaders";

export function parseOrgMetadata(content: string) {
  const meta: Record<string, any> = {};
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#+")) {
      const match = trimmed.match(/^#\+([A-Za-z0-9_-]+):\s*(.*)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const val = match[2].trim();

        if (key === "title") meta.title = val;
        else if (key === "date") meta.date = val;
        else if (key === "pubdate") meta.pubDate = val;
        else if (key === "description") meta.description = val;
        else if (key === "category") meta.category = val;
        else if (key === "tags") meta.tags = val;
        else if (key === "status") meta.status = val;
        else if (key === "repo") meta.repo = val;
        else if (key === "location") meta.location = val;
        else if (key === "camera") meta.camera = val;
        else if (key === "lens") meta.lens = val;
        else if (key === "aperture") meta.aperture = val;
        else if (key === "shutterspeed") meta.shutterSpeed = val;
        else if (key === "iso") meta.iso = val;
        else if (key === "image") meta.image = val;
        else if (key === "alt") meta.alt = val;
        else meta[key] = val;
      }
    }
  }

  if (meta.date && !meta.pubDate) meta.pubDate = meta.date;
  if (!meta.title) meta.title = "Untitled";

  return meta;
}

export function orgContentLoader({ base }: { base: string }): Loader {
  return {
    name: "org-content-loader",
    load: async ({ store, parseData, generateDigest, watcher }) => {
      const baseDir = path.resolve(process.cwd(), base);
      if (!fs.existsSync(baseDir)) return;

      const entries = fs.readdirSync(baseDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name === ".gitkeep" || entry.name.startsWith(".")) continue;

        const fullPath = path.join(baseDir, entry.name);
        if (!entry.isFile()) continue;

        const ext = path.extname(entry.name).toLowerCase();
        const id = path.basename(entry.name, ext);
        const rawContent = fs.readFileSync(fullPath, "utf-8");

        let rawData: Record<string, any> = {};
        let body = "";

        if (ext === ".org") {
          rawData = parseOrgMetadata(rawContent);
          body = rawContent;
        } else if (ext === ".json") {
          try {
            rawData = JSON.parse(rawContent);
          } catch (e) {
            continue;
          }
          body = "";
        } else if (ext === ".md" || ext === ".mdx") {
          const fmMatch = rawContent.match(
            /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/,
          );
          if (fmMatch) {
            body = fmMatch[2];
            const lines = fmMatch[1].split("\n");
            for (const line of lines) {
              const colonIdx = line.indexOf(":");
              if (colonIdx > -1) {
                const k = line.slice(0, colonIdx).trim();
                const v = line
                  .slice(colonIdx + 1)
                  .trim()
                  .replace(/^["']|["']$/g, "");
                rawData[k] = v;
              }
            }
          } else {
            body = rawContent;
          }
        }

        const data = await parseData({ id, data: rawData });
        const digest = generateDigest(rawContent);

        store.set({
          id,
          data,
          body,
          digest,
          filePath: path.relative(process.cwd(), fullPath),
        });
      }
    },
  };
}
