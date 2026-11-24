import { message, type Message, formatRaw, resolveLocale } from "../i18n/core";
import { getLocales } from "expo-localization";
import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";
import { State } from "../domain/model";
import {
  defaultSettings,
  AppSettings,
  channelId,
  normalizeSettings,
} from "../domain/settings";
import { notificationPlan } from "./notification-plan";
let currentSettings = defaultSettings();
let queue = Promise.resolve();
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: Platform.OS === "android" || currentSettings.soundEnabled,
    shouldSetBadge: false,
  }),
});
async function prepareChannel(settings: AppSettings) {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(channelId(settings), {
      name: formatRaw(
        resolveLocale(
          settings.language,
          getLocales().map((l) => l.languageTag),
        ),
        "notifications.channelName",
        {
          sound: formatRaw(
            resolveLocale(
              settings.language,
              getLocales().map((l) => l.languageTag),
            ),
            settings.soundEnabled ? "notifications.on" : "notifications.off",
          ),
          vibration: formatRaw(
            resolveLocale(
              settings.language,
              getLocales().map((l) => l.languageTag),
            ),
            settings.vibrationEnabled
              ? "notifications.on"
              : "notifications.off",
          ),
        },
      ),
      importance: AndroidImportance.DEFAULT,
      sound: settings.soundEnabled ? "default" : null,
      enableVibrate: settings.vibrationEnabled,
      vibrationPattern: settings.vibrationEnabled ? [0, 250, 150, 250] : [0],
      bypassDnd: false,
    });
}
function allows(p: Notifications.NotificationPermissionsStatus) {
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}
export async function requestPermission(): Promise<Message> {
  await prepareChannel(currentSettings);
  const result = await Notifications.requestPermissionsAsync();
  if (!allows(result))
    return message(
      "notifications.notifications.are.blocked.you.can.change.this.in.device",
    );
  if (
    Platform.OS === "android" &&
    !(await Notifications.requestExactAlarmPermissionsAsync()).granted
  )
    return message(
      "notifications.notifications.are.allowed.device.power.saving.settings.may.delay",
    );
  return message("notifications.notifications.are.allowed");
}
export function reconcileNotifications(s: State): Promise<void> {
  const run = queue
    .catch(() => {})
    .then(async () => {
      currentSettings = normalizeSettings(s.settings);
      if (!allows(await Notifications.getPermissionsAsync())) return;
      await prepareChannel(currentSettings);
      const android = Platform.OS === "android";
      const exact =
        android &&
        (await Notifications.getExactAlarmPermissionsAsync()).granted;
      const delivery = exact ? "alarmClock" : "bestEffort";
      const pending = await Notifications.getAllScheduledNotificationsAsync();
      const existing = new Map(
        pending.map((request) => [request.identifier, request]),
      );
      const plan = notificationPlan(s, Date.now(), new Set(existing.keys()));
      const desired = new Set(plan.items.map((item) => item.id));
      for (const request of pending) {
        if (!desired.has(request.identifier))
          await Notifications.cancelScheduledNotificationAsync(
            request.identifier,
          );
      }

      for (const item of plan.items) {
        const signature = JSON.stringify([
          item.date.getTime(),
          item.title,
          plan.channelId,
          delivery,
        ]);
        if (
          existing.get(item.id)?.content.data?.reminderSignature === signature
        )
          continue;
        if (item.date.getTime() <= Date.now()) continue;
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: {
            title: "Finish Coach",
            body: item.title,
            data: { reminderSignature: signature },
            sound: plan.settings.soundEnabled ? "default" : false,
            ...(android
              ? {
                  vibrate: plan.settings.vibrationEnabled
                    ? [0, 250, 150, 250]
                    : [0],
                }
              : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: item.date,
            channelId: plan.channelId,
            delivery,
          },
        });
      }
    });
  queue = run;
  return run;
}
