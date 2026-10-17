import { describe, it, expect } from "vitest";
import {
  emptyState,
  stamp,
  Routine,
  localDate,
  dateAt,
  weekStart,
} from "../src/domain/model";
import {
  saveRoutine,
  generate,
  complete,
  undo,
  stats,
} from "../src/domain/engine";
const today = localDate();
const routine = (patch: Partial<Routine> = {}): Routine => ({
  ...stamp(),
  title: "독서",
  category: "독서",
  description: null,
  frequencyType: "daily",
  weeklyTarget: 3,
  preferredDays: [1, 3, 5],
  durationMinutes: 20,
  reminderTime: null,
  startDate: today,
  endDate: null,
  isActive: true,
  ...patch,
});
describe("routine and scheduling", () => {
  it("creates and updates without duplicate occurrences", () => {
    const s = emptyState(),
      r = routine();
    saveRoutine(s, r);
    expect(s.occurrences).toHaveLength(31);
    generate(s);
    generate(s);
    expect(s.occurrences).toHaveLength(31);
    saveRoutine(s, { ...r, title: "새 제목", reminderTime: "20:30" });
    expect(s.routines[0].title).toBe("새 제목");
    expect(s.occurrences).toHaveLength(31);
    expect(new Date(s.occurrences[0].scheduledAt).getHours()).toBe(20);
  });
  it("respects selected weekdays and date bounds", () => {
    const s = emptyState();
    saveRoutine(
      s,
      routine({
        startDate: "2026-10-01",
        endDate: "2026-10-10",
        frequencyType: "weekdays",
        preferredDays: [1, 3],
      }),
      "2026-10-01",
    );
    expect(s.occurrences.map((o) => o.localDate)).toEqual([
      "2026-10-05",
      "2026-10-07",
    ]);
  });
  it("tracks weekly targets without assigning days", () => {
    const s = emptyState();
    saveRoutine(s, routine({ frequencyType: "weekly" }));
    expect(s.occurrences).toHaveLength(0);
    expect(stats(s).weeklyGoal).toBe(3);
    complete(s, s.routines[0].id);
    expect(stats(s).weeklyDone).toBe(1);
  });
  it("does not include expired weekly targets", () => {
    const s = emptyState();
    saveRoutine(
      s,
      routine({
        frequencyType: "weekly",
        startDate: "2020-01-01",
        endDate: "2020-02-01",
      }),
    );
    expect(stats(s).weeklyGoal).toBe(0);
  });
  it("generates a one-off only once", () => {
    const s = emptyState();
    saveRoutine(s, routine({ frequencyType: "once" }));
    generate(s);
    expect(s.occurrences).toHaveLength(1);
  });
  it("preserves completed history when editing and disabling", () => {
    const s = emptyState(),
      r = routine();
    saveRoutine(s, r);
    complete(s, r.id, s.occurrences[0].id);
    saveRoutine(s, { ...r, isActive: false });
    expect(s.occurrences).toHaveLength(1);
    expect(s.logs).toHaveLength(1);
    expect(s.occurrences[0].status).toBe("completed");
    expect(() => complete(s, r.id)).toThrow();
  });
  it("backfills missed days after a long absence", () => {
    const s = emptyState();
    saveRoutine(s, routine({ startDate: "2026-01-01" }), "2026-01-01");
    generate(s, "2026-10-01");
    expect(s.occurrences.some((o) => o.localDate === "2026-05-15")).toBe(true);
    const size = s.occurrences.length;
    generate(s, "2026-10-01");
    expect(s.occurrences).toHaveLength(size);
  });
  it("validates empty, invalid dates, time, and weekly targets", () => {
    for (const patch of [
      { title: "" },
      { startDate: "2026-02-30" },
      { endDate: "2020-01-01" },
      { reminderTime: "25:00" },
      { frequencyType: "weekly" as const, weeklyTarget: 0 },
      { durationMinutes: -1 },
      { frequencyType: "weekdays" as const, preferredDays: [] },
    ])
      expect(() => saveRoutine(emptyState(), routine(patch))).toThrow();
  });
  it("uses local calendar day and Monday week start", () => {
    expect(localDate(dateAt("2026-10-17"))).toBe("2026-10-17");
    expect(weekStart("2026-10-18")).toBe("2026-10-12");
  });
});
describe("completion and statistics", () => {
  it("completes idempotently and undoes with consistent links", () => {
    const s = emptyState(),
      r = routine();
    saveRoutine(s, r);
    const o = s.occurrences[0];
    complete(s, r.id, o.id);
    complete(s, r.id, o.id);
    expect(s.logs).toHaveLength(1);
    expect(o.completedLogId).toBe(s.logs[0].id);
    expect(stats(s).minutes).toBe(20);
    undo(s, s.logs[0].id);
    expect(o.status).toBe("planned");
    expect(o.completedLogId).toBeNull();
    expect(stats(s).minutes).toBe(0);
    complete(s, r.id, o.id);
    expect(s.logs.filter((l) => !l.deletedAt)).toHaveLength(1);
  });
  it("rejects missing routine/occurrence and undo", () => {
    const s = emptyState(),
      r = routine();
    saveRoutine(s, r);
    expect(() => complete(s, "missing")).toThrow();
    expect(() => complete(s, r.id, "missing")).toThrow();
    expect(() => undo(s, "missing")).toThrow();
  });
  it("calculates only real nondeleted data with empty-safe totals", () => {
    const s = emptyState();
    expect(stats(s)).toMatchObject({
      weeklyDone: 0,
      weeklyGoal: 0,
      month: 0,
      year: 0,
      minutes: 0,
    });
    expect(stats(s).trends).toHaveLength(6);
    const r = routine();
    saveRoutine(s, r);
    complete(s, r.id, s.occurrences[0].id);
    expect(stats(s)).toMatchObject({
      weeklyDone: 1,
      month: 1,
      year: 1,
      minutes: 20,
    });
  });
});

it("rebuilds future local times after timezone changes without losing completions", () => {
  const s = emptyState(),
    r = routine();
  saveRoutine(s, r);
  complete(s, r.id, s.occurrences[0].id);
  const id = s.logs[0].id;
  s.routines[0].scheduleTimeZone = "previous-zone";
  generate(s);
  expect(s.logs[0].id).toBe(id);
  expect(s.occurrences).toHaveLength(31);
  expect(s.occurrences[0].status).toBe("completed");
  expect(s.routines[0].scheduleTimeZone).toBe(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
});
it("preserves wall-clock hours across daylight-saving calendar changes", () => {
  const s = emptyState();
  saveRoutine(
    s,
    routine({
      startDate: "2026-03-07",
      endDate: "2026-03-10",
      reminderTime: "09:30",
    }),
    "2026-03-07",
  );
  expect(s.occurrences.map((o) => new Date(o.scheduledAt).getHours())).toEqual([
    9, 9, 9, 9,
  ]);
  expect(s.occurrences.map((o) => o.localDate)).toEqual([
    "2026-03-07",
    "2026-03-08",
    "2026-03-09",
    "2026-03-10",
  ]);
});

it("parses local completion input into a real instant and rejects invalid input", async () => {
  const { parseLocalDateTime } = await import("../src/domain/model");
  expect(localDate(new Date(parseLocalDateTime("2026-10-17 18:45")))).toBe(
    "2026-10-17",
  );
  expect(() => parseLocalDateTime("2026-02-30 12:00")).toThrow();
  expect(() => parseLocalDateTime("2026-10-17 25:00")).toThrow();
});
