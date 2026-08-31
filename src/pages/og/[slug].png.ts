import { getCollection, type CollectionEntry } from "astro:content";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";
import type { APIRoute } from "astro";

const fontRegular = fs.readFileSync(path.resolve("./src/assets/fonts/TypusMono95-Regular.ttf"));
const fontBold = fs.readFileSync(path.resolve("./src/assets/fonts/TypusMono95-Bold.ttf"));

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

export const GET: APIRoute<Props> = async ({ props }) => {
  const { title, category, pubDate } = props.post.data;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#18181b",
          fontFamily: "Typus Mono 95",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                fontSize: 26,
                color: "#71717a",
                textTransform: "uppercase",
                letterSpacing: 2,
              },
              children: category,
            },
          },
          {
            type: "div",
            props: {
              style: { fontSize: 56, fontWeight: 700, lineHeight: 1.25, color: "#f4f4f5" },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                fontSize: 26,
                color: "#a1a1aa",
              },
              children: [
                { type: "span", props: { children: pubDate.toISOString().split("T")[0] } },
                { type: "span", props: { children: "sw.szymon-wilczek.me" } },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Typus Mono 95", data: fontRegular, weight: 400, style: "normal" },
        { name: "Typus Mono 95", data: fontBold, weight: 700, style: "normal" },
      ],
    },
  );

  const png = new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();

  return new Response(new Uint8Array(png), {
    headers: { "Content-Type": "image/png" },
  });
};
