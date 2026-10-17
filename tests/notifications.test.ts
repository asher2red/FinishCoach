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
}));
vi.mock("react-native", () => ({ Platform: { OS: "android" } }));
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
