import React from "react";
import { View, Text, Pressable, Platform, ViewStyle } from "react-native";
import { useStore } from "../data/context";
import {
  backgroundThemes,
  normalizeSettings,
  themeColors,
} from "../domain/settings";
import { Card, T, Theme } from "./design";
import { getPalette, tokens } from "./tokens";

export function ThemeSettings() {
  const { state, mutate, busy } = useStore();
  const { themeColor: selected, backgroundTheme } = normalizeSettings(
    state.settings,
  );
  const c = React.useContext(Theme);
  const [focused, setFocused] = React.useState("");
  return (
    <>
      <Card>
        <T big>배경 테마</T>
        <T>앱 배경을 선택하세요. 기기의 화면 모드와 관계없이 유지합니다.</T>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel="배경 테마"
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
        >
          {backgroundThemes.map((mode) => {
            const active = backgroundTheme === mode;
            const label = mode === "light" ? "Light" : "Dark";
            const preview = getPalette(selected, mode === "dark");
            return (
              <Pressable
                key={mode}
                testID={`background-theme-${mode}`}
                accessibilityRole="radio"
                accessibilityLabel={`${label} 배경`}
                accessibilityValue={{ text: active ? "선택됨" : "선택 안 됨" }}
                accessibilityState={{ checked: active, disabled: busy }}
                aria-checked={active}
                disabled={busy}
                onFocus={() => setFocused(mode)}
                onBlur={() => setFocused("")}
                onPress={() => {
                  if (active) return;
                  void mutate(
                    (s) => {
                      s.settings = {
                        ...normalizeSettings(s.settings),
                        backgroundTheme: mode,
                      };
                    },
                    { syncNotifications: false },
                  );
                }}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    minWidth: 110,
                    minHeight: 108,
                    padding: 14,
                    gap: 10,
                    borderRadius: tokens.radius.button,
                    borderWidth: active ? 2 : 1,
                    borderColor: active ? c.accent : c.border,
                    backgroundColor: active ? c.soft : c.card,
                    opacity: busy ? 0.5 : pressed ? 0.75 : 1,
                  },
                  Platform.OS === "web"
                    ? ({
                        cursor: busy ? "not-allowed" : "pointer",
                        outlineStyle: focused === mode ? "solid" : "none",
                        outlineWidth: 3,
                        outlineColor: c.accent,
                        outlineOffset: 2,
                      } as ViewStyle)
                    : {},
                ]}
              >
                <View
                  pointerEvents="none"
                  style={{
                    backgroundColor: preview.bg,
                    padding: 8,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: preview.border,
                    gap: 5,
                  }}
                >
                  <View
                    style={{
                      backgroundColor: preview.card,
                      padding: 6,
                      borderRadius: 4,
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        height: 3,
                        width: "60%",
                        backgroundColor: preview.text,
                      }}
                    />
                    <View
                      style={{
                        height: 3,
                        width: "35%",
                        backgroundColor: preview.accent,
                      }}
                    />
                  </View>
                </View>
                <Text
                  style={{
                    color: c.text,
                    fontSize: 16,
                    fontWeight: active ? "800" : "500",
                  }}
                >
                  {label}
                  {active ? " · 선택됨" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card>
        <T big>메뉴 컬러 테마</T>
        <T>버튼과 카드의 강조색을 선택하세요. 선택 즉시 반영하고 저장합니다.</T>
        <T>현재 색상: {selected}</T>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {themeColors.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityLabel={`${color} 테마`}
              accessibilityState={{
                checked: selected === color,
                disabled: busy,
              }}
              aria-checked={selected === color}
              disabled={busy}
              onFocus={() => setFocused(color)}
              onBlur={() => setFocused("")}
              onPress={() => {
                if (selected === color) return;
                void mutate(
                  (s) => {
                    s.settings = {
                      ...normalizeSettings(s.settings),
                      themeColor: color,
                    };
                  },
                  { syncNotifications: false },
                );
              }}
              style={({ pressed }) => [
                {
                  flexBasis: 78,
                  flexGrow: 1,
                  maxWidth: 140,
                  minHeight: 76,
                  padding: 12,
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: tokens.radius.button,
                  borderWidth: selected === color ? 2 : 1,
                  borderColor: selected === color ? c.accent : c.border,
                  backgroundColor: selected === color ? c.soft : c.card,
                  opacity: busy ? 0.5 : pressed ? 0.75 : 1,
                },
                Platform.OS === "web"
                  ? ({
                      cursor: busy ? "not-allowed" : "pointer",
                      outlineStyle: focused === color ? "solid" : "none",
                      outlineWidth: 3,
                      outlineColor: c.accent,
                      outlineOffset: 2,
                    } as ViewStyle)
                  : {},
              ]}
            >
              <View
                pointerEvents="none"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: getPalette(color).accent,
                }}
              />
              <Text
                style={{
                  color: c.text,
                  fontSize: 14,
                  fontWeight: selected === color ? "800" : "500",
                }}
              >
                {color}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>
    </>
  );
}
