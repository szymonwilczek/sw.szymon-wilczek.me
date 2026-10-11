// Garden's tones as plain hex, for the previews the Worker draws for Emacs
// (librsvg knows neither var() nor color-mix()).
// Paste into the browser console on /roji in the light theme,
// then save what it copies as worker/src/tones.json.
(() => {
  const fig = document.querySelector(".roji");
  const names = [...fig.getAttribute("style").matchAll(/--tk-(\w+):/g)].map((m) => m[1]);
  const el = fig.appendChild(document.createElement("i"));
  const cx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const out = {};
  for (const n of names) {
    el.style.color = `var(--tk-${n})`;
    cx.clearRect(0, 0, 1, 1);
    cx.fillStyle = getComputedStyle(el).color;
    cx.fillRect(0, 0, 1, 1);
    const [r, g, b] = cx.getImageData(0, 0, 1, 1).data;
    out[n] = "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  el.remove();
  copy(JSON.stringify(out, null, 2));
})();
