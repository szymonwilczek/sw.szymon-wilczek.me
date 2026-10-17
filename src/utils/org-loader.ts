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
        const value = match[2].trim();

        if (key === "title") meta.title = value;
        else if (key === "date") meta.date = value;
        else if (key === "pubdate") meta.pubDate = value;
        else if (key === "updated") meta.updatedDate = value;
        else if (key === "description") meta.description = value;
        else if (key === "category") meta.category = value;
        else if (key === "tags") meta.tags = value;
        else if (key === "status") meta.status = value;
        else if (key === "repo") meta.repo = value;
        else if (key === "location") meta.location = value;
        else if (key === "camera") meta.camera = value;
        else if (key === "lens") meta.lens = value;
        else if (key === "aperture") meta.aperture = value;
        else if (key === "shutterspeed") meta.shutterSpeed = value;
        else if (key === "iso") meta.iso = value;
        else if (key === "image") meta.image = value;
        else if (key === "alt") meta.alt = value;
        else meta[key] = value;
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

      async function syncFile(fullPath: string) {
        if (!fs.existsSync(fullPath)) return;
        const filename = path.basename(fullPath);
        if (filename === ".gitkeep" || filename.startsWith(".")) return;
        const extension = path.extname(filename).toLowerCase();
        if (![".org", ".json", ".md", ".mdx"].includes(extension)) return;
        const id = path.basename(filename, extension);
        const rawContent = fs.readFileSync(fullPath, "utf-8");

        let rawData: Record<string, any> = {};
        let body = "";

        if (extension === ".org") {
          rawData = parseOrgMetadata(rawContent);
          body = rawContent;
        } else if (extension === ".json") {
          try {
            rawData = JSON.parse(rawContent);
          } catch {
            return;
          }
          body = "";
        } else if (extension === ".md" || extension === ".mdx") {
          const frontmatterMatch = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
          if (frontmatterMatch) {
            body = frontmatterMatch[2];
            const lines = frontmatterMatch[1].split("\n");
            for (const line of lines) {
              const colonIndex = line.indexOf(":");
              if (colonIndex > -1) {
                const key = line.slice(0, colonIndex).trim();
                const value = line
                  .slice(colonIndex + 1)
                  .trim()
                  .replace(/^["']|["']$/g, "");
                rawData[key] = value;
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

      async function syncAll() {
        const entries = fs.readdirSync(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile()) {
            await syncFile(path.join(baseDir, entry.name));
          }
        }
      }

      await syncAll();

      if (watcher) {
        watcher.on("change", async (changedPath: string) => {
          if (changedPath.startsWith(baseDir)) {
            await syncFile(changedPath);
          }
        });
        watcher.on("add", async (addedPath: string) => {
          if (addedPath.startsWith(baseDir)) {
            await syncFile(addedPath);
          }
        });
        watcher.on("unlink", (deletedPath: string) => {
          if (deletedPath.startsWith(baseDir)) {
            const filename = path.basename(deletedPath);
            const extension = path.extname(filename).toLowerCase();
            const id = path.basename(filename, extension);
            store.delete(id);
          }
        });
      }
    },
  };
}
