import { expect, it } from "vitest";
import {
  achievementProgress,
  buildAchievements,
} from "../src/domain/achievements";
import { addDays, dateAt, emptyState, stamp } from "../src/domain/model";

it("counts distinct active dates, excludes deleted logs, and caps completed progress", () => {
  const today = "2026-11-24";
  const state = emptyState();
  state.logs = Array.from({ length: 31 }, (_, index) => ({
    ...stamp(),
    routineId: "reading",
    plannedOccurrenceId: null,
    completedAt: dateAt(addDays(today, -index)).toISOString(),
    actualDurationMinutes: 20,
    note: null,
  }));
  state.logs.push(
    { ...state.logs[0], id: "same-day" },
    { ...state.logs[0], id: "deleted", deletedAt: state.logs[0].createdAt },
    {
      ...state.logs[0],
      id: "future",
      completedAt: dateAt(addDays(today, 1)).toISOString(),
    },
  );
  const { goals, days } = buildAchievements(state, today);
  expect(goals[0]).toMatchObject({ done: 31, target: 30 });
  expect(achievementProgress(goals[0])).toBe(1);
  expect(days).toHaveLength(30);
  expect(days.at(-1)).toMatchObject({ date: today });
  expect(days.at(-1)?.entries.map(({ id }) => id)).toContain("same-day");
  expect(days.at(-1)?.entries).toHaveLength(2);
});

it("uses current week completions and live project milestones for goal progress", () => {
  const today = "2026-11-24";
  const state = emptyState();
  state.routines.push({
    ...stamp(),
    id: "reading",
    title: "Read",
    category: "Reading",
    description: null,
    frequencyType: "weekly",
    weeklyTarget: 3,
    preferredDays: [],
    durationMinutes: null,
    reminderTime: null,
    startDate: "2026-11-01",
    endDate: null,
    isActive: true,
  });
  for (const day of ["2026-11-22", "2026-11-23", today]) {
    state.logs.push({
      ...stamp(),
      routineId: "reading",
      plannedOccurrenceId: null,
      completedAt: dateAt(day).toISOString(),
      actualDurationMinutes: null,
      note: null,
    });
  }
  state.projects.push({
    ...stamp(),
    id: "project",
    title: "Book",
    description: null,
    startedAt: today,
    targetDate: null,
    completedAt: null,
    status: "active",
    completionCriteria: null,
  });
  state.milestones.push(
    {
      ...stamp(),
      projectId: "project",
      title: "Draft",
      sortOrder: 0,
      completedAt: dateAt(today).toISOString(),
    },
    {
      ...stamp(),
      projectId: "project",
      title: "Edit",
      sortOrder: 1,
      completedAt: null,
    },
    {
      ...stamp(),
      projectId: "project",
      title: "Removed",
      sortOrder: 2,
      completedAt: null,
      deletedAt: dateAt(today).toISOString(),
    },
  );
  const { goals } = buildAchievements(state, today);
  expect(goals).toEqual([
    { id: "active-days", kind: "days", done: 3, target: 30 },
    {
      id: "routine:reading",
      title: "Read",
      kind: "weekly",
      done: 2,
      target: 3,
    },
    {
      id: "project:project",
      title: "Book",
      kind: "milestones",
      done: 1,
      target: 2,
    },
  ]);
});
