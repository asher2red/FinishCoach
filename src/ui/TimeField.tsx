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
  const [open, setOpen] = useState(false),
    [draft, setDraft] = useState("09:00");
  const [revision, setRevision] = useState(0);
  const [cleared, setCleared] = useState(false);
  const clock = toClock(draft);
  return (
    <View style={{ gap: 6 }}>
      <T>{label}</T>
      <Button
        accessibilityLabel={`${label} 선택`}
        title={value ? displayTime(value) : "시각 선택 · 알림 없음"}
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
          <T>선택: {cleared ? "알림 없음" : displayTime(draft)}</T>
          {!cleared && (
            <Row>
              <Wheel
                key={`period-${revision}`}
                label="오전·오후"
                values={["오전", "오후"]}
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
                label="시"
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
                label="분"
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
                title={displayTime(time)}
                onPress={() => {
                  setCleared(false);
                  setDraft(time);
                  setRevision((n) => n + 1);
                }}
              />
            ))}
          </Row>
          <T>
            각 열을 스와이프하거나 눌러 선택하세요. 분은 00~59까지 선택할 수
            있습니다.
          </T>
          {optional && (
            <Button
              title="알림 시각 지우기"
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
