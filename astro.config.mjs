import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://sw.szymon-wilczek.me",
  output: "static",
  compressHTML: true,
  devToolbar: {
    enabled: false,
  },
  build: {
    inlineStylesheets: "auto",
  },
  integrations: [sitemap()],
});
