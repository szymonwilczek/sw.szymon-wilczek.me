import type { APIRoute } from "astro";
import { homeCard } from "../utils/og";

export const GET: APIRoute = async ({ site }) => {
  const png = await homeCard(site!.host);
  return new Response(png, { headers: { "Content-Type": "image/png" } });
};
