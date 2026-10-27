import { message, type Message } from "../i18n/core";
import { State } from "../domain/model";
let timers: ReturnType<typeof setTimeout>[] = [];
export async function requestPermission(): Promise<Message> {
  if (typeof Notification === "undefined")
    return message("notifications.this.browser.does.not.support.notifications");
  const result = await Notification.requestPermission();
  return result === "granted"
    ? message(
        "notifications.notifications.allowed.delivered.only.while.this.page.is.open",
      )
    : message("notifications.notifications.are.not.allowed");
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
