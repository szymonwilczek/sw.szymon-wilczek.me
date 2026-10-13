// JSON-LD nodes for pages that list things.
// SEO.astro joins them into the page's graph

import type { CollectionEntry } from "astro:content";
import type { PhotoAlbum, PhotoItem } from "./albums";
import type { Project } from "./projects";
import { repoPath } from "./projects";
import { writingSlug } from "./format";

type Node = Record<string, unknown>;

function itemList(page: URL, name: string, items: Node[]): Node {
  return {
    "@type": "ItemList",
    "@id": `${page.href}#list`,
    name,
    numberOfItems: items.length,
    mainEntityOfPage: { "@id": `${page.href}#webpage` },
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, item })),
  };
}

export function writingsList(page: URL, posts: CollectionEntry<"writings">[]): Node {
  return itemList(
    page,
    "Writings",
    posts.map((post) => {
      const url = new URL(`/writings/${writingSlug(post.id)}/`, page).href;
      return {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        url,
        headline: post.data.title,
        description: post.data.description || undefined,
        datePublished: post.data.pubDate.toISOString(),
        author: { "@id": new URL("/#identity", page).href },
      };
    }),
  );
}

export function projectsList(page: URL, projects: Project[]): Node {
  return itemList(
    page,
    "Projects",
    projects.map((p) => ({
      "@type": "SoftwareSourceCode",
      name: p.title,
      description: p.excerpt,
      url: p.url,
      ...(repoPath(p.url).site ? {} : { codeRepository: p.url }),
      programmingLanguage: p.language,
      dateCreated: p.date,
      author: { "@id": new URL("/#identity", page).href },
    })),
  );
}

export function albumsList(page: URL, albums: PhotoAlbum[]): Node {
  return itemList(
    page,
    "Photographs",
    albums.map((album) => ({
      "@type": "ImageGallery",
      name: album.title,
      url: new URL(`/photos/${album.slug}/`, page).href,
      description: album.description,
      image: new URL(album.coverThumb, page).href,
      dateCreated: album.date.toISOString(),
    })),
  );
}

export function albumPhotos(page: URL, album: PhotoAlbum, photos: PhotoItem[]): Node {
  const author = { "@id": new URL("/#identity", page).href };
  return itemList(
    page,
    album.title,
    photos.map((photo) => ({
      "@type": "ImageObject",
      contentUrl: new URL(photo.src, page).href,
      thumbnailUrl: new URL(photo.thumbSrc, page).href,
      width: photo.width,
      height: photo.height,
      dateCreated: photo.date.toISOString(),
      caption: photo.note,
      creator: author,
      copyrightHolder: author,
    })),
  );
}
