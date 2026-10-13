// inside the workshop, seen from above with the roof off

import { sceneWorkshop } from "../../utils/tea/ink.js";
import { tones, stage, load, save, fresh, type Work, type Step } from "./stage";

type Station = "wheel" | "shelf" | "glaze" | "brush" | "kiln";
const STATION_FOR: Record<Step, Station | null> = {
  wheel: "wheel",
  shelf: "shelf",
  bisque: "kiln",
  glaze: "glaze",
  fire: "kiln",
  brush: "brush",
  done: null,
};
const NEXT_STEP: Record<Step, string> = {
  wheel: "the wheel is free. start there.",
  shelf: "your piece is still wet on the wheel. take it to the drying shelf.",
  bisque: "it is bone dry. carry it out to the kiln for its first firing.",
  glaze: "fired once, pale and dry. choose a glaze.",
  fire: "glazed. back out to the kiln.",
  brush: "out of the kiln. paint it, seal it, sign it.",
  done: "your piece is on the shelf in the waiting room.",
};
const NAMES: Record<Station, string> = {
  wheel: "the wheel",
  shelf: "the drying shelf",
  glaze: "the glazes",
  brush: "the brush and the seal",
  kiln: "the kiln",
};

const stations = {
  wheel: () => import("./wheel"),
  shelf: () => import("./shelf"),
  kiln: () => import("./kiln"),
  glaze: () => import("./glaze"),
  brush: () => import("./brush"),
};

export function enter(host: HTMLElement, leave: () => void) {
  room(host, load(), leave);
}

function room(host: HTMLElement, work: Work, leave: () => void) {
  const scene = sceneWorkshop(tones);
  const view = stage(host, scene.W, scene.H, ["工房", "the workshop"], scene.groups);
  view.root.classList.add("kobo-room");
  const current = STATION_FOR[work.step];
  view.say(NEXT_STEP[work.step]);
  view.over("Back to the garden", 110, 34, 220, 44, leave);
  for (const { id, x, y } of scene.spots as { id: Station; x: number; y: number }[]) {
    view.svg.querySelector(`.kobo-${id}`)?.classList.add(id === current ? "now" : "later");
    view.over(NAMES[id], x, y - 40, 120, 120, async () => {
      if (id !== current) {
        view.say(current ? `not yet. ${NEXT_STEP[work.step]}` : NEXT_STEP[work.step]);
        return;
      }
      const { run } = await stations[id]();
      run(
        host,
        work,
        (next: Work) => {
          save(next);
          room(host, next, leave);
        },
        () => room(host, load(), leave),
      );
    });
  }
  if (work.step === "done") {
    view.button("make another piece", () => {
      const blank = fresh();
      save(blank);
      room(host, blank, leave);
    });
  } else if (work.step !== "wheel") {
    view.button(
      "throw it back in the clay bin",
      () => {
        if (!confirm("Start again with a fresh lump? This piece is lost.")) return;
        const blank = fresh();
        save(blank);
        room(host, blank, leave);
      },
      "quiet",
    );
  }
}
