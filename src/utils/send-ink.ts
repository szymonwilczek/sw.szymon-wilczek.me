// Hand-drawn strokes on /send/, each in a 24 x 24 box unless it says otherwise

export const LOCK =
  "M8 11 V8.2 C 8 4.6, 16 4.6, 16 8.2 V11 M5.5 11.2 C 9 10.8, 15 11.3, 18.5 10.9 L 18.2 20 C 14 20.3, 10 19.8, 5.8 20.2 Z";
export const KEY =
  "M4.5 9 C 4.5 6.8, 6.2 5.4, 8 5.5 C 10 5.6, 11.6 7.2, 11.5 9.1 C 11.4 11, 9.8 12.5, 7.9 12.4 C 6 12.3, 4.5 10.9, 4.5 9 Z M11.4 9.3 C 14.5 9.1, 17.5 9.4, 20.4 9.2 M17.6 9.3 L 17.8 12.4 M20.2 9.2 L 20.3 11.6";
export const BOX =
  "M4 5 C 9 4.4, 15 4.8, 20 4.4 C 20.4 10, 19.8 15, 20.2 20 C 15 20.4, 9 19.8, 4.2 20.2 C 3.8 15, 4.3 10, 4 5 Z";
export const TICK = "M7 12.5 C 8.6 14, 9.8 15.4, 10.8 17 C 13 12, 16 8.4, 21.5 4";
export const DROP =
  "M12 3.5 C 12.1 7, 11.9 10.5, 12 14 M8 10.4 C 9.6 11.6, 10.8 12.8, 12 14.2 C 13.2 12.8, 14.4 11.6, 16 10.4 M3.6 14 C 3.8 16.4, 3.6 18.4, 3.8 20.4 C 9 20.8, 15 20.2, 20.4 20.6 C 20.2 18.4, 20.4 16.2, 20.2 14";
export const ARROW =
  "M2 8 C 8 7.6, 16 8.4, 24 7.8 M18 3 C 20 5, 22 6.4, 24.5 7.8 C 22 9.4, 20 11, 18.4 13";
export const TRACK = "M2 13 C 120 11, 220 15, 340 12.5 S 560 11, 680 14 S 880 15, 998 12";
export const TRACK_LENGTH = 1000;

// one per kind of thing in the queue
export const FILE_ICONS = {
  image:
    "M3.5 5.5 C 9 5, 15 5.4, 20.5 5 L 20.2 18.6 C 15 19, 9 18.4, 3.8 18.8 Z M5.5 16.5 L 10 11.5 L 13 14.5 L 15.5 12.5 L 19 16.5 M15.6 8.6 C 16.6 8.4, 17.2 9.2, 16.8 9.9 C 16.3 10.6, 15.2 10.3, 15.2 9.4 Z",
  video:
    "M3.5 6 C 9 5.6, 15 6, 20.5 5.6 L 20.3 18.2 C 15 18.6, 9 18, 3.7 18.4 Z M10 9.2 L 15.2 12 L 10.1 14.9 Z",
  text: "M6 3.5 C 10 3.3, 14 3.6, 18.4 3.4 L 18.3 20.6 C 14 20.9, 10 20.4, 6.2 20.7 Z M8.8 8 H 15.6 M8.8 11 H 15.2 M8.8 14 H 15.8 M8.8 17 H 12.4",
  other:
    "M6 3.5 C 9.5 3.3, 12 3.6, 14.5 3.4 L 18.6 7.6 L 18.4 20.6 C 14 20.9, 10 20.4, 6.2 20.7 Z M14.4 3.6 L 14.5 7.7 L 18.4 7.6 M8.8 11.5 H 15.6 M8.8 14.5 H 15.2 M8.8 17.4 H 13",
};

export function fileIcon(type: string): string {
  if (type.startsWith("image/")) return FILE_ICONS.image;
  if (type.startsWith("video/")) return FILE_ICONS.video;
  if (type.startsWith("text/")) return FILE_ICONS.text;
  return FILE_ICONS.other;
}
