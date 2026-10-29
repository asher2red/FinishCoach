import { translate } from "../i18n/core";
import { Image, VStack, HStack, Text, ProgressView } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  resizable,
  aspectRatio,
  containerBackground,
  widgetURL,
  accessibilityLabel,
  lineLimit,
  multilineTextAlignment,
  padding,
  background,
  cornerRadius,
  tint,
  widgetAccentedRenderingMode,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import type { WidgetSnapshot } from "./snapshot";
export type CoachWidgetProps = Partial<WidgetSnapshot> & {
  image?: string;
  neutralImage?: string;
  bg?: string;
  text?: string;
  accent?: string;
  surface?: string;
};
const CoachLayout = (
  props: CoachWidgetProps,
  environment: WidgetEnvironment,
) => {
  "widget";
  // All helpers must remain inside this isolated widget runtime.
  const now = environment.date || new Date();
  const local = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const stale =
    !props.date ||
    props.status === "stale" ||
    local !== props.date ||
    now.getTime() >= (props.expiresAt || 0) ||
    now.getTimezoneOffset() !== props.timeZoneOffset;
  const line = stale ? props.staleLine || "Finish Coach" : props.line || "";
  const value = stale ? "—" : props.value || "—";
  const image = stale ? props.neutralImage : props.image;
  const accent =
    environment.widgetRenderingMode === "accented"
      ? "#FFFFFF"
      : props.accent || "#246C4B";
  return (
    <VStack
      spacing={3}
      modifiers={[
        padding({ all: 10 }),
        frame({ maxWidth: Infinity, maxHeight: Infinity }),
        containerBackground(props.bg || "#F7F8FC", "widget"),
        widgetURL("finishcoach:///"),
        accessibilityLabel(
          (stale ? props.staleAccessibility : props.accessibility) ||
            "Finish Coach",
        ),
      ]}
    >
      <Text
        modifiers={[
          font({ size: 12, weight: "semibold" }),
          foregroundStyle(props.text || "#172039"),
          lineLimit(2),
          multilineTextAlignment("center"),
          padding({ horizontal: 6, vertical: 3 }),
          background(props.surface || "#E9F2EB"),
          cornerRadius(9),
        ]}
      >
        {line}
      </Text>
      <HStack spacing={2}>
        {image ? (
          <Image
            uiImage={image}
            modifiers={[
              resizable(),
              aspectRatio({ contentMode: "fit" }),
              frame({ width: 76, height: 76 }),
              widgetAccentedRenderingMode("fullColor"),
            ]}
          />
        ) : (
          <Image systemName="eye.fill" size={46} color={accent} />
        )}
        <Text
          modifiers={[
            font({ size: 22, weight: "heavy" }),
            foregroundStyle(accent),
          ]}
        >
          {stale ? "•" : props.badge || "•"}
        </Text>
      </HStack>
      <Text
        modifiers={[
          font({ size: 27, weight: "heavy" }),
          foregroundStyle(accent),
          lineLimit(1),
        ]}
      >
        {value}
      </Text>
      <ProgressView
        value={stale ? 0 : (props.percent || 0) / 100}
        modifiers={[tint(accent)]}
      />
    </VStack>
  );
};
export default createWidget<CoachWidgetProps>(
  "FinishCoachWidget",
  CoachLayout,
  {
    staleLine: translate("en", "widget.stale"),
    staleAccessibility:
      translate("en", "widget.stale") + " " + translate("en", "widget.open"),
  },
);
