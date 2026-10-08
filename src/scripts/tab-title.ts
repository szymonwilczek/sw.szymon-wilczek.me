// While the reader is in another tab, the title says the garden waits
// and the icon fades. Both come back the moment they return.

const AWAY = "· the garden waits ·";
const title = document.title;
const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
const iconHref = icon?.href;
let faded: string | null = null;

function fade() {
  if (!iconHref) return;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, 0, 0, 64, 64);
    faded = canvas.toDataURL("image/png");
  };
  img.src = iconHref;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    document.title = AWAY;
    if (icon && faded) icon.href = faded;
  } else {
    document.title = title;
    if (icon && iconHref) icon.href = iconHref;
  }
});

fade();
