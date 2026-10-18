import { Image } from "expo-image";

const icons = {
  bell: require("../../assets/brand/bell.png"),
  today: require("../../assets/brand/today.png"),
  routines: require("../../assets/brand/routines.png"),
  history: require("../../assets/brand/history.png"),
  statistics: require("../../assets/brand/statistics.png"),
  projects: require("../../assets/brand/projects.png"),
  settings: require("../../assets/brand/settings.png"),
};
export type ActionIconName = keyof typeof icons;

export function ActionIcon({
  name,
  size,
}: {
  name: ActionIconName;
  size: number;
}) {
  return (
    <Image
      source={icons[name]}
      contentFit="contain"
      style={{ width: size, height: size }}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      alt=""
    />
  );
}
