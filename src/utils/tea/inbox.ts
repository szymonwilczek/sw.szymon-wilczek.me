import { MAX_BYTES, clean, type PieceSpec } from "./pottery";

export const WORKER_URL = "";

const MINE = "roji:mine";

export function mine(): PieceSpec[] {
  try {
    const list = JSON.parse(localStorage.getItem(MINE) || "[]");
    return Array.isArray(list) ? list.map(clean).filter((p): p is PieceSpec => p !== null) : [];
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
    const res = await fetch(`${WORKER_URL}/piece`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
    });
    return res.ok ? "sent" : "failed";
  } catch {
    return "failed";
  }
}
