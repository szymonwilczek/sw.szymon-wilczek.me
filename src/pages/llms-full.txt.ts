import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site ? site.toString().replace(/\/$/, "") : "https://sw.szymon-wilczek.me";

  let writings = [];
  try {
    writings = (await getCollection("writings")).sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    );
  } catch {}

  let content = `# Szymon Wilczek - Complete Content Corpus

> This file contains the complete full-text corpus of technical writings, essays, and architectural reflections published on sw.szymon-wilczek.me by Szymon Wilczek.

---
`;

  for (const post of writings) {
    const slug = post.id.replace(/\.(org|md|mdx)$/, "");
    const title = post.data.title;
    const desc = post.data.description || "";
    const date = post.data.pubDate ? post.data.pubDate.toISOString().split("T")[0] : "";
    const category = post.data.category || "Essay";
    const tags = post.data.tags ? post.data.tags.join(", ") : "";
    const htmlUrl = `${siteUrl}/writings/${slug}/`;
    const body = post.body || "";

    content += `
================================================================================
ARTICLE: ${title}
URL: ${htmlUrl}
DATE: ${date}
CATEGORY: ${category}
TAGS: ${tags}
DESCRIPTION: ${desc}
================================================================================

${body.trim()}

`;
  }

  return new Response(content.trim() + "\n");
};
