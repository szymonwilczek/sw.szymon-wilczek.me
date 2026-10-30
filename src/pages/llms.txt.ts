import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { PROJECTS } from "../utils/projects";
import { getAllAlbums } from "../utils/albums";
import { writingSlug } from "../utils/format";

const PAGES: Array<[string, string, string]> = [
  ["About", "/about/", "Who the author is, and the work they do now."],
  ["CV", "/cv/", "Education, upstream work, experience and certificates; as a PDF too."],
  ["Projects", "/projects/", "Every open-source project with its language and repository."],
  ["Writings", "/writings/", "All essays, newest first, filterable by tag."],
  ["Photographs", "/photos/", "Photo albums from trips, each with EXIF data and SHA-256 sums."],
  ["Bookshelf", "/books/", "Books read, one shelf per year, and what is being read now."],
  ["Uses", "/uses/", "Hardware, software and tools used day to day."],
  ["Links", "/links/", "The author's other sites and the small sites recommended here."],
  [
    "Research",
    "/research/",
    "Patches merged upstream and issues resolved there, each patch with its message, versions and diff.",
  ],
  ["Contact", "/contact/", "E-mail and the GPG public key with its fingerprint."],
];

const OPTIONAL: Array<[string, string, string]> = [
  ["Map", "/map/", "An illustrated map linking every page of the site."],
  ["Changelog", "/changelog/", "The site's history: commits per week since the first one."],
  [
    "Roji",
    "/roji/",
    "Interactive tea garden: visitors shape pottery; approved pieces join a shelf.",
  ],
  ["Seal book", "/seals/", "Collectible seals earned by exploring the site."],
  ["Credits", "/credits/", "Fonts, music and open-source acknowledgements."],
];

const line = (siteUrl: string, [name, path, note]: [string, string, string]) =>
  `- [${name}](${siteUrl}${path}): ${note}`;

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site!.origin;

  const writings = (await getCollection("writings")).sort(
    (former, latter) => latter.data.pubDate.valueOf() - former.data.pubDate.valueOf(),
  );
  const albums = await getAllAlbums();

  const essays = writings.map((post) => {
    const slug = writingSlug(post.id);
    const date = post.data.pubDate.toISOString().split("T")[0];
    const desc = post.data.description ? ` ${post.data.description}` : "";
    const tags = post.data.tags.length > 0 ? ` Tags: ${post.data.tags.join(", ")}.` : "";
    return `- [${post.data.title}](${siteUrl}/writings/${slug}/): ${date}, ${post.data.category}.${desc}${tags} Org source: ${siteUrl}/writings/${slug}.org`;
  });

  const projects = PROJECTS.map(
    (project) =>
      `- [${project.title}](${project.url}): ${project.excerpt.replace(/([^.!?])$/, "$1.")} ${project.language}, since ${project.date.slice(0, 7)}.`,
  );

  const photos = albums.map(
    (album) =>
      `- [${album.title}](${siteUrl}/photos/${album.slug}/): ${album.photoCount} photographs, ${album.dateFormatted}.`,
  );

  const content = `# Szymon Wilczek

> Personal website of Szymon Wilczek, a software engineer from Poland working on low-level systems: Linux kernel patches, C tools for Linux, GNU Emacs. It holds his essays, open-source projects, CV, photographs, books, and a few interactive pages, all drawn in a hand-inked Japanese garden style.

Szymon studies Computer Science (B.Sc. Eng.) at the Silesian University of Technology in Gliwice and works as a software architect. He sends filesystem fixes to the Linux kernel and writes Linux utilities in C, such as LOTA and alloyctl. Essays are written in Org mode; every essay is also served as its raw .org file.

- Website: ${siteUrl}/
- GitHub: https://github.com/szymonwilczek
- E-mail: swilczek.lx@gmail.com (GPG key at ${siteUrl}/szymon-wilczek.asc)

## Pages

${PAGES.map((page) => line(siteUrl, page)).join("\n")}

## Writings

${essays.join("\n") || "- No essays published yet."}

## Projects

${projects.join("\n")}

## Feeds

- [Full text of all essays](${siteUrl}/llms-full.txt): every essay in one plain-text file.
- [RSS](${siteUrl}/rss.xml): new essays.
- [Sitemap](${siteUrl}/sitemap-index.xml): every indexable URL with its last change.

## Optional

${OPTIONAL.map((page) => line(siteUrl, page)).join("\n")}
${photos.join("\n")}

Not for indexing: /vault/ holds encrypted private documents.
`;

  return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
