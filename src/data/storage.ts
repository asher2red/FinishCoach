import * as SQLite from "expo-sqlite";
import { Repository } from "./repository";
import { emptyState, State } from "../domain/model";
export const schema = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS routines (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS occurrences (id TEXT PRIMARY KEY, routine_id TEXT NOT NULL REFERENCES routines(id), scheduled_at TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(routine_id, scheduled_at));
CREATE INDEX IF NOT EXISTS occurrence_time ON occurrences(scheduled_at);
CREATE TABLE IF NOT EXISTS logs (id TEXT PRIMARY KEY, routine_id TEXT NOT NULL REFERENCES routines(id), occurrence_id TEXT REFERENCES occurrences(id), completed_at TEXT NOT NULL, deleted_at TEXT, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS log_time ON logs(completed_at);
CREATE UNIQUE INDEX IF NOT EXISTS log_occurrence ON logs(occurrence_id) WHERE deleted_at IS NULL AND occurrence_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS milestones (id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), sort_order INTEGER NOT NULL, payload TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS milestone_project ON milestones(project_id, sort_order);
`;
let connection: ReturnType<typeof SQLite.openDatabaseAsync> | undefined;
async function database() {
  if (!connection)
    connection = SQLite.openDatabaseAsync("finish-coach-v1.db")
      .then(async (db) => {
        await db.execAsync(schema);
        return db;
      })
      .catch((e) => {
        connection = undefined;
        throw e;
      });
  return connection;
}
export const repository: Repository = {
  async load() {
    const db = await database();
    const version = await db.getFirstAsync<{ version: number }>(
      "SELECT version FROM metadata WHERE id=1",
    );
    if (!version) return null;
    if (version.version !== 1)
      throw new Error("지원되지 않는 데이터 버전입니다.");
    const s = emptyState();
    for (const key of [
      "routines",
      "projects",
      "occurrences",
      "logs",
      "milestones",
    ] as const) {
      const rows = await db.getAllAsync<{ payload: string }>(
        `SELECT payload FROM ${key}`,
      );
      (s[key] as unknown[]) = rows.map((row) => JSON.parse(row.payload));
    }
    return s;
  },
  async commit(s: State) {
    const db = await database();
    await db.withExclusiveTransactionAsync(async (tx) => {
      for (const table of [
        "logs",
        "occurrences",
        "milestones",
        "routines",
        "projects",
      ])
        await tx.runAsync(`DELETE FROM ${table}`);
      for (const r of s.routines)
        await tx.runAsync(
          "INSERT INTO routines VALUES (?,?)",
          r.id,
          JSON.stringify(r),
        );
      for (const p of s.projects)
        await tx.runAsync(
          "INSERT INTO projects VALUES (?,?)",
          p.id,
          JSON.stringify(p),
        );
      for (const o of s.occurrences)
        await tx.runAsync(
          "INSERT INTO occurrences VALUES (?,?,?,?)",
          o.id,
          o.routineId,
          o.scheduledAt,
          JSON.stringify(o),
        );
      for (const l of s.logs)
        await tx.runAsync(
          "INSERT INTO logs VALUES (?,?,?,?,?,?)",
          l.id,
          l.routineId,
          l.plannedOccurrenceId,
          l.completedAt,
          l.deletedAt,
          JSON.stringify(l),
        );
      for (const m of s.milestones)
        await tx.runAsync(
          "INSERT INTO milestones VALUES (?,?,?,?)",
          m.id,
          m.projectId,
          m.sortOrder,
          JSON.stringify(m),
        );
      await tx.runAsync(
        "INSERT INTO metadata VALUES (1,?) ON CONFLICT(id) DO UPDATE SET version=excluded.version",
        s.version,
      );
    });
  },
};
