import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { PROJECTS } from "../utils/projects";
import { getAllAlbums } from "../utils/albums";
import { writingSlug } from "../utils/format";

const PAGES: Array<[string, string, string]> = [
  ["About", "/about/", "Biography, background, editors, and upstream contributions."],
  [
    "The years so far",
    "/path/",
    "CV as a timeline: studies, work, certificates, kernel patches; CV as a PDF.",
  ],
  ["Projects", "/projects/", "Every open-source project with its language and repository."],
  ["Writings", "/writings/", "All essays, newest first, filterable by tag."],
  ["Photographs", "/photos/", "Photo albums from trips, each with EXIF data and SHA-256 sums."],
  ["Bookshelf", "/books/", "Books read, one shelf per year, and what is being read now."],
  ["Uses", "/uses/", "Hardware, software and tools used day to day."],
  ["Links", "/links/", "The author's other sites and the small sites recommended here."],
  ["Files", "/files/", "Downloadable utilities and archives, each with its SHA-256."],
  ["Verify a file", "/files/verify/", "In-browser SHA-256 check of a downloaded file."],
  ["Contact", "/contact/", "E-mail and the GPG public key with its fingerprint."],
];

const OPTIONAL: Array<[string, string, string]> = [
  ["Map", "/map/", "An illustrated map linking every page of the site."],
  ["Seeds", "/seeds/", "Essays planned but not yet written, with their stage."],
  ["Changelog", "/changelog/", "The site's history: commits per week since the first one."],
  [
    "Roji",
    "/roji/",
    "Interactive tea garden: visitors shape pottery; approved pieces join a shelf.",
  ],
  ["Engawa", "/engawa/", "A focus timer (incense), a record player and a lo-fi radio."],
  ["Seal book", "/seals/", "Collectible seals earned by exploring the site."],
  ["Credits", "/credits/", "Fonts, music and open-source acknowledgements."],
];

const line = (siteUrl: string, [name, path, note]: [string, string, string]) =>
  `- [${name}](${siteUrl}${path}): ${note}`;

export const GET: APIRoute = async ({ site }) => {
  const siteUrl = site!.origin;

  const writings = (await getCollection("writings")).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
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
    (p) =>
      `- [${p.title}](${p.url}): ${p.excerpt.replace(/([^.!?])$/, "$1.")} ${p.language}, since ${p.date.slice(0, 7)}.`,
  );

  const photos = albums.map(
    (a) =>
      `- [${a.title}](${siteUrl}/photos/${a.slug}/): ${a.photoCount} photographs, ${a.dateFormatted}.`,
  );

  const content = `# Szymon Wilczek

> Personal website of Szymon Wilczek, a software engineer from Poland working on low-level systems: Linux kernel patches, C tools for Linux, GNU Emacs. It holds his essays, open-source projects, CV, photographs, books, and a few interactive pages, all drawn in a hand-inked Japanese garden style.

Szymon studies Computer Science (B.Sc. Eng.) at the Silesian University of Technology in Gliwice and works as a software architect. He sends filesystem fixes to the Linux kernel and writes Linux utilities in C, such as LOTA and alloyctl. Essays are written in Org mode; every essay is also served as its raw .org file.

- Website: ${siteUrl}/
- GitHub: https://github.com/szymonwilczek
- E-mail: swilczek.lx@gmail.com (GPG key at ${siteUrl}/szymon-wilczek.asc)

## Pages

${PAGES.map((p) => line(siteUrl, p)).join("\n")}

## Writings

${essays.join("\n") || "- No essays published yet."}

## Projects

${projects.join("\n")}

## Feeds

- [Full text of all essays](${siteUrl}/llms-full.txt): every essay in one plain-text file.
- [RSS](${siteUrl}/rss.xml): new essays.
- [Sitemap](${siteUrl}/sitemap-index.xml): every indexable URL with its last change.

## Optional

${OPTIONAL.map((p) => line(siteUrl, p)).join("\n")}
${photos.join("\n")}

Not for indexing: /vault/ holds encrypted private documents.
`;

  return new Response(content, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
