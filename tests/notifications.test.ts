import { normalizeSettings } from "../src/domain/settings";
import { it, expect, vi, beforeEach } from "vitest";
import {
  emptyState,
  stamp,
  Routine,
  localDate,
  addDays,
} from "../src/domain/model";
import { saveRoutine } from "../src/domain/engine";
import {
  requestPermission,
  reconcileNotifications,
} from "../src/services/notifications";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  request: vi.fn(),
  cancel: vi.fn(),
  schedule: vi.fn(),
  channel: vi.fn(),
  platform: { OS: "android" },
}));
vi.mock("react-native", () => ({ Platform: mocks.platform }));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: mocks.permission,
  requestPermissionsAsync: mocks.request,
  cancelAllScheduledNotificationsAsync: mocks.cancel,
  scheduleNotificationAsync: mocks.schedule,
  setNotificationChannelAsync: mocks.channel,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  getExactAlarmPermissionsAsync: vi.fn(async () => ({ granted: false })),
}));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.platform.OS = "android";
  mocks.permission.mockResolvedValue({ granted: true });
  mocks.request.mockResolvedValue({ granted: true });
});
it("handles denied permission without blocking storage", async () => {
  mocks.permission.mockResolvedValue({ granted: false });
  mocks.request.mockResolvedValue({ granted: false });
  await reconcileNotifications(emptyState());
  expect(mocks.schedule).not.toHaveBeenCalled();
  expect(await requestPermission()).toContain("거부");
  expect(mocks.channel).toHaveBeenCalled();
});
it("schedules only active future planned reminders and cancels disabled schedules", async () => {
  const s = emptyState();
  const r: Routine = {
    ...stamp(),
    title: "독서",
    category: "독서",
    description: null,
    frequencyType: "daily",
    weeklyTarget: null,
    preferredDays: [],
    durationMinutes: 10,
    reminderTime: "18:00",
    startDate: addDays(localDate(), 1),
    endDate: null,
    isActive: true,
  };
  saveRoutine(s, r);
  await reconcileNotifications(s);
  expect(mocks.cancel).toHaveBeenCalledOnce();
  expect(mocks.schedule).toHaveBeenCalledTimes(30);
  saveRoutine(s, { ...s.routines[0], isActive: false });
  mocks.schedule.mockClear();
  await reconcileNotifications(s);
  expect(mocks.schedule).not.toHaveBeenCalled();
  expect(mocks.cancel).toHaveBeenCalledTimes(2);
});

it("applies all four global sound and vibration combinations with bounded channels", async () => {
  const { normalizeSettings, channelId } =
    await import("../src/domain/settings");
  const ids = new Set<string>();
  for (const soundEnabled of [false, true])
    for (const vibrationEnabled of [false, true]) {
      const s = emptyState();
      s.settings = {
        ...normalizeSettings(s.settings),
        soundEnabled,
        vibrationEnabled,
      };
      const r: Routine = {
        ...stamp(),
        title: "알림",
        category: "기타",
        description: null,
        frequencyType: "once",
        weeklyTarget: null,
        preferredDays: [],
        durationMinutes: null,
        reminderTime: "18:00",
        startDate: addDays(localDate(), 1),
        endDate: null,
        isActive: true,
      };
      saveRoutine(s, r);
      mocks.schedule.mockClear();
      await reconcileNotifications(s);
      const [id, channel] = mocks.channel.mock.calls.at(-1)!;
      ids.add(id);
      expect(id).toBe(channelId(normalizeSettings(s.settings)));
      expect(channel.sound).toBe(soundEnabled ? "default" : null);
      expect(channel.enableVibrate).toBe(vibrationEnabled);
      const notification = mocks.schedule.mock.calls[0][0];
      expect(notification.content.sound).toBe(soundEnabled ? "default" : false);
      expect(notification.content.vibrate).toEqual(
        vibrationEnabled ? [0, 250, 150, 250] : [0],
      );
      expect(notification.trigger.channelId).toBe(id);
      expect(notification.identifier).toBe(s.occurrences[0].id);
    }
  expect(ids.size).toBe(4);
});
it("reconciles settings changes without duplicate pending notification identifiers", async () => {
  const active = new Map();
  mocks.cancel.mockImplementation(async () => active.clear());
  mocks.schedule.mockImplementation(async (notification) =>
    active.set(notification.identifier, notification),
  );
  const s = emptyState();
  const r: Routine = {
    ...stamp(),
    title: "알림",
    category: "기타",
    description: null,
    frequencyType: "daily",
    weeklyTarget: null,
    preferredDays: [],
    durationMinutes: null,
    reminderTime: "18:00",
    startDate: addDays(localDate(), 1),
    endDate: null,
    isActive: true,
  };
  saveRoutine(s, r);
  await reconcileNotifications(s);
  s.settings = {
    ...normalizeSettings(s.settings),
    soundEnabled: false,
    vibrationEnabled: false,
  };
  await Promise.all([reconcileNotifications(s), reconcileNotifications(s)]);
  expect(active.size).toBe(s.occurrences.length);
  expect([...active.values()].every((n) => n.content.sound === false)).toBe(
    true,
  );
});

it("uses iOS sound options without pretending to control vibration", async () => {
  mocks.platform.OS = "ios";
  const s = emptyState();
  s.settings = {
    ...normalizeSettings(s.settings),
    soundEnabled: false,
    vibrationEnabled: true,
  };
  const r: Routine = {
    ...stamp(),
    title: "알림",
    category: "기타",
    description: null,
    frequencyType: "once",
    weeklyTarget: null,
    preferredDays: [],
    durationMinutes: null,
    reminderTime: "18:00",
    startDate: addDays(localDate(), 1),
    endDate: null,
    isActive: true,
  };
  saveRoutine(s, r);
  await reconcileNotifications(s);
  expect(mocks.channel).not.toHaveBeenCalled();
  const content = mocks.schedule.mock.calls[0][0].content;
  expect(content.sound).toBe(false);
  expect(content).not.toHaveProperty("vibrate");
});
