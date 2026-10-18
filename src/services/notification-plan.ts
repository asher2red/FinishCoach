import { State } from "../domain/model";
import { channelId, normalizeSettings } from "../domain/settings";
export function notificationPlan(s: State, now = Date.now()) {
  const settings = normalizeSettings(s.settings),
    routines = new Map(s.routines.map((r) => [r.id, r]));
  return {
    settings,
    channelId: channelId(settings),
    items: s.occurrences
      .filter((o) => {
        const r = routines.get(o.routineId);
        return (
          o.status === "planned" &&
          new Date(o.scheduledAt).getTime() > now &&
          r?.isActive &&
          !r.deletedAt &&
          !!r.reminderTime
        );
      })
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
      .slice(0, 60)
      .map((o) => ({
        id: o.id,
        date: new Date(o.scheduledAt),
        title: routines.get(o.routineId)!.title,
      })),
  };
}
