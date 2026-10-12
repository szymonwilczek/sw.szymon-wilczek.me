import { WORKER_URL } from "../../utils/tea/inbox";
import type { Fill } from "./cards";

interface Now {
  playing: boolean;
  track?: string;
  artists?: string[];
  album?: string;
  art?: string | null;
  url?: string;
  at?: string;
  progress?: number;
  duration?: number;
}

let last: { at: number; now: Now } | null = null;
async function ask(): Promise<Now> {
  if (!WORKER_URL) return { playing: false };
  if (last && Date.now() - last.at < 25_000) return last.now;
  try {
    const res = await fetch(`${WORKER_URL}/now`);
    const now = res.ok ? ((await res.json()) as Now) : { playing: false };
    last = { at: Date.now(), now };
    return now;
  } catch {
    return { playing: false };
  }
}

function ago(iso: string): string {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (min < 2) return "a moment ago";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function recordOf(radio: { label: () => string; toggle: () => void }): Fill {
  let body: HTMLElement | null = null;
  let timer = 0;

  async function paint() {
    if (!body) return;
    const now = await ask();
    if (!body) return;
    const said = now.track
      ? `<div class="rec-now">
          ${now.art ? `<img src="${esc(now.art)}" alt="" width="96" height="96" loading="lazy">` : ""}
          <div>
            <p class="card-small">${now.playing ? "the host is listening to" : `the host last played, ${now.at ? ago(now.at) : "a while ago"}`}</p>
            <p class="card-big">${esc(now.track)}</p>
            <p>${esc((now.artists || []).join(", "))}${now.album ? ` <span class="card-dim">· ${esc(now.album)}</span>` : ""}</p>
            ${now.url ? `<p><a href="${esc(now.url)}" target="_blank" rel="noopener">on Spotify ↗</a></p>` : ""}
          </div>
        </div>
        ${
          now.playing && now.duration
            ? `<div class="inc-stick rec-bar" aria-hidden="true"><span class="inc-ash" style="width:${(((now.progress || 0) / now.duration) * 100).toFixed(1)}%"></span></div>`
            : ""
        }`
      : `<p class="card-small">on the turntable</p>
        <p class="card-big">Blue in Green</p>
        <p>Miles Davis <span class="card-dim">· Kind of Blue, 1959</span></p>
        <p class="card-dim">The house's own record. When the host is listening to something, it shows here.</p>`;
    body.innerHTML = `${said}
      <p class="rec-radio"><button type="button" class="card-knob">${radio.label()}</button>
      <br><span class="card-small card-dim">a quiet radio of the house, made as it plays</span></p>`;
    body.querySelector(".rec-radio button")!.addEventListener("click", () => {
      radio.toggle();
      paint();
    });
  }

  return {
    make(b) {
      body = b;
      paint();
      clearInterval(timer);
      timer = window.setInterval(paint, 30_000);
    },
    leave() {
      body = null;
      clearInterval(timer);
    },
  };
}
