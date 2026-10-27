import type { MessageKey, Locale } from "./core";
export const periodKeys = {
  일: "period.day",
  주: "period.week",
  월: "period.month",
  년: "period.year",
} as const;
export const activityKeys: Record<string, MessageKey> = {
  독서: "coach.reading",
  운동: "coach.exercise",
  일기: "coach.journaling",
  "프로젝트 작업": "coach.project.work",
  공부: "coach.study",
  취침: "coach.bedtime",
  기상: "coach.wake.up",
  기타: "coach.other",
};
export const frequencyKeys = {
  daily: "coach.every.day",
  weekly: "coach.weekly.goal",
  weekdays: "coach.selected.weekdays",
  once: "coach.once",
} as const;
export function weekday(locale: Locale, index: number) {
  return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
    new Date(2023, 0, 1 + index, 12),
  );
}
