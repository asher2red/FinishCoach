import { router } from "expo-router";
import type { ActionIconName } from "../ui/ActionIcon";

export const mainMenu = [
  { label: "오늘", href: "/", icon: "today" },
  { label: "루틴", href: "/routines", icon: "routines" },
  { label: "기록", href: "/history", icon: "history" },
  { label: "통계", href: "/statistics", icon: "statistics" },
  { label: "프로젝트", href: "/projects", icon: "projects" },
  { label: "설정", href: "/settings", icon: "settings" },
] as const satisfies readonly {
  label: string;
  href: string;
  icon: ActionIconName;
}[];

export function navigateToPage(page: string) {
  const item = mainMenu.find((item) => item.label === page);
  if (item) router.replace(item.href);
}
