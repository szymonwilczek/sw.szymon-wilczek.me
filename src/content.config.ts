import { defineCollection, z } from "astro:content";
import { orgContentLoader } from "./utils/org-loader";

// Helper for parsing Org-mode dates:
// With angle brackets <2026-03-15 Thu>,
// Brackets [2026-03-15],
// Or standard ISO strings
const parseFlexibleDate = (input: unknown): Date | undefined => {
  if (input === undefined || input === null || input === "") return undefined;
  if (input instanceof Date) return isNaN(input.getTime()) ? undefined : input;
  if (typeof input === "string") {
    const trimmed = input.trim();
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
        const timeString = timePart.length === 5 ? `${timePart}:00` : timePart;
        const parsed = new Date(`${formattedDate}T${timeString}Z`);
        if (!isNaN(parsed.getTime())) return parsed;
      } else {
        const parsed = new Date(`${formattedDate}T00:00:00.000Z`);
        if (!isNaN(parsed.getTime())) return parsed;
      }
    }

    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) return date;
  }
  return undefined;
};

const flexibleDate = z.preprocess((input) => parseFlexibleDate(input), z.date());

// Helper for parsing Org-mode tags:
// supports JSON arrays, space/comma separated strings, and :tag:format:
const flexibleTags = z
  .union([z.array(z.string()), z.string()])
  .transform((tags) => {
    if (Array.isArray(tags)) return tags;
    if (typeof tags === "string") {
      return tags
        .replace(/[\[\]"']/g, "")
        .split(/[\s,:]+/)
        .map((tag) => tag.trim())
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
      abstract: z.string().optional(),
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
  photos,
  vault,
};
