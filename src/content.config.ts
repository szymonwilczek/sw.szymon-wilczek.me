import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Helper for parsing Org-mode dates with angle brackets <2026-03-15> or standard strings
const flexibleDate = z.preprocess((arg) => {
  if (typeof arg === "string") {
    const cleaned = arg.replace(/[<>[\]]/g, "").trim();
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  if (arg instanceof Date) return arg;
  return new Date();
}, z.date());

// Helper for parsing Org-mode tags:
// supports JSON arrays, space/comma separated strings, and :tag:format:
const flexibleTags = z
  .union([z.array(z.string()), z.string()])
  .transform((val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      return val
        .replace(/[\[\]"']/g, "")
        .split(/[\s,:]+/)
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return [];
  })
  .default([]);

const writings = defineCollection({
  loader: glob({
    pattern: "**/*.{org,md,mdx}",
    base: "./src/content/writings",
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      pubDate: flexibleDate.optional(),
      date: flexibleDate.optional(),
      updatedDate: flexibleDate.optional(),
      category: z.string().default("Essay"),
      tags: flexibleTags,
    })
    .transform((data) => ({
      ...data,
      pubDate: data.pubDate || data.date || new Date(),
    })),
});

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.{org,md,mdx}",
    base: "./src/content/projects",
  }),
  schema: z
    .object({
      title: z.string(),
      description: z.string(),
      pubDate: flexibleDate.optional(),
      date: flexibleDate.optional(),
      updatedDate: flexibleDate.optional(),
      repo: z.string().optional(),
      status: z
        .enum(["active", "maintained", "archived", "completed"])
        .default("active"),
      tags: flexibleTags,
    })
    .transform((data) => ({
      ...data,
      pubDate: data.pubDate || data.date || new Date(),
    })),
});

const files = defineCollection({
  loader: glob({
    pattern: "**/*.{org,md,mdx,json}",
    base: "./src/content/files",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    filename: z.string(),
    filesize: z.string(),
    sha256: z.string(),
    category: z.string().default("General"),
    date: flexibleDate,
    downloadUrl: z.string().optional(),
  }),
});

const photos = defineCollection({
  loader: glob({
    pattern: "**/*.{org,md,mdx,json}",
    base: "./src/content/photos",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: flexibleDate,
    location: z.string().optional(),
    camera: z.string().optional(),
    lens: z.string().optional(),
    aperture: z.string().optional(),
    shutterSpeed: z.string().optional(),
    iso: z.string().optional(),
    image: z.string(),
    alt: z.string().default("Photograph"),
  }),
});

export const collections = {
  writings,
  projects,
  files,
  photos,
};
