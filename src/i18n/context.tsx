import { Platform } from "react-native";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useLocales } from "expo-localization";
import { useStore } from "../data/context";
import { normalizeSettings } from "../domain/settings";
import {
  formatRaw,
  resolveLocale,
  formatMessage,
  formatNumber,
  formatDate,
  plural,
  type AppMessage,
  type Locale,
  type MessageKey,
  type Args,
} from "./core";
type BoundTranslate = <K extends MessageKey>(
  key: K,
  ...args: Args<K>
) => string;
const Context = createContext<Locale>("en");
const subscribeHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const preferences = useLocales();
  const selected = normalizeSettings(state.settings).language;
  const locale = resolveLocale(
    selected,
    preferences.map((item) => item.languageTag),
  );
  useEffect(() => {
    if (Platform.OS === "web") document.documentElement.lang = locale;
  }, [locale]);
  return <Context.Provider value={locale}>{children}</Context.Provider>;
}
export function useI18n() {
  const selected = useContext(Context);
  // Each asynchronously hydrated route must match the English static export,
  // even when its parent has already detected the browser language.
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    clientSnapshot,
    serverSnapshot,
  );
  const locale = hydrated ? selected : "en";
  return useMemo(
    () => ({
      locale,
      hydrated,
      t: ((key: MessageKey, ...args: [Record<string, string | number>?]) =>
        formatRaw(locale, key, args[0])) as BoundTranslate,
      text: (value: AppMessage) => formatMessage(value, locale),
      number: (value: number) => formatNumber(locale, value),
      date: (value: Date, options?: Intl.DateTimeFormatOptions) =>
        formatDate(locale, value, options),
      count: (
        base: string,
        count: number,
        params?: Record<string, string | number>,
      ) => plural(locale, base, count, params),
    }),
    [locale, hydrated],
  );
}
