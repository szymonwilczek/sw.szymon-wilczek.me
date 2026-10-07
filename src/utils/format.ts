// Small formatters shared by the pages.

export function dottedDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "·");
}

export function writingSlug(id: string): string {
  return id.replace(/\.(org|md|mdx)$/, "");
}
