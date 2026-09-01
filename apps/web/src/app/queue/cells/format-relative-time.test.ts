import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { formatRelativeTime } from "./format-relative-time";

const NOW = new Date("2026-08-30T12:00:00Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

test("formats a time in the past using the largest sensible unit", () => {
  expect(formatRelativeTime("2026-08-30T11:59:30Z")).toBe("30 seconds ago");
  expect(formatRelativeTime("2026-08-30T11:55:00Z")).toBe("5 minutes ago");
  expect(formatRelativeTime("2026-08-30T09:00:00Z")).toBe("3 hours ago");
  expect(formatRelativeTime("2026-08-27T12:00:00Z")).toBe("3 days ago");
  expect(formatRelativeTime("2026-08-16T12:00:00Z")).toBe("2 weeks ago");
});

test("formats a time in the future", () => {
  expect(formatRelativeTime("2026-08-30T13:00:00Z")).toBe("in 1 hour");
});

test("does not report '72 hours ago' when 'days' is the more natural unit", () => {
  // The real bug this guards against: dividing by the smallest unit that
  // still clears 1 (e.g. always preferring hours) would say "72 hours ago"
  // instead of "3 days ago" -- units are checked largest-first specifically
  // to avoid this.
  expect(formatRelativeTime("2026-08-27T12:00:00Z")).not.toContain("hours");
});
