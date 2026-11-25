import { addDays, localDate, weekStart, type State } from "./model";

export type AchievementGoal = {
  id: string;
  title?: string;
  kind: "days" | "weekly" | "milestones" | "project";
  done: number;
  target: number;
};

export function achievementProgress(goal: AchievementGoal) {
  return Math.min(1, goal.done / goal.target);
}

export function buildAchievements(state: State, today = localDate()) {
  const dayLogs = new Map<string, typeof state.logs>();
  const thisWeek = new Map<string, number>();
  const monday = weekStart(today);
  const titles = new Map(state.routines.map(({ id, title }) => [id, title]));
  const logs = state.logs
    .filter(
      (log) => !log.deletedAt && Number.isFinite(Date.parse(log.completedAt)),
    )
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));

  for (const log of logs) {
    const date = localDate(new Date(log.completedAt));
    if (date > today) continue;
    const items = dayLogs.get(date) || [];
    items.push(log);
    dayLogs.set(date, items);
    if (date >= monday) {
      thisWeek.set(log.routineId, (thisWeek.get(log.routineId) ?? 0) + 1);
    }
  }

  const goals: AchievementGoal[] = [
    { id: "active-days", kind: "days", done: dayLogs.size, target: 30 },
  ];
  for (const routine of state.routines) {
    if (
      !routine.deletedAt &&
      routine.isActive &&
      routine.frequencyType === "weekly" &&
      routine.weeklyTarget &&
      routine.startDate <= today &&
      (!routine.endDate || routine.endDate >= monday)
    ) {
      goals.push({
        id: "routine:" + routine.id,
        title: routine.title,
        kind: "weekly",
        done: thisWeek.get(routine.id) ?? 0,
        target: routine.weeklyTarget,
      });
    }
  }

  const milestones = new Map<string, { done: number; target: number }>();
  for (const step of state.milestones) {
    if (step.deletedAt) continue;
    const progress = milestones.get(step.projectId) || { done: 0, target: 0 };
    progress.target++;
    if (step.completedAt) progress.done++;
    milestones.set(step.projectId, progress);
  }

  for (const project of state.projects) {
    if (project.deletedAt || project.status === "cancelled") continue;
    const progress = milestones.get(project.id);
    if (project.status === "completed") {
      goals.push({
        id: "project:" + project.id,
        title: project.title,
        kind: "project",
        done: 1,
        target: 1,
      });
    } else if (progress?.target) {
      goals.push({
        id: "project:" + project.id,
        title: project.title,
        kind: "milestones",
        ...progress,
      });
    }
  }

  return {
    goals,
    days: Array.from({ length: 30 }, (_, index) => {
      const date = addDays(today, index - 29);
      const entries = dayLogs.get(date) ?? [];
      return { date, entries };
    }),
    titles,
  };
}
