import { normalizeSettings, themeColors } from "../src/domain/settings";
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
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("finish-coach-v1", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("metadata", "readwrite");
      tx.objectStore("metadata").delete("settings");
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
    });
    db.close();
    expect(await repository.load()).toEqual(s);
    for (const soundEnabled of [false, true])
      for (const vibrationEnabled of [false, true]) {
        s.settings = {
          ...normalizeSettings(s.settings),
          soundEnabled,
          vibrationEnabled,
        };
        await repository.commit(s);
        expect(await repository.load()).toEqual(s);
      }
    for (const themeColor of themeColors) {
      s.settings = { ...normalizeSettings(s.settings), themeColor };
      await repository.commit(s);
      expect((await repository.load())?.settings).toEqual(s.settings);
    }
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
