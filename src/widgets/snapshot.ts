import { localDate, type State } from "../domain/model";
import { todayProgress } from "../domain/today";
import { translate, type Locale } from "../i18n/core";

export interface WidgetTask {
  id: string;
  title: string;
  completed: boolean;
}
export interface WidgetSnapshot {
  version: 2;
  date: string;
  timeZoneOffset: number;
  done: number;
  remaining: number;
  total: number;
  items: WidgetTask[];
  locale: Locale;
  status: "current" | "stale";
  title: string;
  titleBase: string;
  empty: string;
  more: string;
  accessibility: string;
  staleLine: string;
  updatedAt: string;
  expiresAt: number;
  url: "finishcoach:///";
}
export function makeWidgetSnapshot(
  state: State,
  locale: Locale,
  now = new Date(),
): WidgetSnapshot {
  const date = localDate(now);
  const { items, done, total, percent } = todayProgress(state, date);
  const titles = new Map(
    state.routines.map((routine) => [routine.id, routine.title]),
  );
  const remaining = total - done;
  const titleBase = translate(locale, "widget.routines");
  const title = `${titleBase} · ${percent}%`;
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return {
    version: 2,
    date,
    timeZoneOffset: now.getTimezoneOffset(),
    done,
    remaining,
    total,
    items: items.map((item) => ({
      id: item.id,
      title: titles.get(item.routineId) || translate(locale, "widget.untitled"),
      completed: item.status === "completed",
    })),
    locale,
    status: "current",
    title,
    titleBase,
    empty: translate(locale, "widget.noRoutines"),
    more: translate(locale, "widget.more"),
    accessibility: translate(locale, "widget.listAccessibility", {
      remaining,
      total,
      done,
    }),
    staleLine: translate(locale, "widget.refreshRoutines"),
    updatedAt: now.toISOString(),
    expiresAt: midnight.getTime(),
    url: "finishcoach:///",
  };
}
export function expiredSnapshot(snapshot: WidgetSnapshot): WidgetSnapshot {
  return {
    ...snapshot,
    done: 0,
    remaining: 0,
    total: 0,
    items: [],
    status: "stale",
    title: snapshot.titleBase,
    empty: snapshot.staleLine,
    accessibility: snapshot.staleLine,
  };
}
export function isSnapshotStale(snapshot: WidgetSnapshot, now = new Date()) {
  return (
    snapshot.status === "stale" ||
    snapshot.date !== localDate(now) ||
    snapshot.timeZoneOffset !== now.getTimezoneOffset() ||
    now.getTime() >= snapshot.expiresAt
  );
}
