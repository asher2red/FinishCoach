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
  if (!r.title.trim()) throw new Error("활동 이름을 입력하세요.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(r.startDate) ||
    Number.isNaN(dateAt(r.startDate).getTime()) ||
    localDate(dateAt(r.startDate)) !== r.startDate
  )
    throw new Error("시작일을 YYYY-MM-DD 형식으로 입력하세요.");
  if (
    r.endDate &&
    (Number.isNaN(dateAt(r.endDate).getTime()) ||
      localDate(dateAt(r.endDate)) !== r.endDate ||
      r.endDate < r.startDate)
  )
    throw new Error("종료일은 시작일 이후의 올바른 날짜여야 합니다.");
  if (r.reminderTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.reminderTime))
    throw new Error("알림 시각은 HH:mm 형식입니다.");
  if (
    r.durationMinutes !== null &&
    (!Number.isFinite(r.durationMinutes) || r.durationMinutes < 0)
  )
    throw new Error("소요 시간을 확인하세요.");
  if (r.frequencyType === "weekdays" && !r.preferredDays.length)
    throw new Error("요일을 선택하세요.");
  if (
    r.frequencyType === "weekly" &&
    (!r.weeklyTarget ||
      !Number.isInteger(r.weeklyTarget) ||
      r.weeklyTarget < 1 ||
      r.weeklyTarget > 7)
  )
    throw new Error("주간 목표는 1~7회입니다.");
}

export function parseLocalDateTime(value: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}) ([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match)
    throw new Error("완료 시각을 YYYY-MM-DD HH:mm 형식으로 입력하세요.");
  const d = dateAt(match[1], `${match[2]}:${match[3]}`);
  if (
    Number.isNaN(d.getTime()) ||
    localDate(d) !== match[1] ||
    d.getHours() !== Number(match[2])
  )
    throw new Error("존재하지 않는 현지 날짜 또는 시각입니다.");
  return d.toISOString();
}
