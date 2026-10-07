import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const writings = await getCollection("writings");

  const writingItems = writings.map((item) => ({
    title: item.data.title,
    pubDate: item.data.pubDate,
    description: item.data.description || item.data.title,
    link: `/writings/${item.id.replace(/\.(org|md|mdx)$/, "")}/`,
  }));

  const allItems = writingItems.sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: "Szymon Wilczek",
    description: "Personal writings, essays, manifestos, and tools by Szymon Wilczek.",
    site: context.site ?? "https://sw.szymon-wilczek.me",
    items: allItems,
    customData: `<language>en-us</language>`,
  });
}
