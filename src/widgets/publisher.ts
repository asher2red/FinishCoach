import type { WidgetPublication } from "./snapshot";

// Serialization prevents an older asynchronous shared-file write from overwriting a
// newer completion. Failed publication is retried on the next app state update.
export function createWidgetPublisher(
  write: (snapshot: WidgetPublication) => Promise<void>,
  report: (error: unknown) => void = () => {},
) {
  let pending: WidgetPublication | undefined;
  let running: Promise<void> | undefined;
  let last = "";
  const signature = (snapshot: WidgetPublication) =>
    JSON.stringify({ ...snapshot, updatedAt: "" });
  return (snapshot: WidgetPublication) => {
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
