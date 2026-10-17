import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import { Platform } from "react-native";
import { State } from "../domain/model";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
export async function requestPermission(): Promise<string> {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("routines", {
      name: "루틴 알림",
      importance: AndroidImportance.DEFAULT,
    });
  const result = await Notifications.requestPermissionsAsync();
  if (!allows(result))
    return "알림 권한이 거부되었습니다. 기기 설정에서 변경할 수 있습니다.";
  if (
    Platform.OS === "android" &&
    !(await Notifications.getExactAlarmPermissionsAsync()).granted
  )
    return "알림이 허용되었습니다. 정확한 알람 권한이 없어 기기 절전 정책에 따라 전달이 늦어질 수 있습니다.";
  return "알림이 허용되었습니다.";
}
function allows(p: Notifications.NotificationPermissionsStatus) {
  return p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL;
}
export async function reconcileNotifications(s: State): Promise<void> {
  if (!allows(await Notifications.getPermissionsAsync())) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const upcoming = s.occurrences
    .filter(
      (o) =>
        o.status === "planned" &&
        new Date(o.scheduledAt).getTime() > Date.now() &&
        s.routines.some(
          (r) =>
            r.id === o.routineId &&
            r.isActive &&
            !r.deletedAt &&
            r.reminderTime,
        ),
    )
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, 60);
  for (const o of upcoming)
    await Notifications.scheduleNotificationAsync({
      identifier: o.id,
      content: {
        title: "Finish Coach",
        body: s.routines.find((r) => r.id === o.routineId)!.title,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(o.scheduledAt),
        delivery: "bestEffort",
        channelId: "routines",
      },
    });
}
