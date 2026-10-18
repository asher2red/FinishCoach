import { it, expect } from "vitest";
import {
  toClock,
  fromClock,
  calendarDays,
  shiftMonth,
  shiftPeriod,
  displayTime,
} from "../src/domain/pickers";
import {
  dateAt,
  localDate,
  emptyState,
  stamp,
  Routine,
  validateRoutine,
} from "../src/domain/model";
import { saveRoutine } from "../src/domain/engine";
it("converts midnight, noon, AM/PM and every exact minute without loss", () => {
  expect(fromClock("오전", 12, 0)).toBe("00:00");
  expect(fromClock("오후", 12, 0)).toBe("12:00");
  expect(fromClock("오후", 8, 15)).toBe("20:15");
  for (let h = 0; h < 24; h++)
    for (let m = 0; m < 60; m++) {
      const time =
          String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"),
        c = toClock(time);
      expect(fromClock(c.period, c.hour, c.minute)).toBe(time);
    }
  expect(displayTime("23:59")).toBe("오후 11시 59분");
});
it("uses calendar month/year navigation, leap years and local dates", () => {
  expect(shiftMonth("2026-01-31", 1)).toBe("2026-02-28");
  expect(shiftMonth("2024-01-31", 1)).toBe("2024-02-29");
  expect(shiftPeriod("2024-02-29", "년", 1)).toBe("2025-02-28");
  expect(shiftPeriod("2026-10-18", "주", 1)).toBe("2026-10-25");
  const days = calendarDays("2026-10-18");
  expect(days).toHaveLength(42);
  expect(dateAt(days[0]).getDay()).toBe(1);
  expect(days).toContain("2026-10-18");
  expect(localDate(dateAt("2026-10-18"))).toBe("2026-10-18");
});
it("keeps local schedule time and rejects reversed date ranges", () => {
  const s = emptyState(),
    r: Routine = {
      ...stamp(),
      title: "독서",
      category: "독서",
      description: null,
      frequencyType: "daily",
      weeklyTarget: null,
      preferredDays: [],
      durationMinutes: null,
      reminderTime: "20:15",
      startDate: "2026-03-07",
      endDate: "2026-03-10",
      isActive: true,
    };
  saveRoutine(s, r, "2026-03-07");
  expect(s.occurrences.map((o) => new Date(o.scheduledAt).getHours())).toEqual([
    20, 20, 20, 20,
  ]);
  expect(() => validateRoutine({ ...r, endDate: "2026-03-06" })).toThrow();
});
