// Prints every built essay to dist/writings/<slug>.pdf with headless Chrome,
// through the site's own print stylesheet.
// Runs after `astro build`.
import { execFile } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { promisify } from "node:util";

const DIST = "dist";
const WRITINGS = join(DIST, "writings");
const CHROMES = [
  process.env.CHROME,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];
const SETTLE_MS = 5000;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff2": "font/woff2",
};

const run = promisify(execFile);

const chrome = CHROMES.find((path) => path && existsSync(path));
if (!chrome) {
  console.error("essay-pdf: no Chrome found, set CHROME to its path");
  process.exit(1);
}

const slugs = readdirSync(WRITINGS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(WRITINGS, entry.name, "index.html")))
  .map((entry) => entry.name);

const server = createServer(async (request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url, "http://x").pathname));
  const file = join(DIST, path, path.endsWith("/") ? "index.html" : "");
  try {
    const body = await readFile(file);
    response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

for (const slug of slugs) {
  const out = join(WRITINGS, `${slug}.pdf`);
  await run(chrome, [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-pdf-header-footer",
    `--virtual-time-budget=${SETTLE_MS}`,
    `--print-to-pdf=${out}`,
    `${origin}/writings/${slug}/`,
  ]);
  console.log(`essay-pdf: ${out}`);
}

server.close();
