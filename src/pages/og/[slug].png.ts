import { getCollection, type CollectionEntry } from "astro:content";
import type { APIRoute } from "astro";
import { essayCard } from "../../utils/og";

const INLINE_IMAGE_RE = /\[\[(\/(?:assets|images)\/[^\]]+)\]\]/;

export async function getStaticPaths() {
  const writings = await getCollection("writings");
  return writings
    .filter((post) => !INLINE_IMAGE_RE.test(post.body ?? ""))
    .map((post) => ({
      params: { slug: post.id.replace(/\.(org|md|mdx)$/, "") },
      props: { post },
    }));
}

interface Props {
  post: CollectionEntry<"writings">;
}

export const GET: APIRoute<Props> = async ({ props, site }) => {
  const { title, category, pubDate } = props.post.data;
  const png = await essayCard(site!.host, title, category, pubDate);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
