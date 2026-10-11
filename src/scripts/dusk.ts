import { onIdle } from "../utils/idle";

const WAIT = 60_000;

const shade = document.createElement("div");
shade.className = "dusk";
shade.setAttribute("aria-hidden", "true");
document.body.append(shade);

onIdle(
  WAIT,
  () => shade.classList.add("is-down"),
  () => shade.classList.contains("is-down") && shade.classList.remove("is-down"),
);
