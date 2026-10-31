// Linked images open over the page
const ORIGINAL = /\.(png|jpe?g|webp|avif)$/i;

const links = Array.from(
  document.querySelectorAll<HTMLAnchorElement>(".prose a:has(> img)"),
).filter((link) => ORIGINAL.test(link.pathname));

function warm(link: HTMLAnchorElement) {
  new Image().src = link.href;
}

function openViewer() {
  const view = document.createElement("dialog");
  view.className = "shot-view";
  view.setAttribute("aria-label", "Full size image");
  view.innerHTML = `
    <img alt="" />
    <p class="shot-bar">
      <button type="button" data-step="-1" aria-label="Previous image">←</button>
      <span class="shot-count"></span>
      <a href="${links[0].href}" target="_blank" rel="noopener">original ↗</a>
      <button type="button" data-step="1" aria-label="Next image">→</button>
    </p>`;
  document.body.append(view);

  const image = view.querySelector("img")!;
  const count = view.querySelector(".shot-count")!;
  const original = view.querySelector("a")!;
  let current = 0;

  function show(index: number) {
    current = (index + links.length) % links.length;
    const link = links[current];
    const preview = link.querySelector("img")!;
    image.src = preview.currentSrc || preview.src;
    image.alt = preview.alt;
    view.style.setProperty("--shot-ratio", String(preview.width / preview.height));
    count.textContent = `${current + 1} / ${links.length}`;
    original.href = link.href;

    const full = new Image();
    full.src = link.href;
    full
      .decode()
      .then(() => {
        if (links[current] === link) image.src = link.href;
      })
      .catch(() => {});
    warm(links[(current + 1) % links.length]);
    warm(links[(current - 1 + links.length) % links.length]);
  }

  view.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target === view) view.close();
    const step = target.closest<HTMLElement>("[data-step]");
    if (step) show(current + Number(step.dataset.step));
  });

  view.addEventListener("keydown", (event) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (!step) return;
    event.stopPropagation();
    show(current + step);
  });

  links.forEach((link, index) => {
    link.addEventListener("pointerenter", () => warm(link), { once: true });
    link.addEventListener("click", (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      show(index);
      view.showModal();
    });
  });
}

if (links.length > 0) openViewer();

// Lazy images under an anchor start loading as soon as the pointer reaches its link
function warmSection(event: Event) {
  const link = (event.target as Element).closest?.<HTMLAnchorElement>('.prose a[href^="#"]');
  if (!link) return;
  let block = document.getElementById(decodeURIComponent(link.hash.slice(1)))?.nextElementSibling;
  while (block && !/^H[1-6]$/.test(block.tagName)) {
    block.querySelectorAll("img").forEach((image) => (image.loading = "eager"));
    block = block.nextElementSibling;
  }
}

document.addEventListener("pointerover", warmSection);
document.addEventListener("focusin", warmSection);
