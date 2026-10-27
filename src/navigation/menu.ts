import { router } from "expo-router";
import type { ActionIconName } from "../ui/ActionIcon";

export const mainMenu = [
  { label: "오늘", labelKey: "navigation.today", href: "/", icon: "today" },
  {
    label: "루틴",
    labelKey: "navigation.routines",
    href: "/routines",
    icon: "routines",
  },
  {
    label: "기록",
    labelKey: "navigation.history",
    href: "/history",
    icon: "history",
  },
  {
    label: "통계",
    labelKey: "navigation.statistics",
    href: "/statistics",
    icon: "statistics",
  },
  {
    label: "프로젝트",
    labelKey: "navigation.projects",
    href: "/projects",
    icon: "projects",
  },
  {
    label: "설정",
    labelKey: "navigation.settings",
    href: "/settings",
    icon: "settings",
  },
] as const satisfies readonly {
  label: string;
  labelKey: import("../i18n/core").MessageKey;
  href: string;
  icon: ActionIconName;
}[];

export function navigateToPage(page: string) {
  const item = mainMenu.find((item) => item.label === page);
  if (item) router.replace(item.href);
}
