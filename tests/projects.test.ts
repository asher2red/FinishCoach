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

it("saves milestone additions, edits, order and deletions together without losing completion", async () => {
  const { saveProjectWithMilestones } = await import("../src/domain/projects");
  const s = emptyState();
  const p = {
    ...stamp(),
    title: "일괄 프로젝트",
    description: null,
    startedAt: "2026-01-01",
    targetDate: null,
    status: "active" as const,
    completedAt: null,
    completionCriteria: null,
  };
  const draft = (title: string) => ({
    ...stamp(),
    projectId: p.id,
    title,
    sortOrder: 0,
    completedAt: null as string | null,
  });
  const first = draft("하나"),
    second = draft("둘"),
    third = draft("셋");
  saveProjectWithMilestones(s, p, [first, second, third]);
  expect(s.milestones.map((m) => m.sortOrder)).toEqual([0, 1, 2]);
  s.milestones[0].completedAt = "2026-01-02T00:00:00Z";
  const other = { ...draft("다른 프로젝트"), projectId: "other" };
  s.milestones.push(other);
  saveProjectWithMilestones(s, { ...p, title: "수정" }, [
    { ...third, title: " 셋 수정 " },
    first,
    draft("넷"),
  ]);
  expect(s.milestones.find((m) => m.id === first.id)?.completedAt).toBeTruthy();
  expect(s.milestones.find((m) => m.id === second.id)?.deletedAt).toBeTruthy();
  expect(
    s.milestones
      .filter((m) => m.projectId === p.id && !m.deletedAt)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => m.title),
  ).toEqual(["셋 수정", "하나", "넷"]);
  expect(s.milestones.find((m) => m.id === other.id)).toEqual(other);
  const before = structuredClone(s);
  expect(() =>
    saveProjectWithMilestones(s, { ...p, title: "실패" }, [first, draft(" ")]),
  ).toThrow("마일스톤 2 이름");
  expect(s).toEqual(before);
  expect(() => saveProjectWithMilestones(s, p, [first, first])).toThrow();
  expect(s).toEqual(before);
});
