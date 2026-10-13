import type { APIRoute } from "astro";

const AGENTS = [
  "*",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
  "cohere-ai",
  "Bytespider",
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
];

export const GET: APIRoute = ({ site }) => {
  const groups = AGENTS.map((agent) => `User-agent: ${agent}\nAllow: /\nDisallow: /vault/\n`);
  const sitemap = new URL("/sitemap-index.xml", site).href;
  return new Response(`${groups.join("\n")}\nSitemap: ${sitemap}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
