import { it, expect } from "vitest";
import {
  emptyState,
  stamp,
  dateAt,
  Routine,
  CompletionLog,
} from "../src/domain/model";
import { buildAnalytics, periodRange } from "../src/domain/analytics";
const fixture = () => {
  const s = emptyState();
  const r: Routine = {
    ...stamp(),
    title: "독서",
    category: "독서",
    description: null,
    frequencyType: "weekly",
    weeklyTarget: 2,
    preferredDays: [],
    durationMinutes: null,
    reminderTime: null,
    startDate: "2026-01-01",
    endDate: null,
    isActive: true,
  };
  s.routines.push(r);
  const log = (
    day: string,
    minutes: number | null,
    deleted = false,
  ): CompletionLog => ({
    ...stamp(),
    routineId: r.id,
    plannedOccurrenceId: null,
    completedAt: dateAt(day, "23:59").toISOString(),
    actualDurationMinutes: minutes,
    note: null,
    deletedAt: deleted ? new Date().toISOString() : null,
  });
  s.logs.push(
    log("2026-10-12", 20),
    log("2026-10-18", null),
    log("2026-09-30", 40),
    log("2025-12-31", 60),
    log("2026-10-15", 500, true),
  );
  return { s, r };
};
it("weekly graphs match source logs, count actual minutes only and do not require daily streaks", () => {
  const { s } = fixture(),
    a = buildAnalytics(s, "2026-10-18", "주", "전체", "2026-10-18");
  expect(a.logs).toHaveLength(2);
  expect(a.currentCount).toBe(2);
  expect(a.currentMinutes).toBe(20);
  expect(a.rate).toBe(100);
  expect(a.activeDays).toBe(2);
  expect(a.days[0]).toMatchObject({
    date: "2026-10-12",
    count: 1,
    minutes: 20,
  });
  expect(a.days[6]).toMatchObject({ count: 1, minutes: 0, planned: 0 });
  expect(a.activities[0]).toMatchObject({ count: 2, minutes: 20, missing: 1 });
  expect(a.goals[0]).toMatchObject({ target: 2, done: 2 });
  expect(a.time.at(-1)?.minutes).toBe(20);
});
it("supports monthly, yearly and activity filtering with local calendar boundaries", () => {
  const { s, r } = fixture();
  expect(buildAnalytics(s, "2026-10-18", "월").logs).toHaveLength(2);
  const a = buildAnalytics(s, "2026-10-18", "년");
  expect(a.logs).toHaveLength(3);
  expect(a.time.find((t) => t.label === "2026-09")?.minutes).toBe(40);
  expect(a.time.find((t) => t.label === "2026-10")?.minutes).toBe(20);
  expect(buildAnalytics(s, "2026-10-18", "년", "missing").logs).toHaveLength(0);
  expect(buildAnalytics(s, "2026-10-18", "일", r.id).logs).toHaveLength(1);
  expect(periodRange("2026-12-31", "월")).toEqual({
    from: "2026-12-01",
    to: "2027-01-01",
  });
});
it("handles empty data, zero targets, and routines without weekly goals", () => {
  const s = emptyState();
  expect(buildAnalytics(s, "2026-10-18", "주")).toMatchObject({
    currentCount: 0,
    currentMinutes: 0,
    rate: null,
    goals: [],
    activities: [],
  });
  const f = fixture();
  f.s.routines[0].frequencyType = "daily";
  expect(buildAnalytics(f.s, "2026-10-18", "주").goals).toEqual([]);
});
it("excludes inactive and out-of-period weekly goals without losing real logs", () => {
  const { s } = fixture();
  s.routines[0].isActive = false;
  const a = buildAnalytics(s, "2026-10-18", "년");
  expect(a.goals).toEqual([]);
  expect(a.logs).toHaveLength(3);
});
