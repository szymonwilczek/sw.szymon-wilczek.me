import { WORKER_URL } from "../../utils/tea/inbox";
import { DISCS } from "./discs";
import type { Fill } from "./cards";
import type { Radio } from "./radio";

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
async function fetchNow(): Promise<Now> {
  if (!WORKER_URL) return { playing: false };
  if (last && Date.now() - last.at < 25_000) return last.now;
  try {
    const response = await fetch(`${WORKER_URL}/now`);
    const now = response.ok ? ((await response.json()) as Now) : { playing: false };
    last = { at: Date.now(), now };
    return now;
  } catch {
    return { playing: false };
  }
}

function timeAgo(stamp: string): string {
  const minutes = Math.round((Date.now() - Date.parse(stamp)) / 60_000);
  if (minutes < 2) return "a moment ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

export function recordOf(radio: Radio, crate: () => void): Fill {
  let body: HTMLElement | null = null;
  let timer = 0;

  async function paint() {
    if (!body) return;
    const now = await fetchNow();
    if (!body) return;
    const disc = DISCS[radio.disc];
    const said = now.track
      ? `<div class="rec-now">
          ${now.art ? `<img src="${escapeHtml(now.art)}" alt="" width="96" height="96" loading="lazy">` : ""}
          <div>
            <p class="card-small">${now.playing ? "the host is listening to" : `the host last played, ${now.at ? timeAgo(now.at) : "a while ago"}`}</p>
            <p class="card-big">${escapeHtml(now.track)}</p>
            <p>${escapeHtml((now.artists || []).join(", "))}${now.album ? ` <span class="card-dim">· ${escapeHtml(now.album)}</span>` : ""}</p>
            ${now.url ? `<p><a href="${escapeHtml(now.url)}" target="_blank" rel="noopener">on Spotify ↗</a></p>` : ""}
          </div>
        </div>
        ${
          now.playing && now.duration
            ? `<div class="inc-stick rec-bar" aria-hidden="true"><span class="inc-ash" style="width:${(((now.progress || 0) / now.duration) * 100).toFixed(1)}%"></span></div>`
            : ""
        }`
      : `<p class="card-small">on the turntable</p>
        <p class="card-big">${disc.title}</p>
        <p>${escapeHtml(disc.src ? disc.about(0) : radio.about())}</p>
        <p class="card-dim">${disc.credit ? `${escapeHtml(disc.by)} · <a href="${disc.credit.licenceUrl}" target="_blank" rel="noopener">${disc.credit.licence}</a>` : "The house's own record, made as it plays."} When the host is listening to something, it shows here.</p>`;
    body.innerHTML = `${said}
      <p class="rec-radio"><button type="button" class="card-knob">${radio.label()}</button>
      <br><span class="card-small card-dim">${disc.jp} · ${escapeHtml(disc.title)}, or another from <button type="button" class="card-link">the crate</button></span></p>`;
    body.querySelector(".card-link")!.addEventListener("click", crate);
    body.querySelector(".rec-radio button")!.addEventListener("click", () => {
      radio.toggle();
      paint();
    });
  }

  return {
    make(panel) {
      body = panel;
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
