import { describe, it, expect, vi } from "vitest";
import { emptyState, stamp, type Routine } from "../src/domain/model";
import { complete, undo, saveRoutine } from "../src/domain/engine";
import { todayProgress } from "../src/domain/today";
import {
  makeWidgetSnapshot,
  expiredSnapshot,
  isSnapshotStale,
} from "../src/widgets/snapshot";
import { createWidgetPublisher } from "../src/widgets/publisher";
const now = new Date(2026, 9, 29, 12);
const routine = (): Routine => ({
  ...stamp(),
  title: "내 활동",
  category: "기타",
  description: null,
  frequencyType: "daily",
  weeklyTarget: null,
  preferredDays: [],
  durationMinutes: 10,
  reminderTime: null,
  startDate: "2026-10-29",
  endDate: null,
  isActive: true,
});
describe("widget progress and safe expiration", () => {
  it("reuses Today’s denominator, including skips and archived completions", () => {
    const state = emptyState();
    const r = routine();
    saveRoutine(state, r, "2026-10-29");
    state.occurrences[0].status = "skipped";
    expect(todayProgress(state, "2026-10-29")).toMatchObject({
      done: 0,
      total: 1,
      percent: 0,
    });
    state.occurrences[0].status = "completed";
    state.routines[0].isActive = false;
    expect(todayProgress(state, "2026-10-29")).toMatchObject({
      done: 1,
      total: 1,
      percent: 100,
    });
    state.occurrences[0].status = "planned";
    expect(todayProgress(state, "2026-10-29").total).toBe(0);
  });
  it("updates after completion and undo, without translating user data", () => {
    const state = emptyState();
    saveRoutine(state, routine(), "2026-10-29");
    const id = state.occurrences[0].id;
    complete(state, state.routines[0].id, id);
    expect(makeWidgetSnapshot(state, "en", now)).toMatchObject({
      done: 1,
      remaining: 0,
      title: "Today’s to-dos · 100%",
      items: [{ id, title: "내 활동", completed: true }],
    });
    undo(state, state.logs[0].id);
    expect(makeWidgetSnapshot(state, "ko", now)).toMatchObject({
      done: 0,
      remaining: 1,
      title: "오늘 할 일 · 0%",
      items: [{ id, title: "내 활동", completed: false }],
    });
    expect(state.routines[0].title).toBe("내 활동");
  });
  it("keeps all long and duplicate titles with occurrence IDs and skips incomplete", () => {
    const state = emptyState();
    for (let index = 0; index < 75; index++) {
      const r = routine();
      r.title = "아주 긴 루틴 제목 ".repeat(30);
      saveRoutine(state, r, "2026-10-29");
    }
    state.occurrences[0].status = "completed";
    state.occurrences[1].status = "skipped";
    const snapshot = makeWidgetSnapshot(state, "ko", now);
    expect(snapshot.total).toBe(75);
    expect(snapshot.remaining).toBe(74);
    expect(snapshot.items).toHaveLength(75);
    expect(new Set(snapshot.items.map((item) => item.id)).size).toBe(75);
    expect(snapshot.items[0].completed).toBe(true);
    expect(snapshot.items[1].completed).toBe(false);
    expect(snapshot.items[0].title).toBe(state.routines[0].title);
    expect(expiredSnapshot(snapshot).items).toEqual([]);
  });
  it("keeps empty, expired, language and theme states explicit", () => {
    const state = emptyState();
    state.settings = {
      ...state.settings!,
      backgroundTheme: "dark",
      themeColor: "purple",
      language: "en",
    };
    const snapshot = makeWidgetSnapshot(state, "en", now);
    expect(snapshot).toMatchObject({
      status: "current",
      items: [],
      title: "Today’s to-dos · 0%",
      locale: "en",
      url: "finishcoach:///",
    });
    expect(isSnapshotStale(snapshot, now)).toBe(false);
    const tomorrow = new Date(2026, 9, 30, 0, 0, 1);
    expect(isSnapshotStale(snapshot, tomorrow)).toBe(true);
    expect(
      isSnapshotStale(
        { ...snapshot, timeZoneOffset: snapshot.timeZoneOffset + 60 },
        now,
      ),
    ).toBe(true);
    expect(expiredSnapshot(snapshot)).toMatchObject({
      status: "stale",
      items: [],
      title: "Today’s to-dos",
      empty: "Open the app to refresh today’s routines.",
    });
  });
});
describe("isolated widget publishing", () => {
  it("deduplicates, survives shared storage failures and retries", async () => {
    const state = emptyState();
    const snapshot = makeWidgetSnapshot(state, "en", now);
    const writer = vi
      .fn()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValue(undefined);
    const report = vi.fn();
    const publish = createWidgetPublisher(writer, report);
    await expect(publish(snapshot)).resolves.toBeUndefined();
    expect(state).toEqual(emptyState());
    await publish(snapshot);
    await publish({ ...snapshot, updatedAt: "later" });
    expect(writer).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenCalledOnce();
  });
  it("serializes pending updates so old writes cannot replace new progress", async () => {
    const first = makeWidgetSnapshot(emptyState(), "en", now);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const writer = vi
      .fn()
      .mockImplementationOnce(() => gate)
      .mockResolvedValue(undefined);
    const publish = createWidgetPublisher(writer);
    const pending = publish(first);
    void publish({ ...first, remaining: 2 });
    void publish({ ...first, remaining: 1 });
    release();
    await pending;
    expect(writer.mock.calls.map(([snapshot]) => snapshot.remaining)).toEqual([
      0, 1,
    ]);
  });
});
