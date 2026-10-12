interface Radio {
  on: boolean;
  start(): void;
  stop(): void;
  toggle(): void;
  about(): string;
  onChange(f: (on: boolean) => void): void;
}

export function broadcastOf(fig: HTMLElement, radio: Radio, incense: { left: string | null }) {
  const knob = fig.querySelector<HTMLButtonElement>(".broadcast")!;
  const strip = document.createElement("div");
  strip.className = "radio-strip";
  strip.innerHTML = `<span class="rs-now"></span><span class="rs-incense"></span>
    <button type="button" class="rs-sound" aria-pressed="false" aria-label="Sound">音</button>
    <button type="button" class="rs-out" aria-label="Back to the page">放</button>`;
  fig.after(strip);
  const curtain = document.createElement("div");
  curtain.className = "radio-curtain";
  document.body.append(curtain);
  const now = strip.querySelector<HTMLElement>(".rs-now")!;
  const inc = strip.querySelector<HTMLElement>(".rs-incense")!;
  const sound = strip.querySelector<HTMLButtonElement>(".rs-sound")!;
  let lock: WakeLockSentinel | null = null;
  let still = 0;
  let timer = 0;
  let inside = false;
  let busy = false;
  let full = false;
  let y = 0;

  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // the curtain over the page, or off it
  function draw(over: boolean, at = false) {
    return new Promise<void>((done) => {
      if (curtain.classList.contains("over") === over) return done();
      if (at || reduced()) {
        curtain.style.transition = "none";
        curtain.classList.toggle("over", over);
        void curtain.offsetWidth;
        curtain.style.transition = "";
        return done();
      }
      const end = () => {
        curtain.removeEventListener("transitionend", end);
        done();
      };
      curtain.addEventListener("transitionend", end);
      curtain.classList.toggle("over", over);
    });
  }

  // the screen takes a moment to grow or shrink: wait for it to be quiet
  const settle = () =>
    new Promise<void>((ok) => {
      let t = 0;
      const quiet = (ms: number) => {
        clearTimeout(t);
        t = window.setTimeout(() => {
          removeEventListener("resize", again);
          requestAnimationFrame(() => ok());
        }, ms);
      };
      const again = () => quiet(150);
      addEventListener("resize", again);
      quiet(250);
    });

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

  async function enter() {
    if (inside || busy) return;
    inside = busy = true;
    knob.setAttribute("aria-pressed", "true");
    radio.start();
    y = scrollY;
    await draw(true);
    document.body.classList.add("engawa-radio");
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: "hide" });
      full = !!document.fullscreenElement;
    } catch {
      // no fullscreen to be had: the page alone fills the window
      full = false;
    }
    await settle();
    show();
    timer = window.setInterval(show, 1000);
    wake();
    busy = false;
    await draw(false);
    try {
      lock = await navigator.wakeLock?.request("screen");
    } catch {
      lock = null;
    }
  }

  async function leave() {
    if (!inside || busy) return;
    inside = false;
    busy = true;
    clearInterval(timer);
    clearTimeout(still);
    lock?.release();
    lock = null;
    knob.setAttribute("aria-pressed", "false");
    await draw(true, full && !document.fullscreenElement);
    document.body.classList.remove("engawa-radio", "radio-still");
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    full = false;
    scrollTo({ top: y, behavior: "instant" });
    await settle();
    scrollTo({ top: y, behavior: "instant" });
    busy = false;
    await draw(false);
  }

  knob.addEventListener("click", () => (inside ? leave() : enter()));
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
