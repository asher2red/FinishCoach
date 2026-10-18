import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";
import { State } from "../domain/model";
import { defaultSettings, AppSettings, channelId } from "../domain/settings";
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
      name: `루틴 · 소리 ${settings.soundEnabled ? "켬" : "끔"} · 진동 ${settings.vibrationEnabled ? "켬" : "끔"}`,
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
export async function requestPermission(): Promise<string> {
  await prepareChannel(currentSettings);
  const result = await Notifications.requestPermissionsAsync();
  if (!allows(result))
    return "알림 권한이 거부되었습니다. 기기 설정에서 변경할 수 있습니다.";
  if (
    Platform.OS === "android" &&
    !(await Notifications.getExactAlarmPermissionsAsync()).granted
  )
    return "알림이 허용되었습니다. 기기 절전 정책에 따라 전달이 늦어질 수 있습니다.";
  return "알림이 허용되었습니다.";
}
export function reconcileNotifications(s: State): Promise<void> {
  const plan = notificationPlan(s);
  const run = queue
    .catch(() => {})
    .then(async () => {
      currentSettings = plan.settings;
      if (!allows(await Notifications.getPermissionsAsync())) return;
      await prepareChannel(plan.settings);
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const item of plan.items)
        await Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: {
            title: "Finish Coach",
            body: item.title,
            sound: plan.settings.soundEnabled ? "default" : false,
            ...(Platform.OS === "android"
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
            delivery: "bestEffort",
          },
        });
    });
  queue = run;
  return run;
}
