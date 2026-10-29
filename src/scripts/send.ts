// /send/: the text, a file, or a zip of both, sent with my word to the send Worker in chunks
import { downloadZip, predictLength } from "client-zip";
import {
  CHUNK_BYTES,
  EXTENSION_PATTERN,
  ID_LENGTH,
  MAX_TEXT_BYTES,
  POOL_BYTES,
  SEND_URL,
  TEXT_EXTENSION,
  ZIP_EXTENSION,
  bytes,
  chunkCount,
  type NewSend,
  type SendKind,
  type Started,
} from "../utils/send";
import { FILE_ICONS, TRACK_LENGTH, fileIcon } from "../utils/send-ink";
import { inkQr, UNIT } from "../utils/send-qr";

const WORD_KEY = "send:word";
const COPIED_FOR_MS = 1400;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const PERCENT = 100;
const CHUNK_ATTEMPTS = 3;
const SPEED_AFTER_MS = 1500;
const UNKNOWN_ID = "·".repeat(ID_LENGTH);
const ID_STAND_IN = "x".repeat(ID_LENGTH);

const form = document.querySelector<HTMLFormElement>("[data-form]")!;
const fields = document.querySelector<HTMLFieldSetElement>("[data-fields]")!;
const textEl = document.querySelector<HTMLTextAreaElement>("[data-text]")!;
const countEl = document.querySelector<HTMLElement>("[data-count]")!;
const asFileEl = document.querySelector<HTMLInputElement>("[data-as-file]")!;
const extensionEl = document.querySelector<HTMLInputElement>("[data-extension]")!;
const extensionEcho = document.querySelector<HTMLElement>("[data-extension-echo]")!;
const tray = document.querySelector<HTMLElement>("[data-tray]")!;
const freeEl = document.querySelector<HTMLElement>("[data-free]")!;
const freeBar = document.querySelector<HTMLElement>("[data-free-bar]")!;
const queueEl = document.querySelector<HTMLUListElement>("[data-queue]")!;
const rowTemplate = document.querySelector<HTMLTemplateElement>("[data-row]")!;
const drop = document.querySelector<HTMLElement>("[data-drop]")!;
const filesEl = document.querySelector<HTMLInputElement>("[data-files]")!;
const summary = document.querySelector<HTMLElement>("[data-summary]")!;
const summaryText = document.querySelector<HTMLElement>("[data-summary-text]")!;
const summarySize = document.querySelector<HTMLElement>("[data-summary-size]")!;
const lockOnEl = document.querySelector<HTMLInputElement>("[data-lock-on]")!;
const lockEl = document.querySelector<HTMLInputElement>("[data-lock]")!;
const wordEl = document.querySelector<HTMLInputElement>("[data-word]")!;
const sendLabel = document.querySelector<HTMLElement>("[data-send-label]")!;
const progress = document.querySelector<HTMLElement>("[data-progress]")!;
const progressName = document.querySelector<HTMLElement>("[data-progress-name]")!;
const progressZip = document.querySelector<HTMLElement>("[data-progress-zip]")!;
const pctEl = document.querySelector<HTMLElement>("[data-pct]")!;
const inkEl = document.querySelector<SVGRectElement>("[data-ink]")!;
const blot = document.querySelector<HTMLElement>("[data-blot]")!;
const progressMeta = document.querySelector<HTMLElement>("[data-progress-meta]")!;
const stopEl = document.querySelector<HTMLButtonElement>("[data-stop]")!;
const errorEl = document.querySelector<HTMLElement>("[data-error]")!;
const sealed = document.querySelector<HTMLElement>("[data-sealed]")!;
const squares = [...document.querySelectorAll<HTMLElement>("[data-square]")];
const linkEl = document.querySelector<HTMLAnchorElement>("[data-link]")!;
const lockedEl = document.querySelector<HTMLElement>("[data-locked]")!;
const openEl = document.querySelector<HTMLAnchorElement>("[data-open]")!;
const copyEl = document.querySelector<HTMLButtonElement>("[data-copy]")!;
const metaEl = document.querySelector<HTMLElement>("[data-sealed-meta]")!;
const qrEl = document.querySelector<SVGSVGElement>("[data-qr]")!;

const host = SEND_URL.replace(/^https?:\/\//, "");
const encoder = new TextEncoder();

// one line of the queue: a picked file,
// or the text when it rides along in the zip
interface Entry {
  name: string;
  size: number;
  row: HTMLLIElement;
  file?: File;
}

let files: File[] = [];
let rows: Entry[] = [];
let link = "";
let free = POOL_BYTES;
let upload: { id: string; token: string; request?: XMLHttpRequest } | null = null;

class Stopped extends Error {}

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

const textBytes = () => encoder.encode(textEl.value).length;
const extension = () => extensionEl.value.trim().replace(/^\.+/, "").toLowerCase();
const hasText = () => textEl.value.trim() !== "";
const textName = (id: string) => `${id}.${(asFileEl.checked && extension()) || TEXT_EXTENSION}`;

function kind(): SendKind {
  if (files.length === 0) return "text";
  return files.length === 1 && !hasText() ? "file" : "zip";
}

function showError(message: string) {
  errorEl.textContent = message;
  errorEl.hidden = false;
}

function count() {
  countEl.textContent = bytes(textBytes());
}

function showFree() {
  freeEl.textContent = `free now · ${bytes(free)} of ${bytes(POOL_BYTES)}`;
  freeBar.style.width = `${((POOL_BYTES - free) / POOL_BYTES) * PERCENT}%`;
}

async function fetchFree() {
  try {
    const response = await fetch(`${SEND_URL}/free`);
    if (response.ok) ({ free } = await response.json());
  } catch {}
  showFree();
}

function makeRow(name: string, size: number, icon: string, sheet: boolean): HTMLLIElement {
  const row = rowTemplate.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
  row.dataset.state = "queued";
  if (sheet) row.dataset.sheet = "";
  row.querySelector("[data-row-icon]")!.setAttribute("d", icon);
  row.querySelector("[data-row-name]")!.textContent = name;
  row.querySelector("[data-row-size]")!.textContent = bytes(size);
  return row;
}

function unique(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let copy = 2; ; copy++) {
    const candidate = `${stem} (${copy})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

function redraw() {
  rows = [];
  if (files.length > 0 && hasText()) {
    const name = textName(UNKNOWN_ID);
    const size = textBytes();
    rows.push({ name, size, row: makeRow(name, size, FILE_ICONS.text, true) });
  }
  const taken = new Set(rows.map((entry) => entry.name));
  files.forEach((file, index) => {
    const name = unique(file.name, taken);
    taken.add(name);
    const row = makeRow(name, file.size, fileIcon(file.type), false);
    const out = row.querySelector<HTMLButtonElement>("[data-row-out]")!;
    out.setAttribute("aria-label", `take ${file.name} out`);
    out.addEventListener("click", () => {
      files.splice(index, 1);
      redraw();
      filesEl.focus();
    });
    rows.push({ name, size: file.size, row, file });
  });
  queueEl.replaceChildren(...rows.map((entry) => entry.row));
  tray.toggleAttribute("data-filled", files.length > 0);

  summary.hidden = files.length === 0;
  if (files.length === 0) return;
  const total = plannedSize();
  summarySize.textContent = bytes(total);
  const what =
    kind() === "file"
      ? "goes as it is, "
      : `${hasText() ? "the text and " : ""}${files.length} ${files.length === 1 ? "file" : "files"} go as one zip, `;
  const name = kind() === "file" ? files[0].name : `${UNKNOWN_ID}.${ZIP_EXTENSION}`;
  summaryText.replaceChildren(
    what,
    Object.assign(document.createElement("code"), { textContent: name }),
  );
}

const zipEntries = (id: string) =>
  rows.map((entry) =>
    entry.file
      ? { name: entry.name, input: entry.file, lastModified: new Date(entry.file.lastModified) }
      : { name: textName(id), input: textEl.value, lastModified: new Date() },
  );

function plannedSize(): number {
  if (kind() === "text") return textBytes();
  if (kind() === "file") return files[0].size;
  return Number(
    predictLength(
      rows.map((entry) => ({
        name: entry.file ? entry.name : textName(ID_STAND_IN),
        size: entry.size,
      })),
    ),
  );
}

function addFiles(list: FileList | null) {
  if (!list) return;
  // a dropped folder arrives as an empty, typeless file; it has nothing to send
  files.push(...[...list].filter((file) => file.size > 0 || file.type !== ""));
  redraw();
}

async function* chunks(id: string): AsyncGenerator<Blob> {
  const source = kind();
  if (source !== "zip") {
    const blob = source === "file" ? files[0] : new Blob([textEl.value]);
    for (let from = 0; from < blob.size; from += CHUNK_BYTES)
      yield blob.slice(from, from + CHUNK_BYTES);
    return;
  }
  const reader = downloadZip(zipEntries(id)).body!.getReader();
  let buffer = new Uint8Array(CHUNK_BYTES);
  let filled = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    for (let at = 0; at < value.length; ) {
      const take = Math.min(CHUNK_BYTES - filled, value.length - at);
      buffer.set(value.subarray(at, at + take), filled);
      filled += take;
      at += take;
      if (filled === CHUNK_BYTES) {
        yield new Blob([buffer]);
        buffer = new Uint8Array(CHUNK_BYTES);
        filled = 0;
      }
    }
  }
  if (filled > 0) yield new Blob([buffer.subarray(0, filled)]);
}

// XHR, because fetch cant tell how much of a body has gone
function put(
  id: string,
  token: string,
  index: number,
  body: Blob,
  moved: (loaded: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    upload!.request = request;
    request.open("PUT", `${SEND_URL}/${id}/${index}`);
    request.setRequestHeader("x-send-token", token);
    request.upload.onprogress = (event) => moved(event.loaded);
    request.onload = () =>
      request.status < 300
        ? resolve()
        : reject(new Error(request.responseText || `${request.status}`));
    request.onerror = () => reject(new Error("the connection dropped"));
    request.onabort = () => reject(new Stopped());
    request.send(body);
  });
}

function left(until: Date): string {
  const minutes = Math.max(0, Math.round((until.getTime() - Date.now()) / MS_PER_MINUTE));
  return `${Math.floor(minutes / MINUTES_PER_HOUR)} h ${minutes % MINUTES_PER_HOUR} min left`;
}

function seconds(total: number): string {
  const rounded = Math.ceil(total);
  if (rounded < SECONDS_PER_MINUTE) return `${rounded} s`;
  return `${Math.ceil(rounded / SECONDS_PER_MINUTE)} min`;
}

function showProgress(sent: number, total: number, startedAt: number, ends: number[]) {
  const share = total === 0 ? 1 : sent / total;
  const pct = Math.floor(share * PERCENT);
  pctEl.textContent = `${pct} %`;
  progress.setAttribute("aria-valuenow", String(pct));
  inkEl.setAttribute("width", String(share * TRACK_LENGTH));
  blot.style.left = `${share * PERCENT}%`;

  const elapsed = Date.now() - startedAt;
  const speed = elapsed > SPEED_AFTER_MS ? sent / (elapsed / MS_PER_SECOND) : 0;
  progressMeta.textContent = [
    `${bytes(sent)} of ${bytes(total)}`,
    ...(speed > 0 ? [`${bytes(speed)}/s`, `about ${seconds((total - sent) / speed)} left`] : []),
  ].join(" · ");

  // each row's share of the stream, in order;
  // the zip's own headers are left out of the sum
  ends.forEach((end, index) => {
    const start = index === 0 ? 0 : ends[index - 1];
    const { row } = rows[index];
    if (sent >= end) row.dataset.state = "sent";
    else if (sent < start) row.dataset.state = "waiting";
    else {
      row.dataset.state = "now";
      const own = `${Math.floor(((sent - start) / (end - start)) * PERCENT)}%`;
      row.querySelector<HTMLElement>("[data-row-bar]")!.style.width = own;
      row.querySelector("[data-row-pct]")!.textContent = own;
    }
  });
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

function describe(id: string): string {
  const source = kind();
  if (source === "zip")
    return `${hasText() ? "the text and " : ""}${files.length} ${files.length === 1 ? "file" : "files"} · ${id}.${ZIP_EXTENSION}`;
  if (source === "file") return files[0].name;
  return asFileEl.checked
    ? textName(id)
    : `${textEl.value.length.toLocaleString("fr-FR")} characters · raw text`;
}

function showSealed(id: string, until: Date, size: number, locked: boolean) {
  link = `${SEND_URL}/${id}`;
  [...id].forEach((char, index) => (squares[index].textContent = char));
  linkEl.href = link;
  linkEl.replaceChildren(
    `${host}/`,
    Object.assign(document.createElement("b"), { textContent: id }),
  );
  openEl.href = link;
  lockedEl.hidden = !locked;
  drawQr(link);
  metaEl.textContent = [describe(id), bytes(size), ...(locked ? ["locked"] : []), left(until)].join(
    " · ",
  );
  form.hidden = true;
  sealed.hidden = false;
  copyEl.focus();
}

// what's wrong with the form before anything goes, or null
function invalid(): string | null {
  if (!hasText() && files.length === 0) return "Nothing to send yet.";
  if (textBytes() > MAX_TEXT_BYTES)
    return `Too much text: ${bytes(textBytes())} of ${bytes(MAX_TEXT_BYTES)}.`;
  if (asFileEl.checked && hasText() && !EXTENSION_PATTERN.test(extension()))
    return "The extension is letters and digits only, like org.";
  if (lockOnEl.checked && !lockEl.value) return "The lock needs a password of its own.";
  if (plannedSize() > free)
    return `No room: ${bytes(plannedSize())} asked, ${bytes(free)} free for now.`;
  return null;
}

function busy(on: boolean) {
  fields.disabled = on;
  sendLabel.textContent = on ? "sending…" : "seal & send";
  progress.hidden = !on;
}

async function start(word: string, size: number): Promise<Started | null> {
  const source = kind();
  const body: NewSend = { word, kind: source, size };
  if (source === "text" && asFileEl.checked) body.extension = extension();
  if (source === "file") Object.assign(body, { name: files[0].name, type: files[0].type });
  if (lockOnEl.checked) body.lock = lockEl.value;
  const response = await fetch(`${SEND_URL}/`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (response.status === 403) {
    forget();
    wordEl.value = "";
    wordEl.focus();
    showError("The password does not fit.");
    return null;
  }
  if (!response.ok) {
    showError(`It did not go through: ${await response.text()}`);
    return null;
  }
  return response.json();
}

async function send() {
  const word = wordEl.value;
  const size = plannedSize();
  const started = await start(word, size);
  if (!started) return;
  remember(word);
  const { id, token } = started;
  upload = { id, token };

  const source = kind();
  progressName.textContent =
    source === "file" ? files[0].name : source === "zip" ? `${id}.${ZIP_EXTENSION}` : textName(id);
  progressZip.hidden = source !== "zip";
  let total = 0;
  const ends = rows.map((entry) => (total += entry.size));
  const startedAt = Date.now();
  showProgress(0, size, startedAt, ends);

  let index = 0;
  for await (const chunk of chunks(id)) {
    const before = index * CHUNK_BYTES;
    for (let attempt = 1; ; attempt++) {
      try {
        await put(id, token, index, chunk, (loaded) =>
          showProgress(before + loaded, size, startedAt, ends),
        );
        break;
      } catch (error) {
        if (error instanceof Stopped || attempt === CHUNK_ATTEMPTS) throw error;
      }
    }
    index++;
  }
  if (index !== chunkCount(size)) throw new Error("the zip came out a different size than planned");
  showProgress(size, size, startedAt, ends);

  const response = await fetch(`${SEND_URL}/${id}/done`, {
    method: "POST",
    headers: { "x-send-token": token },
  });
  if (!response.ok) throw new Error(await response.text());
  const { until } = await response.json();
  upload = null;
  showSealed(id, new Date(until), size, lockOnEl.checked);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorEl.hidden = true;
  const problem = invalid();
  if (problem) return showError(problem);

  busy(true);
  try {
    await send();
  } catch (error) {
    const stopped = error instanceof Stopped;
    if (upload) {
      const { id, token } = upload;
      fetch(`${SEND_URL}/${id}`, { method: "DELETE", headers: { "x-send-token": token } }).catch(
        () => {},
      );
    }
    showError(
      stopped ? "Stopped. Nothing was kept." : `It did not go through: ${(error as Error).message}`,
    );
  } finally {
    upload = null;
    busy(false);
    rows.forEach(({ row }) => (row.dataset.state = "queued"));
    fetchFree();
  }
});

stopEl.addEventListener("click", () => upload?.request?.abort());

// leaving mid-upload loses it
window.addEventListener("beforeunload", (event) => {
  if (upload) event.preventDefault();
});

copyEl.addEventListener("click", async () => {
  await navigator.clipboard.writeText(link);
  copyEl.textContent = "copied";
  setTimeout(() => (copyEl.textContent = "copy the link"), COPIED_FOR_MS);
});

document.querySelector("[data-again]")!.addEventListener("click", () => {
  textEl.value = "";
  files = [];
  asFileEl.checked = false;
  lockOnEl.checked = false;
  lockEl.value = "";
  count();
  redraw();
  sealed.hidden = true;
  form.hidden = false;
  fetchFree();
  textEl.focus();
});

// ctrl + enter sends from anywhere in the form
form.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || !(event.ctrlKey || event.metaKey)) return;
  event.preventDefault();
  if (!fields.disabled) form.requestSubmit();
});

filesEl.addEventListener("change", () => {
  addFiles(filesEl.files);
  filesEl.value = "";
});

// files dropped anywhere on the tray join the queue
tray.addEventListener("dragover", (event) => {
  if (fields.disabled || !event.dataTransfer?.types.includes("Files")) return;
  event.preventDefault();
  drop.toggleAttribute("data-over", true);
});
tray.addEventListener("dragleave", (event) => {
  if (!tray.contains(event.relatedTarget as Node)) drop.toggleAttribute("data-over", false);
});
tray.addEventListener("drop", (event) => {
  event.preventDefault();
  drop.toggleAttribute("data-over", false);
  if (!fields.disabled) addFiles(event.dataTransfer?.files ?? null);
});

textEl.addEventListener("input", () => {
  count();
  if (files.length > 0) redraw();
});
asFileEl.addEventListener("change", redraw);
extensionEl.addEventListener("input", () => {
  extensionEcho.textContent = extension() || "org";
  redraw();
});
lockOnEl.addEventListener("change", () => {
  if (lockOnEl.checked) lockEl.focus();
});

wordEl.value = remembered();
count();
redraw();
fetchFree();
