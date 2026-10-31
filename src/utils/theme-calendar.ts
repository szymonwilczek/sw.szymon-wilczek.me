import auThemes from "../data/au-themes.json";
import calendar from "../data/theme-calendar.json";

const published = new Set(auThemes.map((theme) => theme.id));

// "10-24" as 1024, comparable with the visitor's month * 100 + day
const monthDay = (date: string) => Number(date.replace("-", ""));

export const themeCalendar = {
  fallback: { name: "default", ...calendar.fallback },
  periods: calendar.periods
    .filter((period) => published.has(period.light) && published.has(period.dark))
    .map((period) => ({ ...period, from: monthDay(period.from), to: monthDay(period.to) })),
};
