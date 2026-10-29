import { Asset } from "expo-asset";
import { Directory, File } from "expo-file-system";
import { widgetsDirectory } from "expo-widgets";
import { requireOptionalNativeModule } from "expo";
import { makeSharedTimeline } from "./timeline";
import { type Face, type WidgetSnapshot } from "./snapshot";
import { getPalette } from "../ui/tokens";
import { normalizeThemeColor } from "../domain/settings";
const images: Record<Face, number> = {
  watch: require("../../assets/mascot/doberman-watch.png"),
  strict: require("../../assets/mascot/doberman-strict.png"),
  observe: require("../../assets/mascot/doberman-observe.png"),
  expect: require("../../assets/mascot/doberman-expect.png"),
  approve: require("../../assets/mascot/doberman-approve.png"),
};
let files: Promise<Record<Face, string>> | undefined;
async function sharedImages() {
  if (!files)
    files = (async () => {
      if (!widgetsDirectory) throw new Error("Widget App Group is unavailable");
      const directory = new Directory(widgetsDirectory);
      directory.create({ idempotent: true, intermediates: true });
      const paths = {} as Record<Face, string>;
      for (const face of Object.keys(images) as Face[]) {
        const destination = new File(directory, `doberman-${face}-v1.png`);
        if (!destination.exists) {
          const asset = await Asset.fromModule(images[face]).downloadAsync();
          if (!asset.localUri) throw new Error("Widget image unavailable");
          const temporary = new File(directory, `doberman-${face}.tmp`);
          if (temporary.exists) temporary.delete();
          new File(asset.localUri).copy(temporary);
          temporary.move(destination);
        }
        paths[face] = destination.uri;
      }
      return paths;
    })().catch((error) => {
      files = undefined;
      throw error;
    });
  return files;
}
export async function writeWidget(snapshot: WidgetSnapshot) {
  const paths = await sharedImages();
  const palette = getPalette(
    normalizeThemeColor(snapshot.themeColor),
    snapshot.dark,
  );
  const bridge = requireOptionalNativeModule<{
    writeTimeline(json: string): Promise<void>;
  }>("FinishCoachWidget");
  if (!bridge)
    throw new Error("Rebuild iOS to enable the shared widget timeline");
  await bridge.writeTimeline(
    JSON.stringify(
      makeSharedTimeline(snapshot, paths, {
        bg: palette.card,
        text: palette.text,
        accent: palette.accent,
        surface: palette.soft,
      }),
    ),
  );
}
