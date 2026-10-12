export interface Link {
  name: string;
  url: string;
  domain: string;
  initial: string;
  since: string;
  mutual: boolean;
}

export const LINKS: Link[] = [
  {
    name: "GitHub",
    url: "https://github.com/szymonwilczek",
    domain: "github.com/szymonwilczek",
    initial: "G",
    since: "2019-09-15",
    mutual: false,
  },
  {
    name: "LOTA",
    url: "https://lota.szymon-wilczek.me",
    domain: "lota.szymon-wilczek.me",
    initial: "L",
    since: "2026-02-01",
    mutual: false,
  },
  {
    name: "alloyctl",
    url: "https://alloy.szymon-wilczek.me",
    domain: "alloy.szymon-wilczek.me",
    initial: "A",
    since: "2026-07-17",
    mutual: false,
  },
];

export const RING: { name: string; size: string; prev: string; next: string } | null = null;
