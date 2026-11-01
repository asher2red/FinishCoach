import { translate } from "../i18n/core";
import { VStack, Text, Spacer } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  containerBackground,
  widgetURL,
  accessibilityLabel,
  lineLimit,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { WidgetSnapshot } from "./snapshot";
export type CoachWidgetProps = Partial<WidgetSnapshot> & {
  isCurrent?: boolean;
};
const RoutineLayout = (
  props: CoachWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";
  // Native Calendar/TimeZone performs validity checks. The isolated JS runtime
  // can use UTC even while the phone uses a different local calendar day.
  const stale = props.isCurrent !== true;
  const items = stale ? [] : props.items || [];
  // WidgetKit does not support scroll gestures inside a home screen widget.
  const limit = environment.widgetFamily === "systemLarge" ? 10 : 3;
  const rows = items.slice(0, limit);
  const title = stale
    ? `${props.titleBase || "Finish Coach"}(—/—)`
    : props.title || "";
  return (
    <VStack
      alignment="leading"
      spacing={8}
      modifiers={[
        padding({ all: 14 }),
        frame({
          maxWidth: Infinity,
          maxHeight: Infinity,
          alignment: "topLeading",
        }),
        containerBackground("#FFFFFF", "widget"),
        widgetURL("finishcoach:///"),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 16, weight: "bold" }),
          foregroundStyle("#000000"),
          lineLimit(1),
          accessibilityLabel(
            stale ? props.staleLine || title : props.accessibility || title,
          ),
        ]}
      >
        {title}
      </Text>
      {rows.length ? (
        rows.map((item) => (
          <Text
            key={item.id}
            modifiers={[
              font({ size: 14 }),
              foregroundStyle(item.completed ? "#16703D" : "#000000"),
              lineLimit(1),
              frame({ maxWidth: Infinity, alignment: "leading" }),
              accessibilityLabel(
                `${item.title}, ${props.locale === "ko" ? (item.completed ? "완료" : "미완료") : item.completed ? "Completed" : "Not completed"}`,
              ),
            ]}
          >
            {item.title.replace(/[\r\n]/g, " ")}
          </Text>
        ))
      ) : (
        <Text
          modifiers={[
            font({ size: 13 }),
            foregroundStyle("#000000"),
            lineLimit(3),
          ]}
        >
          {stale ? props.staleLine || "" : props.empty || ""}
        </Text>
      )}
      <Spacer />
      {items.length > limit ? (
        <Text
          modifiers={[
            font({ size: 12 }),
            foregroundStyle("#000000"),
            lineLimit(1),
          ]}
        >
          {`${props.more || ""} (+${items.length - limit})`}
        </Text>
      ) : null}
    </VStack>
  );
};
export default createWidget<CoachWidgetProps>(
  "FinishCoachWidget",
  RoutineLayout,
  {
    titleBase: translate("en", "widget.routines"),
    staleLine: translate("en", "widget.refreshRoutines"),
  },
);
