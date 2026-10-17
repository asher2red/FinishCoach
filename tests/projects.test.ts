import { it, expect } from "vitest";
import { emptyState, stamp, dateAt } from "../src/domain/model";
import {
  saveProject,
  setProjectStatus,
  projectDays,
} from "../src/domain/projects";
it("creates, edits, completes, pauses and preserves milestones", () => {
  const s = emptyState(),
    p = {
      ...stamp(),
      title: "앱",
      description: null,
      startedAt: "2026-01-01",
      targetDate: null,
      status: "active" as const,
      completedAt: null,
      completionCriteria: "출시",
    };
  saveProject(s, p);
  saveProject(s, { ...p, title: "새 앱" });
  expect(s.projects).toHaveLength(1);
  s.milestones.push({
    ...stamp(),
    projectId: p.id,
    title: "MVP",
    sortOrder: 0,
    completedAt: null,
  });
  setProjectStatus(s, p.id, "completed");
  expect(s.projects[0].completedAt).toBeTruthy();
  expect(
    projectDays({
      ...s.projects[0],
      completedAt: dateAt("2026-01-05").toISOString(),
    }),
  ).toBe(5);
  setProjectStatus(s, p.id, "paused");
  expect(s.projects[0].completedAt).toBeNull();
  expect(s.milestones).toHaveLength(1);
  expect(() => saveProject(s, { ...p, title: "" })).toThrow();
  expect(() => saveProject(s, { ...p, targetDate: "2025-01-01" })).toThrow();
  expect(() => setProjectStatus(s, "missing", "completed")).toThrow();
});
