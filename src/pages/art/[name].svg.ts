import type { APIRoute, GetStaticPaths } from "astro";
import { ART, drawArt, type ArtName } from "../../utils/art";

export const getStaticPaths = (() =>
  ART.map((name) => ({ params: { name } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ params }) =>
  new Response(drawArt(params.name as ArtName), {
    headers: { "Content-Type": "image/svg+xml" },
  });
