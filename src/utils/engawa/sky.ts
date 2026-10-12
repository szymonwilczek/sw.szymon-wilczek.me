import { koOf, sunOf } from "../koyomi";

export type Season = "haru" | "natsu" | "aki" | "fuyu";
export const SEASONS: Season[] = ["haru", "natsu", "aki", "fuyu"];

export function seasonOf(date: Date): Season {
  return SEASONS[Math.floor((koOf(date).ko.n - 1) / 18)];
}

/** Hours since local midnight, as a fraction */
export function hourOf(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

const LAT = 52;
function lonOf(date: Date): number {
  const y = date.getFullYear();
  const std = Math.max(
    new Date(y, 0, 1).getTimezoneOffset(),
    new Date(y, 6, 1).getTimezoneOffset(),
  );
  return -std / 4;
}

/** Today's sunrise and sunset in local hours, or null under midnight sun or polar night */
export function sunHours(date: Date): { rise: number; set: number } | null {
  const sun = sunOf(date, LAT, lonOf(date));
  return sun && { rise: hourOf(sun.rise), set: hourOf(sun.set) };
}

export interface Sky {
  hour: number;
  season: Season;
  sun: { rise: number; set: number } | null;
}

export function skyOf(date: Date): Sky {
  return { hour: hourOf(date), season: seasonOf(date), sun: sunHours(date) };
}
