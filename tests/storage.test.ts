import { describe, it, expect } from "vitest";
import { repository } from "../src/data/storage.web";
import { emptyState, stamp } from "../src/domain/model";
describe("IndexedDB repository", () => {
  it("persists all entities, reopens, updates and preserves soft deletes", async () => {
    expect(await repository.load()).toBeNull();
    const s = emptyState();
    const project = {
      ...stamp(),
      title: "앱 개발",
      description: null,
      startedAt: "2026-10-01",
      targetDate: null,
      completedAt: null,
      status: "active" as const,
      completionCriteria: "출시",
    };
    s.projects.push(project);
    s.milestones.push({
      ...stamp(),
      projectId: project.id,
      title: "MVP",
      sortOrder: 0,
      completedAt: null,
    });
    await repository.commit(s);
    expect(await repository.load()).toEqual(s);
    s.projects[0].status = "completed" as "active";
    s.projects[0].completedAt = new Date().toISOString();
    s.milestones[0].completedAt = new Date().toISOString();
    await repository.commit(s);
    expect((await repository.load())?.projects[0].completedAt).toBeTruthy();
    s.milestones[0].deletedAt = new Date().toISOString();
    await repository.commit(s);
    expect((await repository.load())?.milestones[0].deletedAt).toBeTruthy();
    await repository.commit(emptyState());
    expect(await repository.load()).toEqual(emptyState());
  });
});
