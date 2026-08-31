import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

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
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes("/vault") &&
        !page.includes("/404") &&
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
        } else if (item.url.includes("/projects/")) {
          item.priority = 0.8;
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
