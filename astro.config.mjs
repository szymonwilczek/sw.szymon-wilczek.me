import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import org from "@orgajs/astro";

// https://astro.build/config
export default defineConfig({
  site: "https://sw.szymon-wilczek.me",
  output: "static",
  integrations: [sitemap(), org()],
});
