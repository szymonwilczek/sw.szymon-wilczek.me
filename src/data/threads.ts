// What happened on the mailing list before each patch was merged,
// keyed by the 12-character sha.
// Copied by hand from lore.kernel.org

export interface Version {
  version: string;
  sent: string;
  url: string;
  message?: string;
  diff?: string;
}

export interface ListMessage {
  version: string;
  who: string;
  role: string;
  date: string;
  depth: number;
  kind: "patch" | "reply" | "applied";
  subject?: string;
  quote?: string[];
  text?: string;
}

export interface Thread {
  versions: Version[];
  messages: ListMessage[];
}

export const threads: Record<string, Thread> = {};
