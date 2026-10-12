import type { GraphicName } from "../utils/dogu";

export type Group = "the editors" | "the machine" | "the site" | "off the screen";

export interface Tool {
  name: string;
  graphic: GraphicName;
  group: Group;
  why: string;
  dots?: string;
}

export const GROUPS: { name: Group; kanji: string }[] = [
  { name: "the editors", kanji: "書" },
  { name: "the machine", kanji: "機" },
  { name: "the site", kanji: "庭" },
  { name: "off the screen", kanji: "外" },
];

export const DOTFILES = "https://github.com/szymonwilczek/dotfiles/tree/main/";

export const TOOLS: Tool[] = [
  {
    name: "Emacs",
    dots: "emacs/.config/emacs",
    graphic: "kettle",
    group: "the editors",
    why: "Where nearly everything happens: code, plans, writing, LaTeX. Built from scratch, one module at a time, after Doom stopped bending.",
  },
  {
    name: "Neovim",
    dots: "nvim/.config/nvim",
    graphic: "ironpot",
    group: "the editors",
    why: "Only for one file at a time: a quick fix from the shell, the note tmux-jot pops up. It is open before I finish typing.",
  },
  {
    name: "Evil",
    dots: "emacs/.config/emacs/modules/evil",
    graphic: "brush",
    group: "the editors",
    why: "Vim keys inside Emacs, so my hands never have to learn which editor they are in.",
  },
  {
    name: "Magit",
    dots: "emacs/.config/emacs/modules/git",
    graphic: "seal",
    group: "the editors",
    why: "git as a page I can read and edit: stage a hunk, reword a commit, rebase, without a single flag.",
  },
  {
    name: "Vertico & Consult",
    dots: "emacs/.config/emacs/modules/completion",
    graphic: "abacus",
    group: "the editors",
    why: "Type a few letters in any order and the list narrows to the one thing I meant: files, buffers, lines.",
  },
  {
    name: "Eglot",
    dots: "emacs/.config/emacs/modules/lsp",
    graphic: "lantern",
    group: "the editors",
    why: "The language server, built into Emacs. Definitions, errors and renames, with nothing to set up.",
  },
  {
    name: "jot",
    dots: "emacs/.config/emacs/modules/jot",
    graphic: "fan",
    group: "the editors",
    why: "My own, twice over: tmux-jot pops a note over the terminal, jot.el the same over Emacs. One drawer of notes, the layout left as it was.",
  },
  {
    name: "Fedora",
    graphic: "jar",
    group: "the machine",
    why: "My system for almost ten years. Unbelievably stable, and still always new.",
  },
  {
    name: "Sway",
    dots: "sway/.config/sway",
    graphic: "boxes",
    group: "the machine",
    why: "Tiling on Wayland: every window gets its own place, no window over another, all from the keyboard.",
  },
  {
    name: "Ghostty",
    dots: "ghostty/.config/ghostty",
    graphic: "ladle",
    group: "the machine",
    why: "The terminal. Fast, native, and beautiful out of the box.",
  },
  {
    name: "tmux",
    dots: "tmux",
    graphic: "caddy",
    group: "the machine",
    why: "Sessions that outlive the terminal: close the window, come back, everything is where I left it.",
  },
  {
    name: "Zathura",
    dots: "zathura/.config/zathura",
    graphic: "scroll",
    group: "the machine",
    why: "PDFs with vim keys and nothing else on the screen. Papers, datasheets, my own LaTeX.",
  },
  {
    name: "Ansible",
    dots: "ansible",
    graphic: "umbrella",
    group: "the machine",
    why: "One playbook installs the whole system: packages, repos, Flatpaks. A fresh Fedora comes up as mine.",
  },
  {
    name: "Astro",
    graphic: "scoop",
    group: "the site",
    why: "Builds this site to plain HTML; a page ships no JavaScript unless it asks for some. My org files are read at build time.",
  },
  {
    name: "GitHub Pages",
    graphic: "teapot",
    group: "the site",
    why: "Where the built site is served from. A push to main builds it and puts it out.",
  },
  {
    name: "Onionite",
    graphic: "whisk",
    group: "off the screen",
    why: "Modded to the bone: Akko black switches, tape, sand and spacebar mods, more inside the frame. A NuPhy Air V3 is next.",
  },
  {
    name: "DT 770 Pro",
    graphic: "bell",
    group: "off the screen",
    why: "Beyerdynamic, closed back. Long hours on the head, and the music stays mine.",
  },
];
