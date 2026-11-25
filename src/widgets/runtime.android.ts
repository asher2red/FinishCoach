import { requireOptionalNativeModule } from "expo";
import type { WidgetPublication } from "./snapshot";
const bridge = requireOptionalNativeModule<{
  writeSnapshot(json: string): Promise<void>;
}>("FinishCoachWidget");
export async function writeWidget(snapshot: WidgetPublication) {
  if (!bridge)
    throw new Error("Rebuild the native app to enable Finish Coach widgets");
  await bridge.writeSnapshot(JSON.stringify(snapshot));
}
