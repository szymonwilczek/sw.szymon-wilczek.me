// Review threads for scripts/research.mjs, in one shape for both places
// a patch is discussed:
//   listThread  the mailing list on lore.kernel.org, found by the subject
//   pullThread  the comments and reviews of a GitHub pull request

import { gunzipSync } from "node:zlib";

const LORE = "https://lore.kernel.org/all/";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PAGE = 100;
const DAY_MS = 86_400_000;
const SAME_MOMENT_MS = 60_000;

const BOT = /syzbot|lkp@intel\.com|test robot|-bot\b|\bbot@|stable@/i;
const APPLIED = /\b(applied|queued|picked up|merged)\b/i;
const ATTRIBUTION = /^(On .*wrote:|.* writes:|.* wrote:|.*写道[:：])$/;
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
  for (const part of body.split(`--${boundary}`).slice(1)) {
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

// what someone wrote in a reply: their own words,
// without the lines they answered
function ownWords(body) {
  const lines = body.split("\n");
  const signature = lines.findIndex((line) => line === "-- ");
  const kept = (signature === -1 ? lines : lines.slice(0, signature)).filter(
    (line) => !ATTRIBUTION.test(line.trim()),
  );
  return kept
    .map((line) => (line.startsWith(">") ? "" : line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// the people named in the merged commit say who was who on the list
function rolesFrom(commit, author) {
  const roles = new Map([[author, "author"]]);
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
  return "reviewer";
}

function versionOf(subject) {
  return `v${VERSION.exec(subject)?.[1] ?? 1}`;
}

function threadFor(mails, roles) {
  const byId = new Map(mails.map((mail) => [mail.id, mail]));
  const isPatch = (mail) => /^(\[[^\]]*\]\s*)*\[[^\]]*PATCH/i.test(mail.subject);
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
      const text = ownWords(mail.body);
      const kind = role === "maintainer" && APPLIED.test(text) ? "applied" : "reply";
      return {
        ...base,
        depth: depthOf(mail),
        kind,
        ...(text && { text }),
      };
    });

  return { versions, messages };
}

const LINKED = /(?:lore\.kernel\.org\/(?:[\w.-]+\/)?|patch\.msgid\.link\/)([^/\s]+@[^/\s]+)/;
const isSent = (mail) => /^\[[^\]]*PATCH/i.test(mail.subject);

async function mbox(response) {
  if (!response.ok) return [];
  return parseMbox(gunzipSync(Buffer.from(await response.arrayBuffer())).toString("utf8"));
}

async function search(query) {
  const params = new URLSearchParams({ q: query, x: "m" });
  return (await mbox(await fetch(`${LORE}?${params}`, { method: "POST" }))).filter(isSent);
}

const loreDay = (date) => date.toISOString().slice(0, 10).replace(/-/g, "");

async function sentIds(commit, emails) {
  const ids = new Set();
  const linked = LINKED.exec(commit.message)?.[1];
  if (linked) ids.add(decodeURIComponent(linked));
  const from = `(${emails.map((email) => `f:${email}`).join(" OR ")})`;
  const subject = commit.message.split("\n")[0].replace(/"/g, "");
  const title = subject.slice(subject.indexOf(": ") + 1).trim();
  for (const words of new Set([subject, title])) {
    const found = await search(`s:"${words}" AND ${from}`);
    for (const mail of found) ids.add(mail.id);
    if (found.length > 0) return ids;
  }
  if (ids.size > 0) return ids;
  const authored = new Date(commit.authored);
  const window = `d:${loreDay(new Date(authored - DAY_MS))}..${loreDay(new Date(+authored + DAY_MS))}`;
  const sameMoment = (await search(`${window} AND ${from}`)).filter(
    (mail) => Math.abs(mail.date - authored) < SAME_MOMENT_MS,
  );
  for (const mail of sameMoment) ids.add(mail.id);
  return ids;
}

export async function listThread(commit, author, emails) {
  const mails = [];
  for (const id of await sentIds(commit, emails)) {
    mails.push(...(await mbox(await fetch(`${LORE}${encodeURIComponent(id)}/t.mbox.gz`))));
  }
  if (mails.length === 0) return null;
  const unique = [...new Map(mails.map((mail) => [mail.id, mail])).values()];
  return threadFor(unique, rolesFrom(commit, author));
}

export async function pullThread(item, me, github) {
  const base = `repos/${item.repo}`;
  const pull = await github(`${base}/pulls/${item.number}`);
  const comments = await github(`${base}/issues/${item.number}/comments?per_page=${PAGE}`);
  const reviews = await github(`${base}/pulls/${item.number}/reviews?per_page=${PAGE}`);
  const inline = await github(`${base}/pulls/${item.number}/comments?per_page=${PAGE}`);
  const version = "v1";
  const roleOf = (user) => {
    if (user.login === me) return "author";
    if (user.login === pull.merged_by?.login) return "maintainer";
    return user.type === "Bot" || BOT.test(user.login) ? "bot" : "reviewer";
  };
  const said = (user, date, text, extra = {}) => ({
    version,
    who: user.login,
    role: roleOf(user),
    date: dayMonthYear(new Date(date)),
    at: date,
    depth: 0,
    kind: "reply",
    ...(text && { text }),
    ...extra,
  });
  const messages = [
    said(pull.user, pull.created_at, "", { kind: "patch", subject: pull.title }),
    ...comments.map((c) => said(c.user, c.created_at, c.body?.trim())),
    ...reviews
      .filter((review) => review.body?.trim() || review.state === "APPROVED")
      .map((review) => said(review.user, review.submitted_at, review.body?.trim() || "approved")),
    ...inline.map((c) =>
      said(c.user, c.created_at, c.body?.trim(), { depth: c.in_reply_to_id ? 1 : 0 }),
    ),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(({ at, ...message }) => message);
  return {
    versions: [{ version, sent: dayMonthYear(new Date(pull.created_at)), url: pull.html_url }],
    messages,
  };
}
