import { localDate, type State } from "../domain/model";
import { todayProgress } from "../domain/today";
import { normalizeSettings } from "../domain/settings";
import { translate, type Locale, type MessageKey } from "../i18n/core";
export type Face = "watch" | "strict" | "observe" | "expect" | "approve";
export type WidgetStatus = Face | "empty" | "stale";
export interface WidgetSnapshot {
  version: 1;
  date: string;
  timeZoneOffset: number;
  done: number;
  total: number;
  percent: number;
  status: WidgetStatus;
  face: Face;
  locale: Locale;
  dark: boolean;
  themeColor: string;
  line: string;
  value: string;
  badge: string;
  accessibility: string;
  open: string;
  staleLine: string;
  staleAccessibility: string;
  updatedAt: string;
  expiresAt: number;
  url: "finishcoach:///";
}
const messages: Record<WidgetStatus, MessageKey> = {
  watch: "widget.watch",
  strict: "widget.strict",
  observe: "widget.observe",
  expect: "widget.expect",
  approve: "widget.approve",
  empty: "widget.empty",
  stale: "widget.stale",
};
export function progressStatus(done: number, total: number): WidgetStatus {
  if (!total) return "empty";
  if (done >= total) return "approve";
  const ratio = done / total;
  return ratio < 0.25
    ? "watch"
    : ratio < 0.5
      ? "strict"
      : ratio < 0.75
        ? "observe"
        : "expect";
}
export function makeWidgetSnapshot(
  state: State,
  locale: Locale,
  now = new Date(),
): WidgetSnapshot {
  const date = localDate(now);
  const { done, total, percent } = todayProgress(state, date);
  const status = progressStatus(done, total);
  const settings = normalizeSettings(state.settings);
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const value = total ? `${percent}%` : "—";
  const open = translate(locale, "widget.open");
  return {
    version: 1,
    date,
    timeZoneOffset: now.getTimezoneOffset(),
    done,
    total,
    percent,
    status,
    face: status === "empty" ? "observe" : (status as Face),
    locale,
    dark: settings.backgroundTheme === "dark",
    themeColor: settings.themeColor,
    line: translate(
      locale,
      status === "watch" && done > 0 ? "widget.started" : messages[status],
    ),
    value,
    badge: status === "approve" ? "✦" : status === "watch" ? "!!" : "•",
    accessibility: total
      ? translate(locale, "widget.accessibility", { percent, done, total }) +
        " " +
        open
      : translate(locale, "widget.empty") + " " + open,
    open,
    staleLine: translate(locale, "widget.stale"),
    staleAccessibility: translate(locale, "widget.stale") + " " + open,
    updatedAt: now.toISOString(),
    expiresAt: midnight.getTime(),
    url: "finishcoach:///",
  };
}
export function expiredSnapshot(snapshot: WidgetSnapshot): WidgetSnapshot {
  return {
    ...snapshot,
    done: 0,
    total: 0,
    percent: 0,
    status: "stale",
    face: "observe",
    value: "—",
    badge: "•",
    line: snapshot.staleLine,
    accessibility: snapshot.staleAccessibility,
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
