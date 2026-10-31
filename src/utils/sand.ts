type Point = [number, number];

const round1 = (value: number) => Math.round(value * 10) / 10;

export function smooth(points: Point[], closed: boolean): string {
  if (points.length < 2) return "";
  const padded = closed
    ? [points[points.length - 1], ...points, points[0], points[1]]
    : [points[0], ...points, points[points.length - 1]];
  let path = `M${round1(padded[1][0])} ${round1(padded[1][1])}`;
  for (let i = 1; i < padded.length - 2; i++) {
    const [before, from, to, after] = [padded[i - 1], padded[i], padded[i + 1], padded[i + 2]];
    path +=
      ` C${round1(from[0] + (to[0] - before[0]) / 6)} ${round1(from[1] + (to[1] - before[1]) / 6)}` +
      ` ${round1(to[0] - (after[0] - from[0]) / 6)} ${round1(to[1] - (after[1] - from[1]) / 6)} ${round1(to[0])} ${round1(to[1])}`;
  }
  return closed ? `${path} Z` : path;
}
