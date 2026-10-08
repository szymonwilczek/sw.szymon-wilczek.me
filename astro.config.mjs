import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const preloadGarden = {
  name: "preload-garden",
  hooks: {
    "astro:build:done": async ({ dir }) => {
      const root = fileURLToPath(dir);
      const chunk = (await readdir(join(root, "_astro"))).find((f) => /^garden\..*\.js$/.test(f));
      if (!chunk) return;
      const link = `<link rel="modulepreload" href="/_astro/${chunk}">`;
      const files = (await readdir(root, { recursive: true })).filter((f) => f.endsWith(".html"));
      for (const f of files) {
        const html = await readFile(join(root, f), "utf8");
        if (!html.includes('<script type="module"')) continue;
        await writeFile(join(root, f), html.replace("</head>", `${link}</head>`));
      }
    },
  },
};

// https://astro.build/config
export default defineConfig({
  site: "https://sw.szymon-wilczek.me",
  output: "static",
  trailingSlash: "always",
  compressHTML: true,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  devToolbar: {
    enabled: false,
  },
  build: {
    inlineStylesheets: "always",
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (/\/src\/(utils\/(garden|sand|hanko)|scripts\/art)\.ts$/.test(id)) return "garden";
          },
        },
      },
    },
  },
  integrations: [
    preloadGarden,
    sitemap({
      filter: (page) =>
        !page.includes("/vault") &&
        !page.includes("/404") &&
        !page.includes("/map/") &&
        !page.endsWith(".org") &&
        !page.endsWith(".asc"),
      changefreq: "weekly",
      priority: 0.7,
      serialize(item) {
        if (item.url === "https://sw.szymon-wilczek.me/") {
          item.priority = 1.0;
          item.changefreq = "daily";
        } else if (item.url.includes("/writings/")) {
          item.priority = 0.9;
          item.changefreq = "monthly";
        } else if (item.url.includes("/photos/")) {
          item.priority = 0.7;
          item.changefreq = "monthly";
        } else if (item.url.includes("/about/") || item.url.includes("/contact/")) {
          item.priority = 0.8;
          item.changefreq = "monthly";
        }
        return item;
      },
    }),
  ],
});
