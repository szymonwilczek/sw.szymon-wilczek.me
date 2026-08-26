import { getCollection } from "astro:content";

export async function getStaticPaths() {
  const projects = await getCollection("projects");
  return projects.map((project) => ({
    params: { slug: project.id.replace(/\.(org|md|mdx)$/, "") },
    props: { rawContent: project.body || "" },
  }));
}

export async function GET({ props }: { props: { rawContent: string } }) {
  return new Response(props.rawContent, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": "inline",
    },
  });
}
