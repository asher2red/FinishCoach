import { State, emptyState } from "../domain/model";
import { Repository } from "./repository";
import { normalizeSettings } from "../domain/settings";
const entities = [
  "routines",
  "occurrences",
  "logs",
  "projects",
  "milestones",
] as const;
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined")
      return reject(new Error("이 브라우저는 IndexedDB를 지원하지 않습니다."));
    const request = indexedDB.open("finish-coach-v1", 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("metadata");
      for (const name of entities) {
        const store = db.createObjectStore(name, { keyPath: "id" });
        if (name === "occurrences") {
          store.createIndex("routineTime", ["routineId", "scheduledAt"], {
            unique: true,
          });
          store.createIndex("localDate", "localDate");
        }
        if (name === "logs") {
          store.createIndex("routineId", "routineId");
          store.createIndex("completedAt", "completedAt");
        }
        if (name === "milestones") store.createIndex("projectId", "projectId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error("다른 탭을 닫고 저장소를 다시 여세요."));
  });
}
export const repository: Repository = {
  async load() {
    const db = await database();
    return new Promise<State | null>((resolve, reject) => {
      const tx = db.transaction([...entities, "metadata"], "readonly"),
        s = emptyState();
      let version: number | undefined;
      const meta = tx.objectStore("metadata").get("version");
      meta.onsuccess = () => {
        version = meta.result;
      };
      const settings = tx.objectStore("metadata").get("settings");
      settings.onsuccess = () => {
        s.settings = normalizeSettings(settings.result);
      };
      for (const key of entities) {
        const req = tx.objectStore(key).getAll();
        req.onsuccess = () => {
          s[key] = req.result;
        };
      }
      tx.oncomplete = () => {
        db.close();
        if (version !== undefined && version !== 1)
          reject(new Error("지원되지 않는 데이터 버전입니다."));
        else resolve(version ? s : null);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
      tx.onerror = () => reject(tx.error);
    });
  },
  async commit(s) {
    const db = await database();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction([...entities, "metadata"], "readwrite");
      for (const key of entities) {
        const store = tx.objectStore(key);
        store.clear();
        for (const row of s[key]) store.put(row);
      }
      tx.objectStore("metadata").put(s.version, "version");
      tx.objectStore("metadata").put(normalizeSettings(s.settings), "settings");
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error ?? new Error("저장에 실패했습니다."));
      };
      tx.onerror = () => reject(tx.error);
    });
  },
};
