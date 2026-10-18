import {
  State,
  CompletionLog,
  localDate,
  addDays,
  weekStart,
  dateAt,
} from "./model";
export type Period = "일" | "주" | "월" | "년";
export function periodRange(date: string, period: Period) {
  if (period === "일") return { from: date, to: addDays(date, 1) };
  if (period === "주") {
    const from = weekStart(date);
    return { from, to: addDays(from, 7) };
  }
  if (period === "년")
    return {
      from: date.slice(0, 4) + "-01-01",
      to: String(Number(date.slice(0, 4)) + 1) + "-01-01",
    };
  const from = date.slice(0, 7) + "-01",
    d = dateAt(from);
  d.setMonth(d.getMonth() + 1);
  return { from, to: localDate(d) };
}
export function buildAnalytics(
  s: State,
  date: string,
  period: Period,
  filter = "전체",
  today = localDate(),
) {
  const range = periodRange(date, period),
    start = weekStart(date),
    end = addDays(start, 7),
    current = weekStart(today),
    currentEnd = addDays(current, 7);
  const logs: CompletionLog[] = [],
    weeklyByRoutine = new Map<string, number>(),
    byRoutine = new Map<
      string,
      { count: number; minutes: number; missing: number }
    >(),
    byDay = new Map<string, { count: number; minutes: number }>(),
    byWeek = new Map<string, number>(),
    byMonth = new Map<string, number>();
  let currentCount = 0,
    currentMinutes = 0,
    currentWeeklyDone = 0;
  const weeklyRoutines = s.routines.filter(
    (r) =>
      !r.deletedAt &&
      r.isActive &&
      r.frequencyType === "weekly" &&
      r.weeklyTarget &&
      r.startDate < end &&
      (!r.endDate || r.endDate >= start) &&
      (filter === "전체" || r.id === filter),
  );
  const currentGoals = s.routines.filter(
    (r) =>
      !r.deletedAt &&
      r.isActive &&
      r.frequencyType === "weekly" &&
      r.weeklyTarget &&
      r.startDate < currentEnd &&
      (!r.endDate || r.endDate >= current) &&
      (filter === "전체" || r.id === filter),
  );
  const currentIds = new Set(currentGoals.map((r) => r.id));
  for (const l of s.logs) {
    if (l.deletedAt || (filter !== "전체" && l.routineId !== filter)) continue;
    const day = localDate(new Date(l.completedAt)),
      minutes = l.actualDurationMinutes ?? 0;
    if (day >= current && day < currentEnd) {
      currentCount++;
      currentMinutes += minutes;
      if (currentIds.has(l.routineId)) currentWeeklyDone++;
    }
    if (day >= start && day < end) {
      const d = byDay.get(day) ?? { count: 0, minutes: 0 };
      d.count++;
      d.minutes += minutes;
      byDay.set(day, d);
      weeklyByRoutine.set(
        l.routineId,
        (weeklyByRoutine.get(l.routineId) ?? 0) + 1,
      );
    }
    const week = weekStart(day);
    byWeek.set(week, (byWeek.get(week) ?? 0) + minutes);
    byMonth.set(day.slice(0, 7), (byMonth.get(day.slice(0, 7)) ?? 0) + minutes);
    if (day < range.from || day >= range.to) continue;
    logs.push(l);
    const a = byRoutine.get(l.routineId) ?? {
      count: 0,
      minutes: 0,
      missing: 0,
    };
    a.count++;
    a.minutes += minutes;
    if (l.actualDurationMinutes === null) a.missing++;
    byRoutine.set(l.routineId, a);
  }
  const planned = new Map<string, number>();
  for (const o of s.occurrences)
    if (
      o.localDate >= start &&
      o.localDate < end &&
      (filter === "전체" || o.routineId === filter)
    )
      planned.set(o.localDate, (planned.get(o.localDate) ?? 0) + 1);
  const weeklyGoal = currentGoals.reduce(
    (sum, r) => sum + (r.weeklyTarget ?? 0),
    0,
  );
  logs.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(start, i);
    return {
      date: day,
      count: byDay.get(day)?.count ?? 0,
      minutes: byDay.get(day)?.minutes ?? 0,
      planned: planned.get(day) ?? 0,
    };
  });
  return {
    logs,
    range,
    currentCount,
    currentMinutes,
    weeklyGoal,
    currentWeeklyDone,
    rate: weeklyGoal
      ? Math.round((currentWeeklyDone / weeklyGoal) * 100)
      : null,
    days,
    activeDays: days.filter((d) => d.count > 0).length,
    activities: Array.from(byRoutine, ([id, a]) => ({
      id,
      title: s.routines.find((r) => r.id === id)?.title ?? "보관된 활동",
      ...a,
    })).sort((a, b) => b.count - a.count),
    time:
      period === "년"
        ? Array.from({ length: 12 }, (_, i) => {
            const key = date.slice(0, 4) + "-" + String(i + 1).padStart(2, "0");
            return { label: key, minutes: byMonth.get(key) ?? 0 };
          })
        : Array.from({ length: 6 }, (_, i) => {
            const key = addDays(start, (i - 5) * 7);
            return { label: key, minutes: byWeek.get(key) ?? 0 };
          }),
    goals: weeklyRoutines.map((r) => ({
      id: r.id,
      title: r.title,
      target: r.weeklyTarget!,
      done: weeklyByRoutine.get(r.id) ?? 0,
    })),
  };
}
