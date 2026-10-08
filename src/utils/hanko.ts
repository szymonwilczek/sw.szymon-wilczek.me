// Red hanko every seal is pressed with

export const HANKO_EDGE = "M4 5 Q23 2 42 4 Q45 23 43 42 Q23 45 3 43 Q1 23 4 5 Z";
export const HANKO_INNER = "M8 9 Q23 7 38 8 Q40 23 38 38 Q23 40 8 38 Q6 23 8 9 Z";

export function hankoSvg(glyph: string, size: number, className = "hanko"): string {
  return (
    `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 46 46" aria-hidden="true">` +
    `<path class="hanko-edge" d="${HANKO_EDGE}"/>` +
    `<path class="hanko-inner" d="${HANKO_INNER}"/>` +
    `<text x="23" y="31" text-anchor="middle">${glyph}</text></svg>`
  );
}
