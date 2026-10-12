export interface Step {
  when: string;
  what: string;
  why: string;
}

export interface Year {
  year: string;
  moss: number;
  steps: Step[];
}

export const CV = "/downloads/Szymon-Wilczek-CV.pdf";

export const YEARS: Year[] = [
  {
    year: "2023",
    moss: 3,
    steps: [
      {
        when: "10.2023",
        what: "Silesian University of Technology, Gliwice",
        why: "Computer Science, B.Sc. Eng. Operating systems, algorithms, how software is engineered. In the seventh semester now.",
      },
    ],
  },
  {
    year: "2024",
    moss: 2,
    steps: [
      {
        when: "01.2024 – 01.2026",
        what: "Freelance, full-stack",
        why: "Web applications made to order, start to finish: the architecture, both ends, and the Linux server they run on.",
      },
    ],
  },
  {
    year: "2025",
    moss: 1,
    steps: [
      {
        when: "10.2025",
        what: "FAMUR, Zabrze · Software Architect",
        why: "MES software for the mining sector: industrial processes made digital, and the data between them kept in order. PHP, SQL.",
      },
      {
        when: "10.2025",
        what: "AccessibleEU · Accessible Technology Design",
        why: "A certificate from the European Commission: software anyone can use.",
      },
      {
        when: "11.2025",
        what: "The Linux kernel",
        why: "Filesystems: ocfs2, f2fs, ntfs3, jfs. Use-after-free, slab-out-of-bounds, races; syzbot reports patched and sent upstream to stable, with the maintainers.",
      },
    ],
  },
  {
    year: "now",
    moss: 0,
    steps: [
      {
        when: "",
        what: "Still on all three",
        why: "Kernel patches, FAMUR, the seventh semester. The freelance work closed in January.",
      },
    ],
  },
];
