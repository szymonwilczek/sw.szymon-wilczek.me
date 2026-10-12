import { hash, rng } from "./stamp";

const f1 = (n: number) => Math.round(n * 10) / 10;

export function blob(cx: number, cy: number, rx: number, ry: number, seed: string, n = 9) {
  const r = rng(hash(seed));
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3;
    const k = 0.86 + r() * 0.2;
    const s = Math.sin(a);
    pts.push([cx + Math.cos(a) * rx * k, cy + s * ry * k * (s > 0 ? 1.08 : 0.92)]);
  }
  const mid = (p: [number, number], q: [number, number]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const [sx, sy] = mid(pts[n - 1], pts[0]);
  let d = `M${f1(sx)} ${f1(sy)}`;
  for (let i = 0; i < n; i++) {
    const [mx, my] = mid(pts[i], pts[(i + 1) % n]);
    d += ` Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(mx)} ${f1(my)}`;
  }
  return `${d} Z`;
}

export function tufts(cx: number, cy: number, rx: number, ry: number, moss: number, seed: string) {
  const r = rng(hash(`${seed}/moss`));
  let d = "";
  for (let i = 0; i < moss * 4; i++) {
    const a = r() < 0.7 ? (0.15 + r() * 0.7) * Math.PI : (1.1 + r() * 0.8) * Math.PI;
    const x = cx + Math.cos(a) * rx * (0.85 + r() * 0.2);
    const y = cy + Math.sin(a) * ry * (0.9 + r() * 0.2);
    const h = 3 + r() * 4;
    const lean = (r() - 0.5) * 5;
    d += `M${f1(x)} ${f1(y)} q ${f1(lean / 2)} ${f1(-h / 2)} ${f1(lean)} ${f1(-h)} `;
  }
  return d.trim();
}

export function stone(cx: number, cy: number, s: number, moss: number, seed: string) {
  const rx = 34 * s;
  const ry = 15 * s;
  return {
    shadow: { cx: f1(cx + 2 * s), cy: f1(cy + 5 * s), rx: f1(rx), ry: f1(ry * 0.9) },
    body: blob(cx, cy, rx, ry, seed),
    moss: moss
      ? blob(
          cx - rx * 0.15,
          cy + ry * 0.35,
          rx * 0.6,
          ry * (0.2 + (0.45 * moss) / 3),
          `${seed}/wash`,
          7,
        )
      : "",
    mossOpacity: 0.25 + 0.15 * moss,
    tufts: tufts(cx, cy, rx, ry, moss, seed),
  };
}
