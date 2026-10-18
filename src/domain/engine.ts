import {
  State,
  Routine,
  stamp,
  localDate,
  dateAt,
  addDays,
  weekStart,
  validateRoutine,
} from "./model";
function removeFuturePending(s: State, routineId: string, today: string) {
  const removed = new Set(
    s.occurrences
      .filter(
        (o) =>
          o.routineId === routineId &&
          o.localDate >= today &&
          o.status === "planned",
      )
      .map((o) => o.id),
  );
  s.occurrences = s.occurrences.filter((o) => !removed.has(o.id));
  // Undo tombstones retain the actual record without an orphaned foreign key.
  for (const log of s.logs)
    if (log.plannedOccurrenceId && removed.has(log.plannedOccurrenceId)) {
      log.plannedOccurrenceId = null;
      log.updatedAt = new Date().toISOString();
    }
}
export function generate(s: State, today = localDate(), horizon = 30): void {
  const until = addDays(today, horizon);
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  for (const r of s.routines) {
    if (r.scheduleTimeZone && r.scheduleTimeZone !== zone) {
      removeFuturePending(s, r.id, today);
      r.generatedThrough = addDays(today, -1);
    }
    r.scheduleTimeZone = zone;
  }
  const keys = new Set(
    s.occurrences.map((o) => `${o.routineId}:${o.localDate}`),
  );
  for (const r of s.routines) {
    if (!r.isActive || r.deletedAt || r.frequencyType === "weekly") continue;
    const from = r.generatedThrough
      ? addDays(r.generatedThrough, 1)
      : r.startDate;
    for (
      let day = r.startDate > from ? r.startDate : from;
      day <= until;
      day = addDays(day, 1)
    ) {
      if (r.endDate && day > r.endDate) break;
      if (r.frequencyType === "once" && day !== r.startDate) continue;
      if (
        r.frequencyType === "weekdays" &&
        !r.preferredDays.includes(dateAt(day).getDay())
      )
        continue;
      const key = `${r.id}:${day}`;
      if (keys.has(key)) continue;
      s.occurrences.push({
        ...stamp(),
        routineId: r.id,
        localDate: day,
        scheduledAt: dateAt(day, r.reminderTime ?? "09:00").toISOString(),
        status: "planned",
        completedLogId: null,
      });
      keys.add(key);
    }
    r.generatedThrough = until;
  }
}
export function saveRoutine(s: State, r: Routine, today = localDate()) {
  validateRoutine(r);
  const old = s.routines.findIndex((x) => x.id === r.id);
  r = { ...r, generatedThrough: old < 0 ? undefined : addDays(today, -1) };
  if (old < 0) s.routines.push(r);
  else s.routines[old] = { ...r, updatedAt: new Date().toISOString() };
  removeFuturePending(s, r.id, today);
  generate(s, today);
}
export function complete(
  s: State,
  routineId: string,
  occurrenceId: string | null = null,
) {
  const r = s.routines.find((x) => x.id === routineId && !x.deletedAt);
  if (!r || !r.isActive) throw new Error("활성 루틴을 찾을 수 없습니다.");
  const o = occurrenceId
    ? s.occurrences.find(
        (x) => x.id === occurrenceId && x.routineId === routineId,
      )
    : undefined;
  if (occurrenceId && !o) throw new Error("예정 항목이 없습니다.");
  if (o?.status === "completed") return;
  if (
    !o &&
    s.logs.some(
      (l) =>
        l.routineId === routineId &&
        !l.plannedOccurrenceId &&
        !l.deletedAt &&
        Date.now() - new Date(l.createdAt).getTime() < 1500,
    )
  )
    return;
  const log = {
    ...stamp(),
    routineId,
    plannedOccurrenceId: occurrenceId,
    completedAt: new Date().toISOString(),
    actualDurationMinutes: null,
    note: null,
  };
  s.logs.push(log);
  if (o) {
    o.status = "completed";
    o.completedLogId = log.id;
    o.updatedAt = log.updatedAt;
  }
}
export function undo(s: State, logId: string) {
  const log = s.logs.find((x) => x.id === logId);
  if (!log) throw new Error("기록을 찾을 수 없습니다.");
  log.deletedAt = new Date().toISOString();
  log.updatedAt = log.deletedAt;
  const o = s.occurrences.find((x) => x.completedLogId === logId);
  if (o) {
    o.status = "planned";
    o.completedLogId = null;
    o.updatedAt = log.updatedAt;
  }
}
export function stats(s: State, today = localDate()) {
  const logs = s.logs.filter((l) => !l.deletedAt),
    start = weekStart(today),
    end = addDays(start, 7);
  const inWeek = (d: string) => d >= start && d < end;
  const weeklyDone = logs.filter((l) =>
    inWeek(localDate(new Date(l.completedAt))),
  ).length;
  const weeklyGoal =
    s.occurrences.filter((o) => inWeek(o.localDate) && o.localDate <= today)
      .length +
    s.occurrences.filter(
      (o) =>
        o.localDate > today &&
        inWeek(o.localDate) &&
        s.routines.some(
          (r) => r.id === o.routineId && r.isActive && !r.deletedAt,
        ),
    ).length +
    s.routines
      .filter(
        (r) =>
          r.frequencyType === "weekly" &&
          r.isActive &&
          !r.deletedAt &&
          r.startDate < end &&
          (!r.endDate || r.endDate >= start),
      )
      .reduce((a, r) => a + (r.weeklyTarget ?? 0), 0);
  return {
    weeklyDone,
    weeklyGoal,
    month: logs.filter((l) =>
      localDate(new Date(l.completedAt)).startsWith(today.slice(0, 7)),
    ).length,
    year: logs.filter((l) =>
      localDate(new Date(l.completedAt)).startsWith(today.slice(0, 4)),
    ).length,
    minutes: logs.reduce((a, l) => a + (l.actualDurationMinutes ?? 0), 0),
    trends: Array.from({ length: 6 }, (_, i) => {
      const date = addDays(start, (i - 5) * 7);
      return {
        date,
        count: logs.filter((l) => {
          const d = localDate(new Date(l.completedAt));
          return d >= date && d < addDays(date, 7);
        }).length,
      };
    }),
  };
}
