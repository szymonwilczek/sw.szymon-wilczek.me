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
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "A",
    since: "[SINCE]",
    mutual: true,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "K",
    since: "[SINCE]",
    mutual: false,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "M",
    since: "[SINCE]",
    mutual: true,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "R",
    since: "[SINCE]",
    mutual: true,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "T",
    since: "[SINCE]",
    mutual: false,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "L",
    since: "[SINCE]",
    mutual: true,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "S",
    since: "[SINCE]",
    mutual: false,
  },
  {
    name: "[SITE NAME]",
    url: "#",
    domain: "[their-domain.tld]",
    initial: "N",
    since: "[SINCE]",
    mutual: true,
  },
];

export const RING: { name: string; size: string; prev: string; next: string } | null = {
  name: "[RING NAME]",
  size: "[N]",
  prev: "#",
  next: "#",
};
