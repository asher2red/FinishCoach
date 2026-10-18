import React from "react";
import { View, Text, Pressable, TextInput } from "react-native";
export const Theme = React.createContext({
  bg: "#F3F5F0",
  card: "#FFFFFF",
  text: "#172C25",
  muted: "#62756A",
  accent: "#28644C",
  soft: "#E1ECE2",
});
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
export function Card({ children }: { children: React.ReactNode }) {
  const c = React.useContext(Theme);
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 22,
        backgroundColor: c.card,
        gap: 12,
      }}
    >
      {children}
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
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const c = React.useContext(Theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 13,
        minHeight: 48,
        borderRadius: 13,
        backgroundColor: selected ? c.accent : c.soft,
        opacity: disabled ? 0.45 : pressed ? 0.65 : 1,
      })}
    >
      <Text style={{ color: selected ? c.bg : c.text, fontWeight: "600" }}>
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  numeric = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  numeric?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <View style={{ gap: 6 }}>
      <T>{label}</T>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        keyboardType={numeric ? "numeric" : "default"}
        style={{
          padding: 14,
          fontSize: 16,
          color: c.text,
          backgroundColor: c.card,
          borderWidth: 1,
          borderColor: c.soft,
          borderRadius: 12,
          minHeight: 48,
        }}
      />
    </View>
  );
}
export function Empty({ text }: { text: string }) {
  return (
    <Card>
      <T>아직 기록이 없어요</T>
      <T>{text}</T>
    </Card>
  );
}
