import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
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

const SITE = "https://sw.szymon-wilczek.me";

const DATA = {
  "/": ["src/content/writings", "public/images"],
  "/writings/": ["src/content/writings"],
  "/photos/": ["public/images"],
  "/photos/bookmarks/": ["public/images"],
  "/projects/": ["src/data/projects.json"],
  "/books/": ["src/data/books.org"],
  "/seeds/": ["src/data/seeds.org"],
  "/uses/": ["src/data/uses.ts", "src/utils/dogu.ts"],
  "/links/": ["src/data/links.ts"],
  "/path/": ["src/data/years.ts"],
  "/roji/": ["src/data/pieces.json"],
};

function sourcesOf(pathname) {
  const writing = pathname.match(/^\/writings\/([^/]+)\/$/);
  if (writing) return [`src/content/writings/${writing[1]}.org`];
  const album = pathname.match(/^\/photos\/([^/]+)\/$/);
  if (album && album[1] !== "bookmarks") return [`public/images/${album[1]}`];
  const page = pathname === "/" ? "index" : pathname.slice(1, -1);
  return [`src/pages/${page}.astro`, `src/pages/${page}/index.astro`, ...(DATA[pathname] ?? [])];
}

// lastmod is the last commit that touched the page or its data,
// so a crawler only comes back for what changed
function lastmod(pathname) {
  try {
    const date = execFileSync("git", ["log", "-1", "--format=%cI", "--", ...sourcesOf(pathname)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return date || undefined;
  } catch {
    return undefined;
  }
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
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
        !page.endsWith(".org") &&
        !page.endsWith(".asc"),
      changefreq: "weekly",
      priority: 0.7,
      serialize(item) {
        if (item.url === `${SITE}/`) {
          item.priority = 1.0;
          item.changefreq = "daily";
        } else if (item.url.includes("/writings/")) {
          item.priority = 0.9;
          item.changefreq = "monthly";
        } else if (item.url.includes("/photos/")) {
          item.priority = 0.7;
          item.changefreq = "monthly";
        } else if (/\/(about|contact|projects)\/$/.test(item.url)) {
          item.priority = 0.8;
          item.changefreq = "monthly";
        }
        item.lastmod = lastmod(new URL(item.url).pathname);
        return item;
      },
    }),
  ],
});
