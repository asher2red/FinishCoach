import React, { useRef, useContext } from "react";
import { View, ScrollView, Pressable, Text } from "react-native";
import { Theme, T } from "./design";
export interface WheelProps {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}
const height = 44;
export default function Wheel({ label, values, value, onChange }: WheelProps) {
  const c = useContext(Theme),
    scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const programmatic = useRef(true);
  const index = Math.max(0, values.indexOf(value));
  const select = (i: number) => {
    programmatic.current = true;
    scroll.current?.scrollTo({ y: i * height, animated: false });
    onChange(values[i]);
  };
  return (
    <View style={{ flex: 1, minWidth: 70, gap: 8 }}>
      <T>{label}</T>
      <View
        style={{
          height: height * 5,
          backgroundColor: c.card,
          borderRadius: 16,
          overflow: "hidden",
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: height * 2,
            height,
            backgroundColor: c.soft,
          }}
        />
        <ScrollView
          ref={scroll}
          nestedScrollEnabled
          snapToInterval={height}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onLayout={() =>
            scroll.current?.scrollTo({ y: index * height, animated: false })
          }
          contentContainerStyle={{ paddingVertical: height * 2 }}
          scrollEventThrottle={32}
          onScrollBeginDrag={() => {
            programmatic.current = false;
          }}
          onScroll={(e) => {
            if (programmatic.current) return;
            const y = e.nativeEvent.contentOffset.y;
            onChange(
              values[
                Math.max(0, Math.min(values.length - 1, Math.round(y / height)))
              ],
            );
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{
            text: value,
            min: 0,
            max: values.length - 1,
            now: index,
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) =>
            select(
              Math.min(
                values.length - 1,
                Math.max(
                  0,
                  index + (e.nativeEvent.actionName === "increment" ? 1 : -1),
                ),
              ),
            )
          }
        >
          {values.map((v, i) => (
            <Pressable
              key={v}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${v}`}
              accessibilityState={{ selected: v === value }}
              onPress={() => select(i)}
              style={{ height, alignItems: "center", justifyContent: "center" }}
            >
              <Text
                style={{
                  color: c.text,
                  fontWeight: v === value ? "800" : "400",
                  fontSize: v === value ? 22 : 18,
                }}
              >
                {v}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
