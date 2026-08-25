import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx,org}",
    base: "./src/content/projects",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    repo: z.string().optional(),
    status: z
      .enum(["active", "maintained", "archived", "completed"])
      .default("active"),
    tags: z.array(z.string()).default([]),
  }),
});

const files = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx,json}", base: "./src/content/files" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    filename: z.string(),
    filesize: z.string(),
    sha256: z.string(),
    category: z.string().default("General"),
    date: z.coerce.date(),
    downloadUrl: z.string().optional(),
  }),
});

const photos = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx,json}", base: "./src/content/photos" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    location: z.string().optional(),
    camera: z.string().optional(),
    image: z.string(),
    alt: z.string().default("Photograph"),
  }),
});

export const collections = {
  projects,
  files,
  photos,
};
