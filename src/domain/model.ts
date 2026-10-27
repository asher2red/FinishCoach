import { LocalizedError } from "../i18n/core";
import { randomUUID } from "expo-crypto";
import { AppSettings, defaultSettings } from "./settings";
export type Frequency = "daily" | "weekdays" | "weekly" | "once";
export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
export interface Routine extends Entity {
  title: string;
  category: string;
  description: string | null;
  frequencyType: Frequency;
  weeklyTarget: number | null;
  preferredDays: number[];
  durationMinutes: number | null;
  reminderTime: string | null;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  generatedThrough?: string;
  scheduleTimeZone?: string;
}
export interface PlannedOccurrence extends Entity {
  routineId: string;
  scheduledAt: string;
  localDate: string;
  status: "planned" | "completed" | "skipped";
  completedLogId: string | null;
}
export interface CompletionLog extends Entity {
  routineId: string;
  plannedOccurrenceId: string | null;
  completedAt: string;
  actualDurationMinutes: number | null;
  note: string | null;
}
export interface Project extends Entity {
  title: string;
  description: string | null;
  startedAt: string;
  targetDate: string | null;
  completedAt: string | null;
  status: "active" | "paused" | "completed" | "cancelled";
  completionCriteria: string | null;
}
export interface ProjectMilestone extends Entity {
  projectId: string;
  title: string;
  sortOrder: number;
  completedAt: string | null;
}
export interface State {
  version: 1;
  settings?: AppSettings;
  routines: Routine[];
  occurrences: PlannedOccurrence[];
  logs: CompletionLog[];
  projects: Project[];
  milestones: ProjectMilestone[];
}
export const emptyState = (): State => ({
  version: 1,
  settings: defaultSettings(),
  routines: [],
  occurrences: [],
  logs: [],
  projects: [],
  milestones: [],
});
export const stamp = (): Entity => {
  const now = new Date().toISOString();
  return { id: randomUUID(), createdAt: now, updatedAt: now, deletedAt: null };
};
export const localDate = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const dateAt = (date: string, time = "12:00") =>
  new Date(`${date}T${time}:00`);
export function addDays(date: string, days: number) {
  const d = dateAt(date);
  d.setDate(d.getDate() + days);
  return localDate(d);
}
export function weekStart(date: string, firstDay = 1) {
  const d = dateAt(date);
  return addDays(date, -((d.getDay() - firstDay + 7) % 7));
}
export function validateRoutine(r: Routine) {
  if (!r.title.trim())
    throw new LocalizedError("errors.enter.an.activity.name");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate) ||
    Number.isNaN(dateAt(r.startDate).getTime()) ||
    localDate(dateAt(r.startDate)) !== r.startDate
  )
    throw new LocalizedError(
      "errors.enter.the.start.date.in.yyyy.mm.dd.format",
    );
  if (
    r.endDate &&
    (Number.isNaN(dateAt(r.endDate).getTime()) ||
      localDate(dateAt(r.endDate)) !== r.endDate ||
      r.endDate < r.startDate)
  )
    throw new LocalizedError("errors.choose.a.valid.end.date.on.or.after.the");
  if (r.reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.reminderTime))
    throw new LocalizedError(
      "errors.enter.the.notification.time.in.hh.mm.format",
    );
  if (
    r.durationMinutes !== null &&
    (!Number.isFinite(r.durationMinutes) || r.durationMinutes < 0)
  )
    throw new LocalizedError("errors.check.the.duration");
  if (r.frequencyType === "weekdays" && !r.preferredDays.length)
    throw new LocalizedError("errors.select.at.least.one.weekday");
  if (
    r.frequencyType === "weekly" &&
    (!r.weeklyTarget ||
      !Number.isInteger(r.weeklyTarget) ||
      r.weeklyTarget < 1 ||
      r.weeklyTarget > 7)
  )
    throw new LocalizedError("errors.choose.a.weekly.goal.between.1.and.7");
}

export function parseLocalDateTime(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}) ([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match)
    throw new LocalizedError(
      "errors.enter.the.completion.time.in.yyyy.mm.dd.hh",
    );
  const d = dateAt(match[1], `${match[2]}:${match[3]}`);
  if (
    Number.isNaN(d.getTime()) ||
    localDate(d) !== match[1] ||
    d.getHours() !== Number(match[2])
  )
    throw new LocalizedError("errors.this.local.date.or.time.does.not.exist");
  return d.toISOString();
}
