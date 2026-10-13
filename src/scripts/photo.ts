import { earn } from "../utils/garden";

// walking down to the last frame earns a seal
const lastFrame = document.querySelector(".frames > li:last-child");
if (lastFrame) {
  const walked = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    walked.disconnect();
    earn("写");
  });
  walked.observe(lastFrame);
}

function setupLightbox() {
  const dialog = document.getElementById("lightbox") as HTMLDialogElement | null;
  const track = document.getElementById("lb-track");
  const caption = document.getElementById("lightbox-caption");
  const count = document.getElementById("lb-count");
  if (!dialog || !track) return;

  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-lightbox]"));
  const prev = dialog.querySelector<HTMLButtonElement>(".lb-prev")!;
  const next = dialog.querySelector<HTMLButtonElement>(".lb-next")!;
  const twoDigits = (value: number) => String(value).padStart(2, "0");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  let current = -1;
  let opened = -1;

  // track scrolls natively
  const sync = () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i === current || !links[i]) return;
    current = i;
    if (count) count.textContent = `${twoDigits(i + 1)} / ${twoDigits(links.length)}`;
    if (caption) caption.textContent = links[i].dataset.title || "";
    prev.disabled = i === 0;
    next.disabled = i === links.length - 1;
  };

  const goTo = (i: number, smooth = true) => {
    if (i < 0 || i >= links.length) return;
    track.scrollTo({
      left: i * track.clientWidth,
      behavior: smooth && !still.matches ? "smooth" : "instant",
    });
  };

  links.forEach((link, i) =>
    link.addEventListener("click", (event) => {
      event.preventDefault();
      opened = i;
      current = -1;
      dialog.showModal();
      goTo(i, false);
      sync();
    }),
  );

  track.addEventListener("scroll", sync, { passive: true });
  prev.addEventListener("click", () => goTo(current - 1));
  next.addEventListener("click", () => goTo(current + 1));

  // click beside the photo, not on it, closes
  dialog.addEventListener("click", (e) => {
    const clicked = e.target as HTMLElement;
    if (clicked === dialog || clicked.classList.contains("lb-slide")) dialog.close();
  });

  // leave the page at the photo you stopped on
  dialog.addEventListener("close", () => {
    if (current !== opened && links[current]) {
      links[current].closest("li")?.scrollIntoView({ block: "center" });
    }
  });

  dialog.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (["j", "ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      goTo(current + 1);
    } else if (["k", "ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      goTo(current - 1);
    }
  });
}

setupLightbox();
document.addEventListener("astro:after-swap", setupLightbox);

// story or contact sheet: the story is the album; the sheet is the roll
function setupViews() {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".views button");
  const frames = document.querySelector<HTMLElement>(".frames");
  const sheet = document.querySelector<HTMLElement>(".sheet");
  if (!frames || !sheet) return;

  buttons.forEach((button) =>
    button.addEventListener("click", () => {
      const view = button.dataset.view;
      buttons.forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      frames.hidden = view === "sheet";
      sheet.hidden = view !== "sheet";
    }),
  );

  // frame on the sheet opens the same lightbox as the story
  const shots = document.querySelectorAll<HTMLAnchorElement>(".frames .shot");
  sheet.querySelectorAll<HTMLAnchorElement>("[data-frame]").forEach((frame) =>
    frame.addEventListener("click", (event) => {
      event.preventDefault();
      shots[Number(frame.dataset.frame)]?.click();
    }),
  );

  // loupe follows a mouse over the sheet and reads the frame's EXIF
  const loupe = document.querySelector<HTMLElement>(".loupe")!;
  const lens = loupe.querySelector<HTMLElement>(".loupe-lens")!;
  const ZOOM = 2.5;

  sheet.addEventListener("pointermove", (event) => {
    const frame = (event.target as Element).closest<HTMLAnchorElement>("[data-loupe]");
    if (event.pointerType !== "mouse" || !frame) {
      loupe.classList.remove("is-on");
      return;
    }
    const box = frame.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    const image = frame.querySelector("img")!;

    const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight) * ZOOM;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const size = lens.offsetWidth;
    const offX = (width - box.width * ZOOM) / 2;
    const offY = (height - box.height * ZOOM) / 2;
    lens.style.backgroundImage = `url("${frame.dataset.loupe}"), url("${image.currentSrc}")`;
    lens.style.backgroundSize = `${width}px ${height}px`;
    lens.style.backgroundPosition = `${size / 2 - offX - x * box.width * ZOOM}px ${size / 2 - offY - y * box.height * ZOOM}px`;
    loupe.querySelector(".loupe-num")!.textContent =
      `▸ ${String(Number(frame.dataset.frame) + 1).padStart(2, "0")} · ${frame.getAttribute("aria-label")!.split(", ").pop()}`;
    loupe.querySelector(".loupe-exif")!.textContent = frame.dataset.exif ?? "";
    const right = event.clientX + 24 + loupe.offsetWidth < innerWidth;
    const left = right ? event.clientX + 24 : event.clientX - 24 - loupe.offsetWidth;
    loupe.classList.toggle("is-left", !right);
    loupe.style.translate = `${left}px ${event.clientY - size / 2}px`;
    loupe.classList.add("is-on");
  });
  sheet.addEventListener("pointerleave", () => loupe.classList.remove("is-on"));
}

setupViews();
