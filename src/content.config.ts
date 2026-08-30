import { defineCollection, z } from "astro:content";
import { orgContentLoader } from "./utils/org-loader";

// Helper for parsing Org-mode dates:
// With angle brackets <2026-03-15 Thu>,
// Brackets [2026-03-15],
// Or standard ISO strings
const parseFlexibleDate = (arg: unknown): Date | undefined => {
  if (arg === undefined || arg === null || arg === "") return undefined;
  if (arg instanceof Date) return isNaN(arg.getTime()) ? undefined : arg;
  if (typeof arg === "string") {
    const trimmed = arg.trim();
    if (!trimmed) return undefined;
    const cleaned = trimmed.replace(/^[<\[]+|[>\]]+$/g, "").trim();

    const orgMatch = cleaned.match(
      /^(\d{4}[-/]\d{1,2}[-/]\d{1,2})(?:\s+[A-Za-z]+)?(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?/,
    );
    if (orgMatch) {
      const datePart = orgMatch[1].replace(/\//g, "-");
      const [year, month, day] = datePart.split("-");
      const formattedDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      if (orgMatch[2]) {
        const timePart = orgMatch[2];
        const timeStr = timePart.length === 5 ? `${timePart}:00` : timePart;
        const d = new Date(`${formattedDate}T${timeStr}Z`);
        if (!isNaN(d.getTime())) return d;
      } else {
        const d = new Date(`${formattedDate}T00:00:00.000Z`);
        if (!isNaN(d.getTime())) return d;
      }
    }

    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
};

const flexibleDate = z.preprocess((arg) => parseFlexibleDate(arg), z.date());

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
  loader: orgContentLoader({
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
  loader: orgContentLoader({
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
      status: z.enum(["active", "maintained", "archived", "completed"]).default("active"),
      tags: flexibleTags,
    })
    .transform((data) => ({
      ...data,
      pubDate: data.pubDate || data.date || new Date(),
    })),
});

const files = defineCollection({
  loader: orgContentLoader({
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
    encrypted: z.boolean().default(false),
    encryptedUrl: z.string().optional(),
    salt: z.string().optional(),
    iv: z.string().optional(),
  }),
});

const photos = defineCollection({
  loader: orgContentLoader({
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

const vault = defineCollection({
  loader: orgContentLoader({
    base: "./src/content/vault",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: flexibleDate.optional(),
    type: z.enum(["note", "file"]).default("note"),
    filename: z.string().optional(),
    filesize: z.string().optional(),
    sha256: z.string().optional(),
    ciphertext: z.string().optional(),
    encryptedUrl: z.string().optional(),
    iv: z.string(),
    salt: z.string(),
    hint: z.string().optional(),
  }),
});

export const collections = {
  writings,
  projects,
  files,
  photos,
  vault,
};
