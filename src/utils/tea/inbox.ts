import { MAX_BYTES, clean, type PieceSpec } from "./pottery";

export const WORKER_URL = "https://roji.szymon-wilczek.me";

const MINE = "roji:mine";

export function mine(): PieceSpec[] {
  try {
    const list = JSON.parse(localStorage.getItem(MINE) || "[]");
    return Array.isArray(list)
      ? list.map(clean).filter((piece): piece is PieceSpec => piece !== null)
      : [];
  } catch {
    return [];
  }
}

export function keep(spec: PieceSpec) {
  localStorage.setItem(MINE, JSON.stringify([...mine(), spec].slice(-6)));
}

export async function send(spec: PieceSpec, key: string): Promise<"sent" | "kept" | "failed"> {
  if (!WORKER_URL) return "kept";
  const body = JSON.stringify({ key, piece: spec });
  if (body.length > MAX_BYTES + 400) return "failed";
  try {
    const response = await fetch(`${WORKER_URL}/piece`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    return response.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
