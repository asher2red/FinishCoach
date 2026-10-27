import { useI18n } from "../i18n/context";
import React, { useState } from "react";
import { View } from "react-native";
import { toClock, fromClock, displayTime } from "../domain/pickers";
import { T, Button, Row } from "./design";
import Wheel from "./Wheel";
import { PickerPanel } from "./PickerPanel";
const hours = Array.from({ length: 12 }, (_, i) => String(i + 1)),
  minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
export function TimeField({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  optional?: boolean;
}) {
  const { t: tr, locale } = useI18n();

  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState("09:00");
  const [revision, setRevision] = useState(0);
  const [cleared, setCleared] = useState(false);
  const clock = toClock(draft);
  return (
    <View style={{ gap: 6 }}>
      <T>{label}</T>
      <Button
        accessibilityLabel={tr("picker.selectField", { label: label })}
        title={
          value
            ? displayTime(value, locale)
            : tr("time.field.select.time.no.reminder")
        }
        onPress={() => {
          setCleared(false);
          setDraft(value ?? "09:00");
          setOpen(true);
        }}
      />
      {open && (
        <PickerPanel
          title={label}
          onCancel={() => setOpen(false)}
          onConfirm={() => {
            onChange(cleared ? null : draft);
            setOpen(false);
          }}
        >
          <T>
            {tr("picker.selected", {
              value: cleared
                ? tr("time.field.no.reminder")
                : displayTime(draft, locale),
            })}
          </T>
          {!cleared && (
            <Row>
              <Wheel
                key={`period-${revision}`}
                label={tr("time.field.am.pm")}
                values={["오전", "오후"]}
                displayValue={(value) =>
                  value === "오전" ? tr("time.am") : tr("time.pm")
                }
                value={clock.period}
                onChange={(period) =>
                  setDraft((d) => {
                    const x = toClock(d);
                    return fromClock(period, x.hour, x.minute);
                  })
                }
              />
              <Wheel
                key={`hour-${revision}`}
                label={tr("time.field.hour")}
                values={hours}
                value={String(clock.hour)}
                onChange={(hour) =>
                  setDraft((d) => {
                    const x = toClock(d);
                    return fromClock(x.period, Number(hour), x.minute);
                  })
                }
              />
              <Wheel
                key={`minute-${revision}`}
                label={tr("units.minutes")}
                values={minutes}
                value={String(clock.minute).padStart(2, "0")}
                onChange={(minute) =>
                  setDraft((d) => {
                    const x = toClock(d);
                    return fromClock(x.period, x.hour, Number(minute));
                  })
                }
              />
            </Row>
          )}
          <Row>
            {["07:30", "12:00", "20:15", "23:00"].map((time) => (
              <Button
                key={time}
                title={displayTime(time, locale)}
                onPress={() => {
                  setCleared(false);
                  setDraft(time);
                  setRevision((n) => n + 1);
                }}
              />
            ))}
          </Row>
          <T>
            {tr("time.field.swipe.or.tap.each.column.to.select.minutes.range")}
          </T>
          {optional && (
            <Button
              title={tr("time.field.clear.reminder.time")}
              onPress={() => {
                setCleared(true);
              }}
            />
          )}
        </PickerPanel>
      )}
    </View>
  );
}
