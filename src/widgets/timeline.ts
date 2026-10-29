import { expiredSnapshot, type Face, type WidgetSnapshot } from "./snapshot";
export function makeSharedTimeline(
  snapshot: WidgetSnapshot,
  images: Record<Face, string>,
  palette: { bg: string; text: string; accent: string; surface: string },
) {
  const props = (value: WidgetSnapshot) => ({
    ...value,
    ...palette,
    image: images[value.face],
    neutralImage: images.observe,
  });
  return {
    version: 1,
    entries: [
      {
        timestamp: new Date(snapshot.updatedAt).getTime(),
        props: props(snapshot),
      },
      {
        timestamp: snapshot.expiresAt,
        props: props(expiredSnapshot(snapshot)),
      },
    ],
  };
}
