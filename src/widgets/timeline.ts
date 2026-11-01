import { expiredSnapshot, type WidgetSnapshot } from "./snapshot";
export function makeSharedTimeline(snapshot: WidgetSnapshot) {
  return {
    version: 1,
    entries: [
      { timestamp: new Date(snapshot.updatedAt).getTime(), props: snapshot },
      { timestamp: snapshot.expiresAt, props: expiredSnapshot(snapshot) },
    ],
  };
}
