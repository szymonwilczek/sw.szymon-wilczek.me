import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const projects = await getCollection("projects");

  const items = projects
    .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
    .map((project) => ({
      title: project.data.title,
      pubDate: project.data.pubDate,
      description: project.data.description,
      link: `/projects/${project.id}/`,
    }));

  return rss({
    title: "Szymon Wilczek",
    description:
      "Personal projects, software releases, and technical writings of Szymon Wilczek.",
    site: context.site ?? "https://sw.szymon-wilczek.me",
    items,
    customData: `<language>en-us</language>`,
  });
}
