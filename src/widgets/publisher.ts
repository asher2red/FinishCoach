import type { WidgetSnapshot } from "./snapshot";

// Serialization prevents an older asynchronous image copy from overwriting a
// newer completion. Failed publication is retried on the next app state update.
export function createWidgetPublisher(
  write: (snapshot: WidgetSnapshot) => Promise<void>,
  report: (error: unknown) => void = () => {},
) {
  let pending: WidgetSnapshot | undefined;
  let running: Promise<void> | undefined;
  let last = "";
  const signature = (snapshot: WidgetSnapshot) =>
    JSON.stringify({ ...snapshot, updatedAt: "" });
  return (snapshot: WidgetSnapshot) => {
    pending = snapshot;
    if (running) return running;
    running = (async () => {
      while (pending) {
        const next = pending;
        pending = undefined;
        const key = signature(next);
        if (key === last) continue;
        try {
          await write(next);
          last = key;
        } catch (error) {
          report(error);
        }
      }
    })().finally(() => {
      running = undefined;
    });
    return running;
  };
}
