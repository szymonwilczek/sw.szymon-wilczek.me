import { earn, update } from "../utils/garden";
import "./stopped";

// Opening an essay earns seal
// Reaching the seal marks it read and earns another one
(function () {
  earn("書");
  var endSeal = document.querySelector(".end-seal");
  var slug = location.pathname.replace(/^\/writings\/|\/$/g, "");
  if (!endSeal) return;
  var seen = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    seen.disconnect();
    update(function (state) {
      if (!state.read.includes(slug)) state.read.push(slug);
      delete state.stops[slug];
    });
    earn("終");
  });
  seen.observe(endSeal);
})();

(function () {
  var toggleButton = document.getElementById("toggle-raw-btn");
  var drawer = document.getElementById("raw-code-drawer");
  var copyButton = document.getElementById("copy-raw-btn");

  if (toggleButton && drawer) {
    toggleButton.addEventListener("click", function () {
      drawer!.hidden = !drawer!.hidden;
      toggleButton!.textContent = drawer!.hidden ? "view" : "hide";
    });
  }

  if (copyButton) {
    copyButton.addEventListener("click", function () {
      var code = document.querySelector(".raw-code-pre code");
      if (!code) return;
      navigator.clipboard.writeText(code.textContent || "").then(function () {
        copyButton!.textContent = "copied";
        setTimeout(function () {
          copyButton!.textContent = "copy buffer";
        }, 2000);
      });
    });
  }
})();

// on wide screens Org footnotes move into the margin beside their reference
(function () {
  var article = document.querySelector<HTMLElement>(".article");
  var aside = document.querySelector<HTMLElement>(".margin-notes");
  var defs = document.querySelectorAll<HTMLElement>(".prose .footnote-definition");
  if (!article || !aside) return;

  var wide = window.matchMedia("(min-width: 64em)");
  var thread = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  thread.classList.add("note-thread");
  thread.setAttribute("aria-hidden", "true");
  thread.append(document.createElementNS("http://www.w3.org/2000/svg", "path"));
  article.append(thread);

  // the words a note belongs to
  function anchorOf(reference: HTMLElement) {
    var superscript = reference.closest("sup") || reference;
    var previous = superscript.previousSibling;
    if (previous && previous.nodeType === Node.TEXT_NODE && !previous.textContent!.trim()) {
      previous = previous.previousSibling;
    }
    if (previous instanceof HTMLElement) {
      if (previous.classList.contains("note-anchor")) return previous;
      var wrapper = document.createElement("span");
      wrapper.className = "note-anchor";
      previous.before(wrapper);
      wrapper.append(previous);
      return wrapper;
    }
    if (!previous || previous.nodeType !== Node.TEXT_NODE) return null;
    var text = previous.textContent || "";
    var tail = text.replace(/\s+$/, "");
    var cutAt = tail.search(/[^,.;:!?()—]*$/);
    var words = tail.slice(cutAt).trim().split(/\s+/).slice(-4).join(" ");
    if (!words) return null;
    var start = tail.lastIndexOf(words);
    var span = document.createElement("span");
    span.className = "note-anchor";
    span.textContent = text.slice(start, tail.length);
    previous.textContent = text.slice(0, start);
    superscript.before(span, text.slice(tail.length));
    return span;
  }

  var notes = new Map<HTMLElement, HTMLElement>();

  function drawNoteInk() {
    var color = getComputedStyle(document.documentElement).getPropertyValue("--cursor").trim();
    var svg =
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 4' preserveAspectRatio='none'>" +
      "<path d='M1 2.6 C 25 3.4, 50 1.4, 75 2.4 S 96 2, 99 1.8' fill='none' stroke='" +
      color +
      "' stroke-width='1.6' stroke-linecap='round'/></svg>";
    article!.style.setProperty(
      "--note-ink",
      `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
    );
  }

  drawNoteInk();
  document.addEventListener("au-theme-change", drawNoteInk);

  function showLink(anchor: HTMLElement) {
    var note = notes.get(anchor);
    if (!note || !note.isConnected) return;
    note.classList.add("is-linked");
    anchor.classList.add("is-linked");
    var box = article!.getBoundingClientRect();
    var rects = anchor.getClientRects();
    var last = rects[rects.length - 1];
    var noteBox = note.getBoundingClientRect();
    var fromX = last.right - box.left + 4;
    var fromY = last.bottom - box.top;
    var toX = noteBox.left - box.left - 8;
    var toY = noteBox.top - box.top + 14;
    thread.firstElementChild!.setAttribute(
      "d",
      `M${fromX} ${fromY} C ${fromX + (toX - fromX) * 0.4} ${fromY + 6}, ${toX - (toX - fromX) * 0.3} ${toY - 4}, ${toX} ${toY}`,
    );
    thread.classList.add("is-shown");
  }

  function hideLink(anchor: HTMLElement) {
    notes.get(anchor)?.classList.remove("is-linked");
    anchor.classList.remove("is-linked");
    thread.classList.remove("is-shown");
  }

  function link(note: HTMLElement, reference: HTMLElement) {
    var anchor = anchorOf(reference);
    if (!anchor) return;
    notes.set(anchor, note);
    var targets: HTMLElement[] = [note];
    if (!anchor.dataset.linked) {
      anchor.dataset.linked = "";
      targets.push(anchor, reference);
    }
    targets.forEach(function (linked) {
      linked.addEventListener("mouseenter", function () {
        showLink(anchor!);
      });
      linked.addEventListener("mouseleave", function () {
        hideLink(anchor!);
      });
    });
  }

  // mends from git log, each matched to the paragraph its added text is in
  var mended: { el: HTMLElement; date: string; subject: string }[] = [];
  var blocks = Array.from(document.querySelectorAll<HTMLElement>(".prose :is(p, li, pre)"));
  var squash = function (text: string) {
    return text.replace(/\s+/g, " ");
  };
  JSON.parse(article.dataset.mends || "[]").forEach(function (mend: {
    date: string;
    subject: string;
    hint: string | null;
  }) {
    if (!mend.hint) return;
    var hint = squash(mend.hint);
    var block = blocks.find(function (candidate) {
      return squash(candidate.textContent || "").includes(hint);
    });
    if (!block) return;
    var element = (block.closest(".code-block-wrapper") as HTMLElement) || block;
    if (!element.classList.contains("mended")) {
      element.classList.add("mended");
      element.insertAdjacentHTML(
        "beforeend",
        '<svg class="mend-seam" viewBox="0 0 30 100" preserveAspectRatio="none" aria-hidden="true">' +
          '<path d="M14 0 L 18 14 L 11 26 L 17 40 L 12 55 L 18 70 L 13 84 L 16 100" stroke-width="2.4" vector-effect="non-scaling-stroke"/>' +
          '<path d="M17 40 L 26 36 M 18 70 L 27 73" stroke-width="1.4" vector-effect="non-scaling-stroke"/></svg>',
      );
    }
    mended.push({ el: element, date: mend.date, subject: mend.subject });
  });

  function place() {
    aside!.replaceChildren();
    article!.classList.toggle("notes-in-margin", wide.matches);
    if (!wide.matches) return;

    var items: { at: Element; note: HTMLElement }[] = [];
    defs.forEach(function (definition) {
      var number = definition.querySelector(".footnum")?.textContent?.trim();
      var body = definition.querySelector(".footdef");
      var reference = number ? document.getElementById("fnr." + number) : null;
      if (!number || !body || !reference) return;

      var note = document.createElement("div");
      note.className = "margin-note";
      var mark = document.createElement("span");
      mark.className = "note-num";
      mark.textContent = number;
      note.append(mark, ...Array.from(body.cloneNode(true).childNodes));
      items.push({ at: reference, note: note });
    });
    mended.forEach(function (mend) {
      var note = document.createElement("div");
      note.className = "margin-note mend-note";
      var date = document.createElement("span");
      date.className = "mend-date";
      date.textContent = "mended " + mend.date;
      note.append(date, document.createElement("br"), mend.subject);
      items.push({ at: mend.el, note: note });
    });

    var floor = 0;
    var base = aside!.getBoundingClientRect().top;
    items
      .sort(function (former, latter) {
        return former.at.getBoundingClientRect().top - latter.at.getBoundingClientRect().top;
      })
      .forEach(function (item) {
        aside!.append(item.note);
        if (item.at.id.startsWith("fnr.")) link(item.note, item.at as HTMLElement);
        var top = Math.max(item.at.getBoundingClientRect().top - base - 8, floor);
        item.note.style.top = top + "px";
        floor = top + item.note.offsetHeight + 24;
      });
    aside!.style.minHeight = floor + "px";
  }

  wide.addEventListener("change", place);
  window.addEventListener("resize", place);
  document.fonts.ready.then(place);
  place();
})();

// reading progress
(function () {
  var article = document.querySelector<HTMLElement>(".article");
  var prose = document.querySelector<HTMLElement>(".prose");
  var ink = document.querySelector<SVGPathElement>(".progress-ink");
  var drop = document.querySelector<SVGCircleElement>(".progress-drop");
  var left = document.querySelector<HTMLElement>(".progress-left");
  if (!article || !prose || !ink || !drop || !left) return;
  var minutes = Number(article.dataset.minutes) || 1;
  var length = ink.getTotalLength();

  function draw() {
    var box = prose!.getBoundingClientRect();
    var read = (innerHeight * 0.4 - box.top) / box.height;
    var progress = Math.min(1, Math.max(0, read));
    ink!.style.strokeDashoffset = String(1 - progress);
    var tip = ink!.getPointAtLength(progress * length);
    drop!.setAttribute("cx", String(tip.x));
    drop!.setAttribute("cy", String(tip.y));
    var rest = Math.ceil(minutes * (1 - progress));
    left!.textContent = progress >= 0.98 ? "the end" : `about ${rest} min left`;
  }

  window.addEventListener("scroll", draw, { passive: true });
  window.addEventListener("resize", draw);
  draw();
})();
