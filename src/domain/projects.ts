import { Project, State, localDate, dateAt } from "./model";
export function saveProject(s: State, p: Project) {
  if (!p.title.trim()) throw new Error("프로젝트 제목을 입력하세요.");
  for (const d of [p.startedAt, ...(p.targetDate ? [p.targetDate] : [])])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      Number.isNaN(dateAt(d).getTime()) ||
      localDate(dateAt(d)) !== d
    )
      throw new Error("프로젝트 날짜를 확인하세요.");
  if (p.targetDate && p.targetDate < p.startedAt)
    throw new Error("목표일은 시작일 이후여야 합니다.");
  const i = s.projects.findIndex((x) => x.id === p.id);
  const next = {
    ...p,
    title: p.title.trim(),
    updatedAt: new Date().toISOString(),
  };
  if (i < 0) s.projects.push(next);
  else s.projects[i] = next;
}
export function setProjectStatus(
  s: State,
  id: string,
  status: Project["status"],
) {
  const p = s.projects.find((x) => x.id === id && !x.deletedAt);
  if (!p) throw new Error("프로젝트를 찾을 수 없습니다.");
  if (p.status === status) return;
  p.status = status;
  p.updatedAt = new Date().toISOString();
  p.completedAt = status === "completed" ? p.updatedAt : null;
}
export function projectDays(p: Project) {
  if (!p.completedAt) return null;
  return Math.max(
    1,
    Math.round(
      (dateAt(localDate(new Date(p.completedAt))).getTime() -
        dateAt(p.startedAt).getTime()) /
        86400000,
    ) + 1,
  );
}
