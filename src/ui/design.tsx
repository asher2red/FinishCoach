import { useI18n } from "../i18n/context";
import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  ViewStyle,
} from "react-native";
import { palettes, tokens, SurfaceTone } from "./tokens";
import { ActionIcon, ActionIconName } from "./ActionIcon";
import { InputVisibility } from "./InputVisibility";
export const Theme = React.createContext(palettes.light);
export function T({
  children,
  big = false,
}: {
  children: React.ReactNode;
  big?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <Text
      style={{
        color: c.text,
        fontSize: big ? 28 : 16,
        lineHeight: big ? 38 : 25,
        fontWeight: big ? "700" : "400",
      }}
    >
      {children}
    </Text>
  );
}
export function Card({
  children,
  variant = "content",
  tone,
}: {
  children: React.ReactNode;
  variant?: "content" | "metric" | "featured";
  tone?: SurfaceTone;
}) {
  const c = React.useContext(Theme);
  const surface =
    c.tones[tone ?? (variant === "featured" ? "today" : "history")];
  return (
    <View
      style={[
        variant !== "metric" && c.shadow,
        {
          padding: tokens.space.card,
          borderRadius: tokens.radius.card,
          backgroundColor:
            tone || variant === "featured" ? surface.surface : c.card,
          borderWidth: 1,
          borderColor:
            tone || variant === "featured" ? surface.border : c.border,
          gap: 12,
        },
      ]}
    >
      {children}
    </View>
  );
}
export function CardTitle({
  icon,
  children,
  big = false,
}: {
  icon: ActionIconName;
  children: React.ReactNode;
  big?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: c.tones[icon].glow,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActionIcon name={icon} size={30} />
      </View>
      <Text
        style={{
          flex: 1,
          color: c.text,
          fontSize: big ? 22 : 16,
          lineHeight: big ? 30 : 24,
          fontWeight: "700",
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function Row({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        alignItems: "center",
      }}
    >
      {children}
    </View>
  );
}
export function Button({
  title,
  onPress,
  selected = false,
  disabled = false,
  accessibilityLabel,
  variant = "action",
  icon,
  description,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  variant?: "action" | "tile";
  icon?: ActionIconName;
  description?: string;
}) {
  const c = React.useContext(Theme);
  const [hovered, setHovered] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const tile = variant === "tile";
  const tone = c.tones[icon ?? "today"];
  const foreground = tile ? c.text : selected ? c.onAccent : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={description}
      accessibilityState={{ disabled, selected }}
      {...(Platform.OS === "web" && tile
        ? { "aria-current": selected ? "page" : undefined }
        : {})}
      disabled={disabled}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        tile && !disabled && c.shadow,
        {
          paddingVertical: tile ? 16 : 12,
          paddingHorizontal: tokens.space.control,
          minHeight: tile ? 112 : 48,
          borderRadius: tile ? tokens.radius.tile : tokens.radius.button,
          borderWidth: 1,
          borderColor: tile
            ? selected || (hovered && !disabled)
              ? tone.ink
              : tone.border
            : selected
              ? c.accent
              : hovered && !disabled
                ? c.accent
                : c.border,
          backgroundColor: tile
            ? pressed || (hovered && !disabled)
              ? tone.glow
              : tone.surface
            : selected
              ? c.accent
              : pressed || (hovered && !disabled)
                ? c.hover
                : c.soft,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          gap: tile ? 10 : 8,
          flexDirection: tile ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 1,
          ...(tile
            ? { flexBasis: 84, flexGrow: 1, maxWidth: 156, minWidth: 0 }
            : {}),
          ...(Platform.OS === "web"
            ? ({
                cursor: disabled ? "not-allowed" : "pointer",
                outlineStyle: focused ? "solid" : "none",
                outlineWidth: 3,
                outlineOffset: 3,
                outlineColor: c.accent,
              } as ViewStyle)
            : {}),
        },
      ]}
    >
      {icon && (
        <View
          pointerEvents="none"
          style={
            tile
              ? {
                  padding: 6,
                  borderRadius: tokens.radius.icon,
                  backgroundColor: tone.glow,
                }
              : undefined
          }
        >
          <ActionIcon
            name={icon}
            size={tile ? tokens.icon.tile : tokens.icon.action}
          />
        </View>
      )}
      <View
        pointerEvents="none"
        style={{ flexShrink: 1, alignItems: "center", gap: 4 }}
      >
        <Text
          style={{
            color: foreground,
            fontSize: 14,
            lineHeight: 21,
            fontWeight: selected ? "800" : "600",
            textAlign: "center",
            flexShrink: 1,
          }}
        >
          {title}
        </Text>
        {description && (
          <Text
            style={{
              color: tile ? c.muted : selected ? c.onAccent : c.muted,
              fontSize: 12,
              lineHeight: 18,
              textAlign: "center",
            }}
          >
            {description}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  numeric = false,
  autoFocus = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
  autoFocus?: boolean;
  multiline?: boolean;
}) {
  const c = React.useContext(Theme);
  const input = React.useRef<React.ComponentRef<typeof TextInput>>(null);
  const reveal = React.useContext(InputVisibility);
  return (
    <View style={{ gap: 6 }}>
      <T>{label}</T>
      <TextInput
        ref={input}
        autoFocus={autoFocus}
        multiline={multiline}
        onFocus={() => reveal(input.current)}
        onContentSizeChange={() => {
          if (input.current?.isFocused()) reveal(input.current);
        }}
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "numeric" : "default"}
        keyboardAppearance={c.dark ? "dark" : "light"}
        selectionColor={c.accent}
        placeholderTextColor={c.muted}
        style={{
          padding: 14,
          fontSize: 16,
          color: c.text,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.soft,
          borderRadius: 12,
          minHeight: multiline ? 96 : 48,
          maxHeight: multiline ? 160 : undefined,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
export function Empty({ text }: { text: string }) {
  const { t: tr } = useI18n();

  return (
    <Card>
      <T>{tr("design.no.records.yet")}</T>
      <T>{text}</T>
    </Card>
  );
}
