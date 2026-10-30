// Turns the mailing-list threads saved with `b4 mbox` into src/data/threads.json,
// one entry per patch.
// Every run rebuilds the whole file from what is in .threads/

import { readdir, readFile, writeFile } from "node:fs/promises";

const IN = new URL("../.threads/", import.meta.url);
const OUT = new URL("../src/data/threads.json", import.meta.url);
const COMMITS = new URL("../src/data/research.json", import.meta.url);
const AUTHOR = "Szymon Wilczek";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const QUOTE_LINES = 4;
const SHORT_SHA = 12;

const BOT = /syzbot|lkp@intel\.com|test robot|patchwork-bot|stable/i;
const APPLIED = /\b(applied|queued|picked up|merged)\b/i;
const ATTRIBUTION = /^(On .*wrote:|.* writes:|.* wrote:)$/;
const VERSION = /\[[^\]]*PATCH[^\]]*?\bv(\d+)\b[^\]]*\]/i;

function dayMonthYear(date) {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// =?UTF-8?q?...?= and =?UTF-8?b?...?= in headers
function decodeWords(value) {
  return value
    .replace(/\?=\s+=\?/g, "?==?")
    .replace(/=\?([^?]+)\?([bq])\?([^?]*)\?=/gi, (_, charset, encoding, text) => {
      const bytes =
        encoding.toLowerCase() === "b"
          ? Buffer.from(text, "base64")
          : Buffer.from(
              text
                .replace(/_/g, " ")
                .replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
              "latin1",
            );
      return new TextDecoder(charset).decode(bytes);
    });
}

function decodeBody(body, encoding) {
  if (/base64/i.test(encoding)) return Buffer.from(body, "base64").toString("utf8");
  if (/quoted-printable/i.test(encoding)) {
    const bytes = body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    return Buffer.from(bytes, "latin1").toString("utf8");
  }
  return body;
}

function parseHeaders(block) {
  const headers = {};
  for (const line of block.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/)) {
    const colon = line.indexOf(":");
    if (colon > 0) headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
  }
  return headers;
}

// the first text/plain part of a message, decoded
function plainText(headers, body) {
  const boundary = /boundary="?([^";]+)"?/i.exec(headers["content-type"] ?? "")?.[1];
  if (!boundary) return decodeBody(body, headers["content-transfer-encoding"] ?? "");
  for (const part of body.split(`--${boundary}`)) {
    const split = part.search(/\r?\n\r?\n/);
    if (split === -1) continue;
    const partHeaders = parseHeaders(part.slice(0, split).trim());
    if (/text\/plain/i.test(partHeaders["content-type"] ?? "text/plain")) {
      return decodeBody(part.slice(split).trim(), partHeaders["content-transfer-encoding"] ?? "");
    }
  }
  return "";
}

function parseMbox(text) {
  return text
    .split(/^From .*\r?\n/m)
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const split = chunk.search(/\r?\n\r?\n/);
      const headers = parseHeaders(chunk.slice(0, split));
      const body = plainText(headers, chunk.slice(split).replace(/^>(>*From )/gm, "$1"));
      const from = decodeWords(headers.from ?? "");
      return {
        id: (headers["message-id"] ?? "").replace(/[<>]/g, ""),
        parent: (headers["in-reply-to"] ?? "").replace(/[<>]/g, "").split(/\s/)[0],
        who: from.replace(/<.*>/, "").replace(/"/g, "").trim() || from,
        email: /<([^>]+)>/.exec(from)?.[1] ?? from,
        date: new Date(headers.date),
        subject: decodeWords(headers.subject ?? "").replace(/\s+/g, " "),
        body: body.replace(/\r/g, ""),
      };
    });
}

// a patch splits into its message, the notes under "---" and the diff
function splitPatch(body) {
  const lines = body.split("\n");
  const cut = lines.findIndex((line) => line === "---");
  const diffStart = lines.findIndex((line) => line.startsWith("diff --git"));
  const signature = lines.findLastIndex((line) => line === "-- ");
  const end = signature > diffStart ? signature : lines.length;
  const message = lines
    .slice(0, cut === -1 ? diffStart : cut)
    .join("\n")
    .trim();
  const below = cut === -1 ? [] : lines.slice(cut + 1, diffStart === -1 ? end : diffStart);
  const statStart = below.findIndex((line) => /^ \S.*\|\s+\d+/.test(line));
  const notes = below
    .slice(0, statStart === -1 ? below.length : statStart)
    .join("\n")
    .trim();
  const diff = diffStart === -1 ? "" : lines.slice(diffStart, end).join("\n").trimEnd();
  return { message, notes, diff };
}

// what someone wrote in a reply: the lines they answered and their own words
function splitReply(body) {
  const lines = body.split("\n");
  const signature = lines.findIndex((line) => line === "-- ");
  const kept = (signature === -1 ? lines : lines.slice(0, signature)).filter(
    (line) => !ATTRIBUTION.test(line.trim()),
  );
  const firstOwn = kept.findIndex((line) => line.trim() && !line.startsWith(">"));
  const quote = kept
    .slice(0, firstOwn === -1 ? kept.length : firstOwn)
    .filter((line) => line.startsWith(">") && line.replace(/^>+\s?/, "").trim())
    .map((line) => line.replace(/^>+\s?/, ""))
    .slice(-QUOTE_LINES);
  const text = kept
    .map((line) => (line.startsWith(">") ? "" : line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { quote, text };
}

// the people named in the merged commit say who was who on the list
function rolesFrom(commit) {
  const roles = new Map([[AUTHOR, "author"]]);
  for (const line of commit.message.split("\n")) {
    const trailer = /^([\w-]+):\s*([^<]+)</.exec(line);
    if (!trailer) continue;
    const [, key, name] = trailer;
    const who = name.trim();
    if (roles.has(who)) continue;
    if (key === "Signed-off-by") roles.set(who, "maintainer");
    else if (/Reviewed-by|Acked-by|Tested-by/.test(key)) roles.set(who, "reviewer");
    else if (key === "Reported-by") roles.set(who, "reporter");
  }
  roles.set(commit.committer, "maintainer");
  return roles;
}

function roleOf(mail, roles) {
  if (roles.has(mail.who)) return roles.get(mail.who);
  if (BOT.test(mail.email) || BOT.test(mail.who)) return "bot";
  return "on the list";
}

function versionOf(subject) {
  return `v${VERSION.exec(subject)?.[1] ?? 1}`;
}

function threadFor(mails, roles) {
  const byId = new Map(mails.map((mail) => [mail.id, mail]));
  const isPatch = (mail) => /^\[[^\]]*PATCH/i.test(mail.subject);
  const rootOf = (mail) => {
    let at = mail;
    while (!isPatch(at) && byId.has(at.parent)) at = byId.get(at.parent);
    return at;
  };
  const depthOf = (mail) => {
    let depth = 0;
    for (let at = mail; !isPatch(at) && byId.has(at.parent); at = byId.get(at.parent)) depth++;
    return depth;
  };

  const sent = mails.filter(isPatch).sort((a, b) => a.date - b.date);
  const versions = [...new Map(sent.map((mail) => [versionOf(mail.subject), mail])).values()]
    .sort((a, b) => a.date - b.date)
    .map((mail, i, all) => {
      const { message, diff } = splitPatch(mail.body);
      const merged = i === all.length - 1;
      return {
        version: versionOf(mail.subject),
        sent: dayMonthYear(mail.date),
        url: `https://lore.kernel.org/r/${mail.id}`,
        ...(merged ? {} : { message, diff }),
      };
    });

  const messages = [...mails]
    .sort((a, b) => a.date - b.date)
    .map((mail) => {
      const role = roleOf(mail, roles);
      const version = versionOf(rootOf(mail).subject);
      const base = { version, who: mail.who, role, date: dayMonthYear(mail.date) };
      if (isPatch(mail)) {
        const { notes } = splitPatch(mail.body);
        return {
          ...base,
          depth: 0,
          kind: "patch",
          subject: mail.subject,
          ...(notes && { text: notes }),
        };
      }
      const { quote, text } = splitReply(mail.body);
      const kind = role === "maintainer" && APPLIED.test(text) ? "applied" : "reply";
      return {
        ...base,
        depth: depthOf(mail),
        kind,
        ...(quote.length > 0 && { quote }),
        ...(text && { text }),
      };
    });

  return { versions, messages };
}

async function listDir(url) {
  try {
    return await readdir(url, { withFileTypes: true });
  } catch {
    return [];
  }
}

const commits = JSON.parse(await readFile(COMMITS, "utf8"));
const threads = {};
for (const entry of await listDir(IN)) {
  if (!entry.isDirectory()) continue;
  const short = entry.name.slice(0, SHORT_SHA);
  const commit = commits.find((c) => c.sha.startsWith(short));
  if (!commit) {
    console.warn(`${short}: no such commit in research.json, skipped`);
    continue;
  }
  const dir = new URL(`${entry.name}/`, IN);
  const files = (await readdir(dir)).filter((name) => /\.(mbx|mbox)$/.test(name));
  const mails = [];
  for (const name of files) mails.push(...parseMbox(await readFile(new URL(name, dir), "utf8")));
  const unique = [...new Map(mails.map((mail) => [mail.id, mail])).values()];
  threads[short] = threadFor(unique, rolesFrom(commit));
  const { versions, messages } = threads[short];
  console.log(`${short}: ${versions.length} versions, ${messages.length} messages`);
}

await writeFile(OUT, JSON.stringify(threads, null, 2) + "\n");
console.log(`${Object.keys(threads).length} threads kept in src/data/threads.json`);
