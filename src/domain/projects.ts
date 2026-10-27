import { LocalizedError } from "../i18n/core";
import { Project, ProjectMilestone, State, localDate, dateAt } from "./model";
export function saveProjectWithMilestones(
  s: State,
  p: Project,
  drafts: ProjectMilestone[],
) {
  const ids = new Set<string>();
  drafts.forEach((draft, index) => {
    if (!draft.title.trim())
      throw new LocalizedError("projects.milestones.nameRequired", {
        number: index + 1,
      });
    const existing = s.milestones.find((m) => m.id === draft.id);
    if (
      ids.has(draft.id) ||
      draft.projectId !== p.id ||
      (existing && (existing.projectId !== p.id || existing.deletedAt))
    )
      throw new LocalizedError(
        "errors.the.milestone.list.has.changed.reopen.the.editor",
      );
    ids.add(draft.id);
  });
  saveProject(s, p);
  const now = new Date().toISOString();
  for (const item of s.milestones)
    if (item.projectId === p.id && !item.deletedAt && !ids.has(item.id)) {
      item.deletedAt = now;
      item.updatedAt = now;
    }
  drafts.forEach((draft, sortOrder) => {
    const existing = s.milestones.find((m) => m.id === draft.id);
    if (existing)
      Object.assign(existing, {
        title: draft.title.trim(),
        sortOrder,
        updatedAt: now,
      });
    else
      s.milestones.push({
        ...draft,
        title: draft.title.trim(),
        sortOrder,
        updatedAt: now,
      });
  });
}
export function saveProject(s: State, p: Project) {
  if (!p.title.trim()) throw new LocalizedError("errors.enter.a.project.title");
  for (const d of [p.startedAt, ...(p.targetDate ? [p.targetDate] : [])])
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      Number.isNaN(dateAt(d).getTime()) ||
      localDate(dateAt(d)) !== d
    )
      throw new LocalizedError("errors.check.the.project.dates");
  if (p.targetDate && p.targetDate < p.startedAt)
    throw new LocalizedError("errors.the.target.date.must.be.on.or.after.the");
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
  if (!p) throw new LocalizedError("errors.the.project.was.not.found");
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
