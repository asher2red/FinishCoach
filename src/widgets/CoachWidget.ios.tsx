import { translate } from "../i18n/core";
import {
  Circle,
  Divider,
  HStack,
  ProgressView,
  Rectangle,
  Spacer,
  Text,
  VStack,
} from "@expo/ui/swift-ui";
import {
  accessibilityHidden,
  accessibilityLabel,
  background,
  containerBackground,
  cornerRadius,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  padding,
  tint,
  widgetURL,
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
  // Native Calendar/TimeZone checks validity because the widget runtime can use UTC.
  const stale = props.isCurrent !== true;
  const items = stale ? [] : props.items || [];
  const medium = environment.widgetFamily === "systemMedium";
  const large = environment.widgetFamily === "systemLarge";
  const limit = large ? 9 : medium ? 5 : 3;
  const rows = items.slice(0, limit);
  const title = props.titleBase || "Finish Coach";
  const percent = props.total
    ? Math.round(((props.done || 0) / props.total) * 100)
    : 0;
  const renderRow = (item: (typeof rows)[number]) => (
    <VStack key={item.id} spacing={0}>
      <HStack
        spacing={6}
        modifiers={[
          padding({ horizontal: 2 }),
          frame({
            maxWidth: Infinity,
            minHeight: large ? 24 : 21,
            maxHeight: large ? 24 : 21,
            alignment: "leading",
          }),
          accessibilityLabel(
            `${item.title}, ${props.locale === "ko" ? (item.completed ? "완료" : "미완료") : item.completed ? "Completed" : "Not completed"}`,
          ),
        ]}
      >
        <Text
          modifiers={[
            font({ size: 11, weight: "semibold" }),
            foregroundStyle(item.completed ? "#206044" : "#8D7A46"),
            frame({ width: 15, height: 15 }),
            background(item.completed ? "#DBEDE1" : "#FFF5CB"),
            cornerRadius(3),
          ]}
        >
          {item.completed ? "✓" : "○"}
        </Text>
        <Text
          modifiers={[
            font({ size: large ? 13 : 12 }),
            foregroundStyle("#3C321D"),
            lineLimit(1),
          ]}
        >
          {item.title.replace(/[\r\n]/g, " ")}
        </Text>
      </HStack>
      <Divider modifiers={[background("#E8DBAB")]} />
    </VStack>
  );

  return (
    <HStack
      alignment="top"
      spacing={7}
      modifiers={[
        padding({ leading: 7, trailing: 11, vertical: 11 }),
        frame({
          maxWidth: Infinity,
          maxHeight: Infinity,
          alignment: "topLeading",
        }),
        containerBackground("#FFF5CB", "widget"),
        widgetURL("finishcoach:///"),
      ]}
    >
      <VStack
        spacing={26}
        modifiers={[padding({ top: 13 }), accessibilityHidden()]}
      >
        <Circle
          modifiers={[
            foregroundStyle("#D9C38C"),
            frame({ width: 5, height: 5 }),
          ]}
        />
        <Circle
          modifiers={[
            foregroundStyle("#D9C38C"),
            frame({ width: 5, height: 5 }),
          ]}
        />
        <Circle
          modifiers={[
            foregroundStyle("#D9C38C"),
            frame({ width: 5, height: 5 }),
          ]}
        />
      </VStack>
      <Rectangle
        modifiers={[
          foregroundStyle("#D89388"),
          frame({ minWidth: 1, maxWidth: 1, maxHeight: Infinity }),
          accessibilityHidden(),
        ]}
      />
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[frame({ maxWidth: Infinity })]}
      >
        <HStack spacing={5}>
          <Text
            modifiers={[
              font({ size: 15, weight: "bold" }),
              foregroundStyle("#3C321D"),
              lineLimit(1),
              accessibilityLabel(stale ? title : props.accessibility || title),
            ]}
          >
            {title}
          </Text>
          <Spacer />
          {!stale && (
            <Text
              modifiers={[
                font({ size: 12, weight: "bold" }),
                foregroundStyle("#674709"),
                padding({ horizontal: 6, vertical: 2 }),
                background("#F5E4A0"),
                cornerRadius(9),
              ]}
            >
              {`${percent}%`}
            </Text>
          )}
        </HStack>
        {!stale && (
          <ProgressView value={percent / 100} modifiers={[tint("#9D711D")]} />
        )}
        {rows.length ? (
          medium ? (
            <HStack alignment="top" spacing={6}>
              <VStack spacing={0}>{rows.slice(0, 3).map(renderRow)}</VStack>
              <VStack spacing={0} modifiers={[frame({ maxWidth: Infinity })]}>
                {rows.slice(3).map(renderRow)}
              </VStack>
            </HStack>
          ) : (
            <VStack spacing={0}>{rows.map(renderRow)}</VStack>
          )
        ) : (
          <Text
            modifiers={[
              font({ size: 12 }),
              foregroundStyle("#625537"),
              lineLimit(3),
            ]}
          >
            {stale ? props.staleLine || "" : props.empty || ""}
          </Text>
        )}
        {items.length > limit && (
          <Text
            modifiers={[
              font({ size: 10, weight: "medium" }),
              foregroundStyle("#625537"),
              lineLimit(1),
            ]}
          >
            {`${props.more || ""} (+${items.length - limit})`}
          </Text>
        )}
      </VStack>
    </HStack>
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
