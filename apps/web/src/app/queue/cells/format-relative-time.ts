const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

// Largest-first: division stops at the first unit where the value is >= 1,
// so "3 days ago" rather than "72 hours ago".
const UNITS: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "year", seconds: 31536000 },
  { unit: "month", seconds: 2592000 },
  { unit: "week", seconds: 604800 },
  { unit: "day", seconds: 86400 },
  { unit: "hour", seconds: 3600 },
  { unit: "minute", seconds: 60 },
];

export function formatRelativeTime(isoString: string): string {
  const diffSeconds = (new Date(isoString).getTime() - Date.now()) / 1000;

  for (const { unit, seconds } of UNITS) {
    if (Math.abs(diffSeconds) >= seconds) {
      return relativeTimeFormatter.format(
        Math.round(diffSeconds / seconds),
        unit,
      );
    }
  }

  return relativeTimeFormatter.format(Math.round(diffSeconds), "second");
}
