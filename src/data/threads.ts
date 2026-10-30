// What happened on the mailing list before each patch was merged,
// keyed by the 12-character sha.
// Built by `npm run threads` from the mboxes saved with `b4 mbox`

import saved from "./threads.json";

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
  text?: string;
}

export interface Thread {
  versions: Version[];
  messages: ListMessage[];
}

export const threads: Record<string, Thread> = saved as Record<string, Thread>;
