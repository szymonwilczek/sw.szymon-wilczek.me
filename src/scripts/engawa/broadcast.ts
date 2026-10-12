import { stillOf } from "./still";

interface Radio {
  on: boolean;
  start(): void;
  stop(): void;
  toggle(): void;
  about(): string;
  onChange(f: (on: boolean) => void): void;
}

export function broadcastOf(
  fig: HTMLElement,
  scene: { on: (f: () => void) => void },
  radio: Radio,
  incense: { left: string | null },
) {
  const knob = fig.querySelector<HTMLButtonElement>(".broadcast")!;
  const strip = document.createElement("div");
  strip.className = "radio-strip";
  strip.innerHTML = `<span class="rs-now"></span><span class="rs-incense"></span>
    <button type="button" class="rs-sound" aria-pressed="false" aria-label="Sound">音</button>
    <button type="button" class="rs-out" aria-label="Back to the page">放</button>`;
  fig.after(strip);
  const now = strip.querySelector<HTMLElement>(".rs-now")!;
  const inc = strip.querySelector<HTMLElement>(".rs-incense")!;
  const sound = strip.querySelector<HTMLButtonElement>(".rs-sound")!;
  let lock: WakeLockSentinel | null = null;
  let still = 0;
  let timer = 0;
  let inside = false;
  const picture = stillOf(fig);

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const after = (cls: string, f: () => void) => {
    if (reduced()) return f();
    fig.classList.add(cls);
    const end = (e: AnimationEvent) => {
      if (e.target !== fig) return;
      fig.removeEventListener("animationend", end);
      fig.classList.remove(cls);
      f();
    };
    fig.addEventListener("animationend", end);
  };

  function show() {
    now.textContent = radio.on ? `針 ${radio.about()}` : "針 the radio is quiet";
    inc.textContent = incense.left ? `香 ${incense.left}` : "";
    sound.setAttribute("aria-pressed", String(radio.on));
  }

  // strip and the cursor go when the mouse rests, and come at a touch
  function wake() {
    document.body.classList.remove("radio-still");
    clearTimeout(still);
    still = window.setTimeout(() => document.body.classList.add("radio-still"), 3000);
  }

  function enter() {
    if (inside) return;
    inside = true;
    radio.start();
    if (picture.ready) picture.show();
    after("radio-closing", async () => {
      document.body.classList.add("engawa-radio");
      try {
        await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
      } catch {
        // no fullscreen to be had: the page alone fills the window
      }
      after("radio-opening", () => picture.hide());
      picture.open();
      try {
        lock = await navigator.wakeLock?.request("screen");
      } catch {
        lock = null;
      }
      show();
      timer = window.setInterval(show, 1000);
      wake();
    });
    knob.setAttribute("aria-pressed", "true");
  }

  function leave() {
    if (!inside) return;
    inside = false;
    picture.hide();
    clearInterval(timer);
    clearTimeout(still);
    lock?.release();
    lock = null;
    document.body.classList.remove("engawa-radio", "radio-still");
    knob.setAttribute("aria-pressed", "false");
    if (document.fullscreenElement) document.exitFullscreen();
  }

  knob.addEventListener("click", () => (inside ? leave() : enter()));
  const make = () => !inside && !reduced() && picture.prepare();
  let seen = false;
  let wait = 0;
  const soon = () => {
    clearTimeout(wait);
    if (!seen) return;
    wait = window.setTimeout(
      () =>
        "requestIdleCallback" in window ? requestIdleCallback(make, { timeout: 2000 }) : make(),
      1500,
    );
  };
  new IntersectionObserver(([e]) => {
    seen = e.isIntersecting;
    soon();
  }).observe(knob);
  scene.on(soon);
  knob.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && make());
  knob.addEventListener("focus", make);
  strip.querySelector(".rs-out")!.addEventListener("click", leave);
  sound.addEventListener("click", () => {
    radio.toggle();
    show();
  });
  document.addEventListener("fullscreenchange", () => !document.fullscreenElement && leave());
  document.addEventListener(
    "keydown",
    (e) => {
      const card = fig.querySelector<HTMLElement>(".cards");
      if (e.key === "Escape" && inside && (!card || card.hidden)) leave();
    },
    true,
  );
  addEventListener("pointermove", () => inside && wake());

  // screen woke from sleep
  document.addEventListener("visibilitychange", async () => {
    if (inside && document.visibilityState === "visible" && (!lock || lock.released))
      lock = await navigator.wakeLock?.request("screen").catch(() => null);
  });

  // system's own play and pause, and what it shows as playing
  if ("mediaSession" in navigator) {
    navigator.mediaSession.setActionHandler("play", () => radio.start());
    navigator.mediaSession.setActionHandler("pause", () => radio.stop());
    radio.onChange((on) => {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "the house radio",
        artist: "縁側 · engawa",
        album: radio.about(),
      });
      navigator.mediaSession.playbackState = on ? "playing" : "paused";
      if (inside) show();
    });
  }
}
