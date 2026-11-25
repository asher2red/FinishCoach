import { requireOptionalNativeModule } from "expo";
import { makeSharedTimeline } from "./timeline";
import type { WidgetPublication } from "./snapshot";
const bridge = requireOptionalNativeModule<{
  writeTimeline(json: string): Promise<void>;
}>("FinishCoachWidget");
export async function writeWidget(snapshot: WidgetPublication) {
  if (!bridge)
    throw new Error("Rebuild iOS to enable the shared widget timeline");
  await bridge.writeTimeline(JSON.stringify(makeSharedTimeline(snapshot)));
}
