// the terrace boards and the evening light

import { mix, lerp } from "../core.js";
import { wobblyRing, addWash, addLine, addSolid } from "../pen.js";

function slab(group, rand, path, fill, tones, width) {
  addSolid(group, path, mix(fill, tones.paper, 0.3), 1);
  addWash(group, rand, path, fill, 0.7);
  addLine(group, path, tones.ink, width ?? 1.5);
}

function lampGlow(group, rand, x, y, rx, ry, tones, opacity) {
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, rx, ry, 2, 12),
    tones.glow,
    0.5 * opacity,
    "url(#bk-pool)",
  );
  addWash(
    group,
    rand,
    wobblyRing(rand, x, y, rx * 0.5, ry * 0.5, 1, 10),
    tones.glowSoft,
    0.6 * opacity,
    "url(#bk-pool)",
  );
}

function fireflies(group, rand, x0, x1, y0, y1, count, opacity) {
  for (let k = 0; k < count; k++) {
    const x = lerp(x0, x1, rand()),
      y = lerp(y0, y1, rand());
    addWash(
      group,
      rand,
      wobblyRing(rand, x, y, 7, 7, 1, 8),
      "#e9f2a0",
      0.35 * opacity,
      "url(#bk-pool)",
    );
    addSolid(group, wobblyRing(rand, x, y, 1.6, 1.6, 0, 5), "#f4f8c8", opacity);
  }
}

export { slab, lampGlow, fireflies };
