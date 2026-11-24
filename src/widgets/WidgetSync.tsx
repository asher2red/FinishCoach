import { useEffect } from "react";
import { emptyState } from "../domain/model";
import { useStore } from "../data/context";
import { useI18n } from "../i18n/context";
import { makeWidgetSnapshot } from "./snapshot";
import { createWidgetPublisher } from "./publisher";
import { writeWidget } from "./runtime";
const publish = createWidgetPublisher(writeWidget, () =>
  console.warn("Widget refresh unavailable; app data remains saved."),
);
export function WidgetSync() {
  const { state, ready } = useStore();
  const { locale } = useI18n();
  useEffect(() => {
    void publish(makeWidgetSnapshot(ready ? state : emptyState(), locale));
  }, [state, ready, locale]);
  return null;
}
