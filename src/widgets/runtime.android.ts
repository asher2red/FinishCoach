import { requireOptionalNativeModule } from "expo";
import { getPalette } from "../ui/tokens";
import { normalizeThemeColor } from "../domain/settings";
import type { WidgetSnapshot } from "./snapshot";
const bridge = requireOptionalNativeModule<{
  writeSnapshot(json: string): Promise<void>;
}>("FinishCoachWidget");
export async function writeWidget(snapshot: WidgetSnapshot) {
  if (!bridge)
    throw new Error("Rebuild the native app to enable Finish Coach widgets");
  const palette = getPalette(
    normalizeThemeColor(snapshot.themeColor),
    snapshot.dark,
  );
  await bridge.writeSnapshot(
    JSON.stringify({
      ...snapshot,
      bg: palette.card,
      text: palette.text,
      accent: palette.accent,
      surface: palette.soft,
    }),
  );
}
