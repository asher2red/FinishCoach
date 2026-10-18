import React from "react";
import { View, Text, Pressable, Platform, ViewStyle } from "react-native";
import { useStore } from "../data/context";
import { normalizeSettings, themeColors } from "../domain/settings";
import { Card, T, Theme } from "./design";
import { getPalette, tokens } from "./tokens";

export function ThemeSettings() {
  const { state, mutate, busy } = useStore();
  const selected = normalizeSettings(state.settings).themeColor;
  const c = React.useContext(Theme);
  const [focused, setFocused] = React.useState("");
  return (
    <Card>
      <T big>테마 색상</T>
      <T>버튼과 카드의 강조색을 선택하세요. 선택 즉시 반영하고 저장합니다.</T>
      <T>현재 색상: {selected}</T>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {themeColors.map((color) => (
          <Pressable
            key={color}
            accessibilityRole="radio"
            accessibilityLabel={`${color} 테마`}
            accessibilityState={{ checked: selected === color, disabled: busy }}
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
  );
}
