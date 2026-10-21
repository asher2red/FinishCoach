import { useEffect } from "react";
import { useAppTheme } from "./useAppTheme";

export function ThemeRuntime() {
  const c = useAppTheme();
  useEffect(() => {
    const root = document.documentElement;
    root.style.colorScheme = c.dark ? "dark" : "light";
    root.style.backgroundColor = c.bg;
    document.body.style.backgroundColor = c.bg;
  }, [c.dark, c.bg]);
  return null;
}
