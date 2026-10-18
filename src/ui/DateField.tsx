import React, { useState, useContext } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { dateAt, localDate, addDays } from "../domain/model";
import { calendarDays, shiftMonth } from "../domain/pickers";
import { Theme, T, Button, Row } from "./design";
import { PickerPanel } from "./PickerPanel";
export function DateField({
  label,
  value,
  onChange,
  min,
  optional = false,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  min?: string;
  optional?: boolean;
}) {
  const c = useContext(Theme);
  const [draft, setDraft] = useState<string | null>(null),
    [month, setMonth] = useState(localDate()),
    [open, setOpen] = useState(false);
  const today = localDate();
  const choose = (d: string) => {
    if (!min || d >= min) {
      setDraft(d);
      setMonth(d);
    }
  };
  const show = () => {
    const d = value ?? (min && min > today ? min : today);
    setDraft(value ?? d);
    setMonth(d);
    setOpen(true);
  };
  return (
    <View style={{ gap: 6 }}>
      <T>{label}</T>
      <Button
        title={value ?? "날짜 선택"}
        accessibilityLabel={`${label} 선택`}
        onPress={show}
      />
      {open && (
        <PickerPanel
          title={label}
          confirmDisabled={!!draft && !!min && draft < min}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            onChange(draft);
            setOpen(false);
          }}
        >
          <Row>
            <Button
              title="이전 달"
              onPress={() => setMonth(shiftMonth(month, -1))}
            />
            <View style={{ flex: 1 }}>
              <T>
                {month.slice(0, 4)}년 {Number(month.slice(5, 7))}월
              </T>
            </View>
            <Button
              title="다음 달"
              onPress={() => setMonth(shiftMonth(month, 1))}
            />
          </Row>
          <T>선택: {draft ?? "미설정"}</T>
          <View style={{ flexDirection: "row" }}>
            {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
              <View key={d} style={{ width: "14.2857%", alignItems: "center" }}>
                <T>{d}</T>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {calendarDays(month).map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${d}${d === today ? " 오늘" : ""}`}
                accessibilityState={{
                  selected: d === draft,
                  disabled: !!min && d < min,
                }}
                disabled={!!min && d < min}
                onPress={() => setDraft(d)}
                {...(Platform.OS === "web"
                  ? {
                      onKeyDown: (event: unknown) => {
                        const e = event as {
                          key: string;
                          preventDefault: () => void;
                        };
                        const amount: Record<string, number> = {
                          ArrowLeft: -1,
                          ArrowRight: 1,
                          ArrowUp: -7,
                          ArrowDown: 7,
                        };
                        if (e.key in amount) {
                          e.preventDefault();
                          choose(addDays(draft ?? d, amount[e.key]));
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setOpen(false);
                        }
                      },
                    }
                  : {})}
                style={{
                  width: "14.2857%",
                  minHeight: 46,
                  paddingVertical: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: d === draft ? c.accent : "transparent",
                  borderRadius: 12,
                  borderWidth: d === today ? 2 : 0,
                  borderColor: c.accent,
                  opacity:
                    min && d < min
                      ? 0.3
                      : d.slice(0, 7) !== month.slice(0, 7)
                        ? 0.5
                        : 1,
                }}
              >
                <Text
                  style={{
                    color: d === draft ? c.bg : c.text,
                    fontWeight: d === draft || d === today ? "700" : "400",
                    fontSize: 16,
                  }}
                >
                  {dateAt(d).getDate()}
                </Text>
              </Pressable>
            ))}
          </View>
          <Row>
            <Button
              title="오늘"
              disabled={!!min && today < min}
              onPress={() => choose(today)}
            />
            <Button
              title="내일"
              disabled={!!min && addDays(today, 1) < min}
              onPress={() => choose(addDays(today, 1))}
            />
            <Button
              title="다가오는 월요일"
              onPress={() => {
                const n = (8 - dateAt(today).getDay()) % 7 || 7;
                const d = addDays(today, n);
                choose(min && d < min ? min : d);
              }}
            />
            {optional && (
              <Button title="날짜 지우기" onPress={() => setDraft(null)} />
            )}
          </Row>
        </PickerPanel>
      )}
    </View>
  );
}
