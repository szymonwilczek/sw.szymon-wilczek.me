const SIGNS = ["pointermove", "pointerdown", "keydown", "wheel", "scroll", "touchstart"];

export function onIdle(wait: number, rest: () => void, stir: () => void) {
  let timer = 0;
  const again = () => {
    stir();
    clearTimeout(timer);
    timer = window.setTimeout(rest, wait);
  };
  for (const type of SIGNS) addEventListener(type, again, { passive: true });
  timer = window.setTimeout(rest, wait);
}
