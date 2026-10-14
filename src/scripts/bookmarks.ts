import { fillArt } from "./art";

const rack = document.querySelector<HTMLElement>(".rack");
const nav = document.querySelector<HTMLElement>(".rack-nav");
if (rack && nav) {
  const [back, forward] = nav.querySelectorAll<HTMLButtonElement>(".rack-step");

  const soak =
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !sessionStorage.getItem("shiori-soaked");
  sessionStorage.setItem("shiori-soaked", "1");

  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        seen.unobserve(entry.target);
        fillArt(entry.target as SVGSVGElement).then(() => {
          if (soak) entry.target.classList.add("soak");
        });
      }
    },
    { root: rack, rootMargin: "0px 640px" },
  );
  rack.querySelectorAll<SVGSVGElement>("svg[data-art]").forEach((svg) => seen.observe(svg));

  // arrows and edge fades only while the shelf is wider than the page
  const ends = () => {
    const maxScroll = rack.scrollWidth - rack.clientWidth;
    nav.hidden = maxScroll < 2;
    back.disabled = rack.scrollLeft < 2;
    forward.disabled = rack.scrollLeft > maxScroll - 2;
    rack.classList.toggle("more-back", !nav.hidden && !back.disabled);
    rack.classList.toggle("more-on", !nav.hidden && !forward.disabled);
  };
  ends();
  rack.addEventListener("scroll", ends, { passive: true });
  new ResizeObserver(ends).observe(rack);

  const still = matchMedia("(prefers-reduced-motion: reduce)");

  const stops = () => {
    const padding = parseFloat(getComputedStyle(rack).scrollPaddingLeft) || 0;
    const maxScroll = rack.scrollWidth - rack.clientWidth;
    const left = rack.getBoundingClientRect().left + rack.clientLeft - rack.scrollLeft;
    return [...rack.querySelectorAll<HTMLElement>(".shiori")]
      .map((shiori) => {
        const box = shiori.getBoundingClientRect();
        return getComputedStyle(shiori).scrollSnapAlign.includes("center")
          ? box.left - left + box.width / 2 - rack.clientWidth / 2
          : box.left - left - padding;
      })
      .map((x) => Math.round(Math.max(0, Math.min(maxScroll, x))));
  };
  let settle = 0;
  let swaying = false;
  const unsnap = () => {
    rack.style.scrollSnapType = "none";
    const done = () => {
      clearTimeout(settle);
      settle = window.setTimeout(function again() {
        if (swaying) {
          settle = window.setTimeout(again, 80);
          return;
        }
        rack.style.removeProperty("scroll-snap-type");
        rack.removeEventListener("scroll", done);
      }, 160);
    };
    rack.addEventListener("scroll", done, { passive: true });
    done();
  };
  for (const button of [back, forward])
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.step);
      const x = rack.scrollLeft;
      const want = x + direction * rack.clientWidth * 0.8;
      const allStops = [...new Set(stops())].sort((former, latter) => former - latter);
      const ahead = allStops.filter((stop) => (direction > 0 ? stop > x + 2 : stop < x - 2));
      if (!ahead.length) return;
      const within = ahead.filter((stop) => (direction > 0 ? stop <= want : stop >= want));
      const destination = within.length
        ? direction > 0
          ? within.at(-1)!
          : within[0]
        : direction > 0
          ? ahead[0]
          : ahead.at(-1)!;
      unsnap();
      rack.scrollTo({ left: destination, behavior: still.matches ? "auto" : "smooth" });
    });

  // moving the shelf leaves the bookmarks leaning behind
  const finger = matchMedia("(pointer: coarse)");
  if (!still.matches && !finger.matches) {
    const CORD_LAG = 1.8;
    const hanging = [...rack.querySelectorAll<HTMLElement>(".shiori")].map((mark) => ({
      mark,
      cord: mark.querySelector<SVGSVGElement>(".cord")!,
      give: parseFloat(mark.style.getPropertyValue("--give")) || 1,
    }));
    const lean = (angle: number | null) => {
      for (const { mark, cord, give } of hanging) {
        mark.style.rotate = angle === null ? "" : `${(angle * give).toFixed(3)}deg`;
        cord.style.rotate = angle === null ? "" : `${(angle * give * CORD_LAG).toFixed(3)}deg`;
      }
    };
    let last = rack.scrollLeft;
    let lastT = performance.now();
    let push = 0;
    let sway = 0;
    let velocity = 0;
    let frame = 0;
    const step = () => {
      velocity = (velocity + (push - sway) * 0.08) * 0.86;
      sway += velocity;
      push *= 0.85;
      const rest = Math.abs(sway) + Math.abs(velocity) + Math.abs(push) < 0.01;
      lean(rest ? null : sway);
      swaying = !rest;
      frame = rest ? 0 : requestAnimationFrame(step);
    };
    rack.addEventListener(
      "scroll",
      () => {
        const now = performance.now();
        const speed = (rack.scrollLeft - last) / Math.max(8, now - lastT);
        last = rack.scrollLeft;
        lastT = now;
        push = Math.max(-4, Math.min(4, speed * 2));
        frame ||= requestAnimationFrame(step);
      },
      { passive: true },
    );
  }

  // pull a bookmark up by its cord
  rack.addEventListener("pointerdown", (event) => {
    const cord = (event.target as Element).closest<SVGSVGElement>(".shiori:not(.blank) .cord");
    if (!cord) return;
    const mark = cord.closest<HTMLElement>(".shiori")!;
    const href = mark.querySelector<HTMLAnchorElement>(".open")!.href;
    event.preventDefault();
    cord.setPointerCapture(event.pointerId);
    mark.classList.add("pulling");
    const startY = event.clientY;
    let pull = 0;
    let moved = 0;
    const move = (moveEvent: PointerEvent) => {
      const drag = Math.max(0, startY - moveEvent.clientY);
      moved = Math.max(moved, Math.abs(startY - moveEvent.clientY));
      pull = 90 * (1 - Math.exp(-drag / 90));
      mark.style.setProperty("--pull", `${pull.toFixed(1)}px`);
    };
    const release = (releaseEvent: PointerEvent) => {
      cord.removeEventListener("pointermove", move);
      cord.removeEventListener("pointerup", release);
      cord.removeEventListener("pointercancel", release);
      mark.classList.remove("pulling");
      if (releaseEvent.type === "pointerup" && (pull > 60 || moved < 4)) {
        mark.classList.add("leaving");
        setTimeout(() => location.assign(href), still.matches ? 0 : 280);
      } else mark.style.removeProperty("--pull");
    };
    cord.addEventListener("pointermove", move);
    cord.addEventListener("pointerup", release);
    cord.addEventListener("pointercancel", release);
  });

  // coming back to the page puts it back in the rack
  addEventListener("pageshow", () => {
    for (const shiori of rack.querySelectorAll<HTMLElement>(".leaving")) {
      shiori.classList.remove("leaving");
      shiori.style.removeProperty("--pull");
    }
  });

  // empty bookmark keeps trying out the next place
  const subject = rack.querySelector<SVGPathElement>(".blank .subject");
  const reveal = rack.querySelector<HTMLElement>(".blank .reveal");
  const revealInner = reveal?.firstElementChild as HTMLElement | null;
  if (subject && reveal && revealInner && !still.matches) {
    const between = (low: number, high: number) => low + Math.random() * (high - low);
    const round1 = (value: number) => Math.round(value * 10) / 10;
    const sketches = [
      // row of houses
      () => {
        let path = "";
        for (let x = between(4, 10); x < 86;) {
          const width = between(18, 28);
          const top = between(130, 165);
          path += `M${round1(x)} 210 V${round1(top)} `;
          path +=
            Math.random() < 0.6
              ? `L${round1(x + width / 2)} ${round1(top - between(10, 18))} L${round1(x + width)} ${round1(top)} `
              : `H${round1(x + width)} `;
          path += "V210 ";
          x += width + between(0, 4);
        }
        return path;
      },
      // ridge and its sun
      () => {
        let path = `M0 ${round1(between(170, 190))}`;
        for (let x = between(8, 14); x < 100; x += between(10, 18))
          path += ` L${round1(x)} ${round1(between(110, 190))}`;
        const sunX = between(20, 80);
        const sunY = between(55, 90);
        return `${path} L100 ${round1(between(150, 190))} M${round1(sunX - 7)} ${round1(sunY)} a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0`;
      },
      // horizon, few waves and sail
      () => {
        const y = between(150, 175);
        let path = `M0 ${round1(y)} H100`;
        for (let i = 0; i < 4; i++)
          path += ` M${round1(between(6, 70))} ${round1(y + between(15, 90))} q4 -4 8 0 q4 -4 8 0`;
        const boatX = between(20, 70);
        return `${path} M${round1(boatX)} ${round1(y - 2)} h14 l-3 5 h-8 z M${round1(boatX + 7)} ${round1(y - 2)} V${round1(y - 28)} L${round1(boatX + 17)} ${round1(y - 6)}`;
      },
      // cliff with small white town
      () => {
        const edge = between(48, 62);
        let path = `M${round1(edge)} 300`;
        for (let y = 280; y > 130; y -= 15) path += ` L${round1(edge + between(-6, 6))} ${y}`;
        path += ` L${round1(edge)} 130 H100`;
        for (let x = edge + 2; x < 90; x += between(9, 12))
          path += ` M${round1(x)} 130 v-${round1(between(8, 15))} h${round1(between(6, 8))} V130`;
        return path;
      },
    ];

    let shown = false;
    new IntersectionObserver(([entry]) => (shown = entry.isIntersecting), {
      threshold: 0.3,
    }).observe(subject.closest(".shiori")!);

    const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    (async () => {
      for (let index = 1; ; index = (index + 1) % sketches.length) {
        await pause(4000);
        while (!shown || document.hidden) await pause(500);
        await reveal.animate([{ opacity: 0 }], { duration: 700, fill: "forwards" }).finished;
        subject.setAttribute("d", sketches[index]());
        reveal.getAnimations().forEach((animation) => animation.cancel());
        const sweep = { duration: 2600, easing: "ease-in-out" };
        await Promise.all([
          reveal.animate([{ transform: "translateX(-100%)" }, { transform: "none" }], sweep)
            .finished,
          revealInner.animate([{ transform: "translateX(100%)" }, { transform: "none" }], sweep)
            .finished,
        ]);
      }
    })();
  }

  // terrain tag sifts the shelf
  const sift = document.querySelector<HTMLButtonElement>(".sift")!;
  const marks = [...rack.querySelectorAll<HTMLElement>(".shiori[data-terrain]")];
  let only: string | null = null;
  const choose = (tag: string | null) => {
    only = tag === only ? null : tag;
    rack.toggleAttribute("data-sifting", only !== null);
    sift.hidden = only === null;
    sift.querySelector(".sift-tag")!.textContent = only ?? "";
    for (const button of rack.querySelectorAll<HTMLButtonElement>(".tag"))
      button.setAttribute("aria-pressed", String(button.dataset.tag === only));
    const hits = marks.filter((shiori) => {
      const hit = only !== null && shiori.dataset.terrain!.split(" ").includes(only);
      shiori.classList.toggle("match", hit);
      return hit;
    });
    hits[0]?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: still.matches ? "auto" : "smooth",
    });
  };
  rack.addEventListener("click", (event) => {
    const tag = (event.target as Element).closest<HTMLButtonElement>(".tag");
    if (tag) choose(tag.dataset.tag!);
  });
  sift.addEventListener("click", () => choose(null));
  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && only !== null) choose(null);
  });
}
