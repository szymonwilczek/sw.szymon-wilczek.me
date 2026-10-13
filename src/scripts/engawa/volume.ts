import type { Radio } from "./radio";

export function sliderOf(radio: Radio) {
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "volume";
  slider.min = "0";
  slider.max = "1";
  slider.step = "0.05";
  slider.value = String(radio.volume);
  slider.setAttribute("aria-label", "Volume");
  slider.addEventListener("input", () => radio.setVolume(Number(slider.value)));
  radio.onVolume((level) => Number(slider.value) !== level && (slider.value = String(level)));
  return slider;
}
