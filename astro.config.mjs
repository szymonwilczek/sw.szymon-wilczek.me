import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import org from "@orgajs/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://sw.szymon-wilczek.me",
  output: "static",
  compressHTML: true,
  build: {
    inlineStylesheets: "auto",
  },
  integrations: [sitemap(), org()],
});
