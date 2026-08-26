import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const projects = await getCollection("projects");
  const writings = await getCollection("writings");

  const projectItems = projects.map((item) => ({
    title: `[Project] ${item.data.title}`,
    pubDate: item.data.pubDate,
    description: item.data.description,
    link: `/projects/${item.id.replace(/\.(org|md|mdx)$/, "")}/`,
  }));

  const writingItems = writings.map((item) => ({
    title: item.data.title,
    pubDate: item.data.pubDate,
    description: item.data.description || item.data.title,
    link: `/writings/${item.id.replace(/\.(org|md|mdx)$/, "")}/`,
  }));

  const allItems = [...projectItems, ...writingItems].sort(
    (a, b) => b.pubDate.valueOf() - a.pubDate.valueOf()
  );

  return rss({
    title: "Szymon Wilczek",
    description:
      "Personal writings, essays, manifestos, software projects, and tools by Szymon Wilczek.",
    site: context.site ?? "https://sw.szymon-wilczek.me",
    items: allItems,
    customData: `<language>en-us</language>`,
  });
}
