import type { Radio } from "./radio";

export function sliderOf(radio: Radio) {
  const s = document.createElement("input");
  s.type = "range";
  s.className = "volume";
  s.min = "0";
  s.max = "1";
  s.step = "0.05";
  s.value = String(radio.volume);
  s.setAttribute("aria-label", "Volume");
  s.addEventListener("input", () => radio.setVolume(Number(s.value)));
  radio.onVolume((v) => Number(s.value) !== v && (s.value = String(v)));
  return s;
}
