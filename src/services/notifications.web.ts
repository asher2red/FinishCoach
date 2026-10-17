import { State } from "../domain/model";
let timers: ReturnType<typeof setTimeout>[] = [];
export async function requestPermission(): Promise<string> {
  if (typeof Notification === "undefined")
    return "이 브라우저는 알림을 지원하지 않습니다.";
  const result = await Notification.requestPermission();
  return result === "granted"
    ? "알림 허용됨 · 이 페이지가 열려 있을 때만 전달됩니다."
    : "알림이 허용되지 않았습니다.";
}
export async function reconcileNotifications(s: State): Promise<void> {
  timers.forEach(clearTimeout);
  timers = [];
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  )
    return;
  for (const o of s.occurrences) {
    const r = s.routines.find((r) => r.id === o.routineId);
    const delay = new Date(o.scheduledAt).getTime() - Date.now();
    if (
      r?.isActive &&
      !r.deletedAt &&
      r.reminderTime &&
      o.status === "planned" &&
      delay > 0 &&
      delay < 86400000
    )
      timers.push(
        setTimeout(
          () => new Notification("Finish Coach", { body: r.title }),
          delay,
        ),
      );
  }
}
