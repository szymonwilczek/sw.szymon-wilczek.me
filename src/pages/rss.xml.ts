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
    categories: [item.data.category, ...item.data.tags],
    author: "swilczek.lx@gmail.com (Szymon Wilczek)",
  }));

  const allItems = writingItems.sort(
    (former, latter) => latter.pubDate.valueOf() - former.pubDate.valueOf(),
  );

  return rss({
    title: "Szymon Wilczek",
    description:
      "Essays by Szymon Wilczek on low-level computing, Linux, Emacs, typography and the philosophy of software.",
    site: context.site!,
    items: allItems,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    customData: `<language>en</language><atom:link href="${new URL("/rss.xml", context.site)}" rel="self" type="application/rss+xml"/>`,
  });
}
