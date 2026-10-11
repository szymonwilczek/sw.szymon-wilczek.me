import type { GraphicName } from "../utils/dogu";

export type Group = "writing" | "the machine" | "the site" | "off the screen";

export interface Tool {
  name: string;
  graphic: GraphicName;
  group: Group;
  why: string;
}

export const GROUPS: { name: Group; kanji: string }[] = [
  { name: "writing", kanji: "書" },
  { name: "the machine", kanji: "機" },
  { name: "the site", kanji: "庭" },
  { name: "off the screen", kanji: "外" },
];

const WHY = "[WHY I KEEP IT · SINCE WHEN]";

export const TOOLS: Tool[] = [
  { name: "Emacs", graphic: "kettle", group: "writing", why: WHY },
  { name: "Org", graphic: "daruma", group: "writing", why: WHY },
  { name: "Typus Mono 95", graphic: "brush", group: "writing", why: WHY },
  { name: "au-themes", graphic: "lantern", group: "writing", why: WHY },
  { name: "[NOTES]", graphic: "scroll", group: "writing", why: WHY },
  { name: "[OS]", graphic: "jar", group: "the machine", why: WHY },
  { name: "[TERMINAL]", graphic: "ladle", group: "the machine", why: WHY },
  { name: "[KEYBOARD]", graphic: "whisk", group: "the machine", why: WHY },
  { name: "[BROWSER]", graphic: "vase", group: "the machine", why: WHY },
  { name: "Astro", graphic: "scoop", group: "the site", why: WHY },
  { name: "git", graphic: "seal", group: "the site", why: WHY },
  { name: "[HOSTING]", graphic: "teapot", group: "the site", why: WHY },
  { name: "[CAMERA]", graphic: "shears", group: "off the screen", why: WHY },
  { name: "[HEADPHONES]", graphic: "bell", group: "off the screen", why: WHY },
];
