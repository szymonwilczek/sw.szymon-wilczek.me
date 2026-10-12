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
    why: "Where nearly everything happens: code, plans, writing, LaTeX. Vanilla built from scratch, one module at a time.",
  },
  {
    name: "Neovim",
    dots: "nvim/.config/nvim",
    graphic: "ironpot",
    group: "the editors",
    why: "Only for one file at a time: a quick fix from the shell.",
  },
  {
    name: "Evil",
    dots: "emacs/.config/emacs/modules/evil",
    graphic: "brush",
    group: "the editors",
    why: "Vim keys inside Emacs, so my hands never have to learn which editor they are in, this body may be young, but this fingers are really old.",
  },
  {
    name: "Magit",
    dots: "emacs/.config/emacs/modules/git",
    graphic: "shears",
    group: "the editors",
    why: "The best git interface. Not a discussion.",
  },
  {
    name: "jot",
    dots: "emacs/.config/emacs/modules/jot",
    graphic: "fan",
    group: "the editors",
    why: "My own, twice over: tmux-jot pops a note over the terminal, jot.el the same over Emacs. One drawer of notes.",
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
    why: "Tiling on Wayland: every window gets its own place, , all from my keyboard.",
  },
  {
    name: "Ghostty",
    dots: "ghostty/.config/ghostty",
    graphic: "ladle",
    group: "the machine",
    why: "THE terminal. Fast, native, and beautiful out of the box.",
  },
  {
    name: "tmux",
    dots: "tmux",
    graphic: "caddy",
    group: "the machine",
    why: "Do I really need to explain what a tmux is?",
  },
  {
    name: "Zathura",
    dots: "zathura/.config/zathura",
    graphic: "scroll",
    group: "the machine",
    why: "PDFs with vim keys and nothing else on the screen. Papers, datasheets, and my own LaTeX.",
  },
  {
    name: "Astro",
    graphic: "scoop",
    group: "the site",
    why: "Builds this site; a page ships no JavaScript unless it asks for some.",
  },
  {
    name: "GitHub Pages",
    graphic: "teapot",
    group: "the site",
    why: "Where the built site is served from.",
  },
  {
    name: "Onionite",
    graphic: "whisk",
    group: "off the screen",
    why: "Modded to the bone: Akko black switches, tape, sand and spacebar mods, more inside the frame. A NuPhy Air V3 is next in some time.",
  },
  {
    name: "DT 770 Pro",
    graphic: "bell",
    group: "off the screen",
    why: "Beyerdynamic, closed back. Long hours on the head, and the music stays mine. Really deep sound, really comfortable.",
  },
];
