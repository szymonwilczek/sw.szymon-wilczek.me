// /paste/: sends the text with my word to the paste Worker
import { PASTE_URL, MAX_CHARS } from "../utils/paste";
import { inkQr, UNIT } from "../utils/paste-qr";

const WORD_KEY = "paste:word";
const COPIED_FOR_MS = 1400;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

const form = document.querySelector<HTMLFormElement>("[data-form]")!;
const textEl = document.querySelector<HTMLTextAreaElement>("[data-text]")!;
const wordEl = document.querySelector<HTMLInputElement>("[data-word]")!;
const countEl = document.querySelector<HTMLElement>("[data-count]")!;
const sendEl = document.querySelector<HTMLButtonElement>("[data-send]")!;
const errorEl = document.querySelector<HTMLElement>("[data-error]")!;
const sealed = document.querySelector<HTMLElement>("[data-sealed]")!;
const squares = [...document.querySelectorAll<HTMLElement>("[data-square]")];
const linkEl = document.querySelector<HTMLAnchorElement>("[data-link]")!;
const openEl = document.querySelector<HTMLAnchorElement>("[data-open]")!;
const copyEl = document.querySelector<HTMLButtonElement>("[data-copy]")!;
const metaEl = document.querySelector<HTMLElement>("[data-sealed-meta]")!;
const qrEl = document.querySelector<SVGSVGElement>("[data-qr]")!;

const host = PASTE_URL.replace(/^https?:\/\//, "");
let link = "";

function remembered(): string {
  try {
    return localStorage.getItem(WORD_KEY) || "";
  } catch {
    return "";
  }
}

function remember(word: string) {
  try {
    localStorage.setItem(WORD_KEY, word);
  } catch {}
}

function forget() {
  try {
    localStorage.removeItem(WORD_KEY);
  } catch {}
}

function count() {
  countEl.textContent = textEl.value.length.toLocaleString("fr-FR");
}

function left(until: Date): string {
  const minutes = Math.max(0, Math.round((until.getTime() - Date.now()) / MS_PER_MINUTE));
  return `${Math.floor(minutes / MINUTES_PER_HOUR)} h ${minutes % MINUTES_PER_HOUR} min left`;
}

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function drawQr(text: string) {
  const { size, slip, ink, finders } = inkQr(text);
  qrEl.setAttribute("viewBox", `${-UNIT} ${-UNIT} ${size + UNIT * 2} ${size + UNIT * 2}`);
  qrEl.setAttribute("aria-label", `QR code for ${text}`);
  const fill = (selector: string, d: string) =>
    qrEl.querySelectorAll(selector).forEach((path) => path.setAttribute("d", d));
  fill("[data-qr-slip]", slip);
  fill("[data-qr-ink]", ink);
  fill("[data-qr-finders]", finders);
}

function showSealed(id: string, until: Date, characters: number) {
  link = `${PASTE_URL}/${id}`;
  [...id].forEach((char, index) => (squares[index].textContent = char));
  linkEl.href = link;
  linkEl.replaceChildren(
    `${host}/`,
    Object.assign(document.createElement("b"), { textContent: id }),
  );
  openEl.href = link;
  drawQr(link);
  metaEl.textContent = `${characters.toLocaleString("fr-FR")} characters · raw text · ${left(until)}`;
  form.hidden = true;
  sealed.hidden = false;
  copyEl.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.hidden = true;
  const text = textEl.value;
  const word = wordEl.value;
  if (!text.trim()) return showError("Nothing to send yet.");
  if (text.length > MAX_CHARS) return showError("Too long for one paste.");

  sendEl.disabled = true;
  try {
    const response = await fetch(`${PASTE_URL}/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ word, text }),
    });
    if (response.status === 403) {
      forget();
      wordEl.value = "";
      wordEl.focus();
      return showError("The word does not fit.");
    }
    if (!response.ok) return showError(`The paste did not go through: ${await response.text()}`);
    const { id, until } = await response.json();
    remember(word);
    showSealed(id, new Date(until), text.length);
  } catch {
    showError("The paste did not go through. Check the connection and try again.");
  } finally {
    sendEl.disabled = false;
  }
});

copyEl.addEventListener("click", async () => {
  await navigator.clipboard.writeText(link);
  copyEl.textContent = "copied";
  setTimeout(() => (copyEl.textContent = "copy the link"), COPIED_FOR_MS);
});

document.querySelector("[data-again]")!.addEventListener("click", () => {
  textEl.value = "";
  count();
  sealed.hidden = true;
  form.hidden = false;
  textEl.focus();
});

textEl.addEventListener("input", count);
wordEl.value = remembered();
count();
