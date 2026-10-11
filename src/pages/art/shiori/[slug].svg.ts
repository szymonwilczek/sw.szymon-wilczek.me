import type { APIRoute, GetStaticPaths } from "astro";
import { getAllAlbums } from "../../../utils/albums";
import { drawShiori } from "../../../utils/shiori";

export const getStaticPaths = (async () =>
  (await getAllAlbums()).map((album) => ({
    params: { slug: album.slug },
    props: { terrain: album.terrain },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params, props }) =>
  new Response(drawShiori(params.slug!, props.terrain as string[]), {
    headers: { "Content-Type": "image/svg+xml" },
  });
