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

  let projects = [];
  try {
    projects = (await getCollection("projects")).sort(
      (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
    );
  } catch {}

  let content = `# Szymon Wilczek

> Personal hypermedia space, software engineering archive, custom developer utilities, typography, photography, and plain-text essays by Szymon Wilczek.

## About the Author

- Name: Szymon Wilczek
- Role: Software Engineer & Systems Explorer
- Core Focus: Low-Level Programming, Systems Architecture, GNU Emacs, Typography & Type Design, Linux, C
- Website: ${siteUrl}/
- Portfolio: https://szymon-wilczek.me/
- GitHub: https://github.com/szymonwilczek
- Biographical Profile: ${siteUrl}/about/

## Published Writings & Essays

`;

  if (writings.length > 0) {
    for (const post of writings) {
      const slug = post.id.replace(/\.(org|md|mdx)$/, "");
      const title = post.data.title;
      const desc = post.data.description || "";
      const date = post.data.pubDate ? post.data.pubDate.toISOString().split("T")[0] : "";
      const category = post.data.category ? ` [${post.data.category}]` : "";
      const tags =
        post.data.tags && post.data.tags.length > 0 ? ` (Tags: ${post.data.tags.join(", ")})` : "";
      const htmlUrl = `${siteUrl}/writings/${slug}/`;
      const rawUrl = `${siteUrl}/writings/${slug}.org`;

      content += `- [${title}](${htmlUrl}): ${desc}${category}${tags} · Published: ${date} · Plain text: ${rawUrl}\n`;
    }
  } else {
    content += `*No published writings available yet.*\n`;
  }

  if (projects.length > 0) {
    content += `\n## Software Projects & Tools\n\n`;
    for (const proj of projects) {
      const slug = proj.id.replace(/\.(org|md|mdx)$/, "");
      const title = proj.data.title;
      const desc = proj.data.description || "";
      const htmlUrl = `${siteUrl}/projects/${slug}/`;
      content += `- [${title}](${htmlUrl}): ${desc}\n`;
    }
  }

  content += `
## Direct Plain-Text Feeds & Context

- [Full Content Archive for LLMs](${siteUrl}/llms-full.txt): Complete concatenated full-text dump of all published essays and writings.
- [RSS XML Feed](${siteUrl}/rss.xml): Standard RSS syndication feed for new articles and projects.
- [XML Sitemap](${siteUrl}/sitemap-index.xml): Full URL hierarchy for search and index crawlers.

## Excluded Sections

- Private Cryptographic Vault: Strictly confidential documents stored in /vault/ are encrypted and excluded from LLM training and indexing.
`;

  return new Response(content.trim() + "\n");
};
