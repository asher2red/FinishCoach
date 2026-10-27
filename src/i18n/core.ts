import {
  resources,
  type Locale,
  type MessageKey,
  type MessageParams,
} from "./generated";
export type { Locale, MessageKey } from "./generated";
export type Args<K extends MessageKey> = keyof MessageParams[K] extends never
  ? []
  : [params: MessageParams[K]];
export interface Message {
  key: MessageKey;
  params: Record<string, string | number>;
}
export type AppMessage = Message | string;
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(resources, value)
  );
}
export function detectLocale(preferences: readonly string[]): Locale {
  for (const language of preferences) {
    const exact = language.toLowerCase();
    const supported = (Object.keys(resources) as Locale[]).find(
      (locale) => locale.toLowerCase() === exact,
    );
    if (supported) return supported;
    const base = exact.split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}
export function resolveLocale(
  selected: unknown,
  preferences: readonly string[] = [],
): Locale {
  return isLocale(selected) ? selected : detectLocale(preferences);
}
export function formatRaw(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  const template: string = resources[locale][key] ?? resources.en[key];
  return template.replace(
    /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,
    (_match, name: string) => String(params[name] ?? `{${name}}`),
  );
}
export function translate<K extends MessageKey>(
  locale: Locale,
  key: K,
  ...args: Args<K>
): string {
  return formatRaw(locale, key, args[0]);
}
export function message<K extends MessageKey>(
  key: K,
  ...args: Args<K>
): Message {
  return { key, params: args[0] ?? {} };
}
export function formatMessage(value: AppMessage, locale: Locale): string {
  return typeof value === "string"
    ? value
    : formatRaw(locale, value.key, value.params);
}
export class LocalizedError extends Error {
  readonly descriptor: Message;
  constructor(key: MessageKey, params: Record<string, string | number> = {}) {
    super(formatRaw("ko", key, params));
    this.name = "LocalizedError";
    this.descriptor = { key, params };
  }
}
export function errorMessage(error: unknown, fallback: MessageKey): AppMessage {
  return error instanceof LocalizedError
    ? error.descriptor
    : { key: fallback, params: {} };
}
export function formatNumber(locale: Locale, value: number) {
  return new Intl.NumberFormat(locale).format(value);
}
export function formatDate(
  locale: Locale,
  value: Date,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(locale, options).format(value);
}
export function plural(
  locale: Locale,
  base: string,
  count: number,
  params: Record<string, string | number> = {},
) {
  // Hermes does not expose PluralRules on every supported native runtime.
  // Current languages have simple cardinal rules; keep them native-safe.
  const nativeRules: Partial<Record<Locale, (value: number) => string>> = {
    ko: () => "other",
    en: (value) => (Math.abs(value) === 1 ? "one" : "other"),
  };
  const rule = nativeRules[locale];
  const category = rule
    ? rule(count)
    : new Intl.PluralRules(locale).select(count);
  const preferred = `${base}.plural.${category}`;
  const key = preferred in resources.en ? preferred : `${base}.plural.other`;
  if (!(key in resources.en)) throw new Error(`Missing plural key: ${key}`);
  return formatRaw(locale, key as MessageKey, {
    ...params,
    count: formatNumber(locale, count),
  });
}
