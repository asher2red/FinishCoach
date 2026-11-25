import { expiredSnapshot, type WidgetPublication } from "./snapshot";
export function makeSharedTimeline({
  upcoming = [],
  ...snapshot
}: WidgetPublication) {
  const last = upcoming.at(-1) ?? snapshot;
  return {
    version: 1,
    entries: [
      ...[snapshot, ...upcoming].map((props) => ({
        timestamp: new Date(props.updatedAt).getTime(),
        props,
      })),
      { timestamp: last.expiresAt, props: expiredSnapshot(last) },
    ],
  };
}
