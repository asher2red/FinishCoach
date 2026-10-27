import { weekday } from "../i18n/labels";
import { useI18n } from "../i18n/context";
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
  const { t: tr, locale, date: localizedDate } = useI18n();

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
        title={
          value
            ? locale === "ko"
              ? value
              : localizedDate(dateAt(value))
            : tr("date.field.select.a.date")
        }
        accessibilityLabel={tr("picker.selectField", { label: label })}
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
              title={tr("date.field.previous.month")}
              onPress={() => setMonth(shiftMonth(month, -1))}
            />
            <View style={{ flex: 1 }}>
              <T>
                {localizedDate(dateAt(month), {
                  year: "numeric",
                  month: "long",
                })}
              </T>
            </View>
            <Button
              title={tr("date.field.next.month")}
              onPress={() => setMonth(shiftMonth(month, 1))}
            />
          </Row>
          <T>
            {tr("picker.selected", {
              value: draft
                ? localizedDate(dateAt(draft))
                : tr("date.field.not.set"),
            })}
          </T>
          <View style={{ flexDirection: "row" }}>
            {["월", "화", "수", "목", "금", "토", "일"].map((d, i) => (
              <View key={d} style={{ width: "14.2857%", alignItems: "center" }}>
                <T>{weekday(locale, (i + 1) % 7)}</T>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {calendarDays(month).map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${d}${d === today ? tr("date.field.today") : ""}`}
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
              title={tr("navigation.today")}
              disabled={!!min && today < min}
              onPress={() => choose(today)}
            />
            <Button
              title={tr("date.field.tomorrow")}
              disabled={!!min && addDays(today, 1) < min}
              onPress={() => choose(addDays(today, 1))}
            />
            <Button
              title={tr("date.field.next.monday")}
              onPress={() => {
                const n = (8 - dateAt(today).getDay()) % 7 || 7;
                const d = addDays(today, n);
                choose(min && d < min ? min : d);
              }}
            />
            {optional && (
              <Button
                title={tr("date.field.clear.date")}
                onPress={() => setDraft(null)}
              />
            )}
          </Row>
        </PickerPanel>
      )}
    </View>
  );
}
