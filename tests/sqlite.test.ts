import { normalizeSettings, themeColors } from "../src/domain/settings";
import { it, expect, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyState, stamp, Routine } from "../src/domain/model";
import { saveRoutine, complete, undo } from "../src/domain/engine";
import { repository } from "../src/data/storage";
const harness = vi.hoisted(() => ({
  db: undefined as unknown as DatabaseSync,
}));
vi.mock("expo-sqlite", () => ({
  openDatabaseAsync: async () => ({
    execAsync: async (sql: string) => {
      harness.db.exec(sql);
    },
    getFirstAsync: async (sql: string) => harness.db.prepare(sql).get(),
    getAllAsync: async (sql: string) => harness.db.prepare(sql).all(),
    withExclusiveTransactionAsync: async (
      fn: (tx: unknown) => Promise<void>,
    ) => {
      harness.db.exec("BEGIN EXCLUSIVE");
      try {
        await fn({
          runAsync: async (sql: string, ...args: (string | number | null)[]) =>
            harness.db.prepare(sql).run(...args),
        });
        harness.db.exec("COMMIT");
      } catch (e) {
        harness.db.exec("ROLLBACK");
        throw e;
      }
    },
  }),
}));
it("executes SQLite schema, CRUD, reopen persistence, unique constraints and rollback", async () => {
  const directory = mkdtempSync(join(tmpdir(), "finish-coach-"));
  const file = join(directory, "test.db");
  harness.db = new DatabaseSync(file);
  try {
    expect(await repository.load()).toBeNull();
    const s = emptyState();
    const r: Routine = {
      ...stamp(),
      title: "독서",
      category: "독서",
      description: null,
      frequencyType: "once",
      weeklyTarget: null,
      preferredDays: [],
      durationMinutes: 15,
      reminderTime: null,
      startDate: "2026-10-17",
      endDate: null,
      isActive: true,
    };
    saveRoutine(s, r, "2026-10-17");
    complete(s, r.id, s.occurrences[0].id);
    await repository.commit(s);
    expect(await repository.load()).toEqual(s);
    harness.db.close();
    harness.db = new DatabaseSync(file);
    expect(await repository.load()).toEqual(s);
    harness.db.exec("DELETE FROM app_settings");
    expect(await repository.load()).toEqual(s);
    for (const soundEnabled of [false, true])
      for (const vibrationEnabled of [false, true]) {
        s.settings = {
          ...normalizeSettings(s.settings),
          soundEnabled,
          vibrationEnabled,
        };
        await repository.commit(s);
        harness.db.close();
        harness.db = new DatabaseSync(file);
        expect(await repository.load()).toEqual(s);
      }
    for (const themeColor of themeColors) {
      s.settings = {
        ...normalizeSettings(s.settings),
        themeColor,
        backgroundTheme: "dark",
      };
      await repository.commit(s);
      harness.db.close();
      harness.db = new DatabaseSync(file);
      expect((await repository.load())?.settings).toEqual(s.settings);
    }
    const invalid = structuredClone(s);
    invalid.occurrences.push({ ...invalid.occurrences[0], id: "duplicate" });
    await expect(repository.commit(invalid)).rejects.toThrow();
    expect(await repository.load()).toEqual(s);
    undo(s, s.logs[0].id);
    await repository.commit(s);
    expect((await repository.load())?.logs[0].deletedAt).toBeTruthy();
    saveRoutine(s, { ...s.routines[0], reminderTime: "21:00" }, "2026-10-17");
    await repository.commit(s);
    expect((await repository.load())?.logs[0].plannedOccurrenceId).toBeNull();
    await repository.commit(emptyState());
    expect(await repository.load()).toEqual(emptyState());
  } finally {
    harness.db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
