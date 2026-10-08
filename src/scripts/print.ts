import { stampDate } from "../utils/garden";

const SEAL =
  '<svg width="18" height="18" viewBox="0 0 46 46" aria-hidden="true">' +
  '<path d="M4 5 Q23 2 42 4 Q45 23 43 42 Q23 45 3 43 Q1 23 4 5 Z" fill="#a54b32"/>' +
  '<text x="23" y="31" text-anchor="middle" font-family="Yuji Syuku, serif" font-size="22" fill="#fff">狼</text></svg>';

const added: Element[] = [];

function plain(href: string): string {
  return decodeURI(href.replace(/^https?:\/\//, "").replace(/\/$/, ""));
}

window.addEventListener("beforeprint", () => {
  const main = document.getElementById("main-content");
  if (!main || added.length > 0) return;
  const end = main.querySelector(".article-body") ?? main;

  const numbers = new Map<string, number>();
  main.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((a) => {
    if (a.closest(".adjacent, .source, .crumbs, .footnotes-section, .stop-go")) return;
    const href = a.href;
    if (!/^https?:/.test(href) || href.split("#")[0] === location.href.split("#")[0]) return;
    if (!numbers.has(href)) numbers.set(href, numbers.size + 1);
    const ref = document.createElement("span");
    ref.className = "print-ref";
    ref.textContent = String(numbers.get(href));
    a.after(ref);
    added.push(ref);
  });

  if (numbers.size > 0) {
    const list = document.createElement("section");
    list.className = "print-links print-only";
    list.innerHTML = "<h2>Links</h2><ol></ol>";
    for (const href of numbers.keys()) {
      const li = document.createElement("li");
      li.textContent = plain(href);
      list.querySelector("ol")!.append(li);
    }
    end.append(list);
    added.push(list);
  }

  const stamp = document.createElement("div");
  stamp.className = "print-stamp";
  const where = document.createElement("span");
  where.append(`printed ${stampDate()} from`, document.createElement("br"), plain(location.href));
  const seal = document.createElement("span");
  seal.innerHTML = SEAL;
  stamp.append(where, seal);
  end.append(stamp);
  added.push(stamp);
});

window.addEventListener("afterprint", () => {
  added.splice(0).forEach((el) => el.remove());
});
