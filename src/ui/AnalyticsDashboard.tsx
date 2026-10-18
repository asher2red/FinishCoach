import React, { useMemo, useContext } from "react";
import { View, Pressable, Text } from "react-native";
import { State, addDays } from "../domain/model";
import { buildAnalytics, Period } from "../domain/analytics";
import { Theme, Card, T, Row } from "./design";
function Bar({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
}) {
  const c = useContext(Theme);
  return (
    <View accessibilityLabel={`${label}: ${value}${unit}`} style={{ gap: 7 }}>
      <Row>
        <View style={{ flex: 1 }}>
          <T>{label}</T>
        </View>
        <T>
          {value}
          {unit}
        </T>
      </Row>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: c.soft }}>
        <View
          style={{
            width: `${(value / Math.max(1, max)) * 100}%`,
            height: 12,
            borderRadius: 6,
            backgroundColor: c.accent,
          }}
        />
      </View>
    </View>
  );
}
export function AnalyticsDashboard({
  state,
  date,
  period,
  filter,
  onDay,
}: {
  state: State;
  date: string;
  period: Period;
  filter: string;
  onDay: (d: string) => void;
}) {
  const c = useContext(Theme),
    data = useMemo(
      () => buildAnalytics(state, date, period, filter),
      [state, date, period, filter],
    );
  const max = Math.max(1, ...data.days.flatMap((d) => [d.count, d.planned]));
  return (
    <View style={{ gap: 18 }}>
      <Row>
        {[
          [data.currentCount + "회", "이번 주 완료"],
          [data.currentMinutes + "분", "이번 주 실행 시간"],
          [
            data.rate === null ? "목표 없음" : data.rate + "%",
            "이번 주 주간목표 달성률",
          ],
          [data.activeDays + "일", "조회 주간의 실행일"],
        ].map(([value, label]) => (
          <View key={label} style={{ flex: 1, minWidth: 135 }}>
            <Card>
              <T big>{value}</T>
              <T>{label}</T>
            </Card>
          </View>
        ))}
      </Row>
      <Card>
        <T big>주간 실행 그래프</T>
        <T>
          {data.days[0].date} ~ {data.days[6].date}
        </T>
        <T>횟수 · 진한 막대: 완료 / 옅은 막대: 예정</T>
        <T>주 N회 목표는 특정 날짜에 배정하지 않습니다.</T>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-end" }}>
          {data.days.map((d, i) => (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityLabel={`${d.date} 완료 ${d.count}회 예정 ${d.planned}회 ${d.minutes}분`}
              accessibilityState={{ selected: d.date === date }}
              onPress={() => onDay(d.date)}
              style={{
                flex: 1,
                minWidth: 30,
                minHeight: 180,
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 8,
                borderRadius: 12,
                borderWidth: d.date === date ? 1 : 0,
                borderColor: c.accent,
                paddingVertical: 8,
              }}
            >
              <Text style={{ color: c.text, fontWeight: "700" }}>
                {d.count}회
              </Text>
              <View
                style={{
                  height: 100,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 3,
                }}
              >
                <View
                  style={{
                    height: Math.max(2, (d.planned / max) * 100),
                    width: 10,
                    backgroundColor: c.muted,
                    borderRadius: 4,
                  }}
                />
                <View
                  style={{
                    height: Math.max(2, (d.count / max) * 100),
                    width: 12,
                    backgroundColor: c.accent,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={{ color: c.text }}>
                {["월", "화", "수", "목", "금", "토", "일"][i]}
              </Text>
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {d.date.slice(5)}
              </Text>
            </Pressable>
          ))}
        </View>
        {!data.days.some((d) => d.count) && (
          <T>
            이 주의 완료 기록이 없습니다. 활동을 완료하면 그래프가 채워집니다.
          </T>
        )}
        <T>날짜 막대를 누르면 해당 날짜의 실제 기록을 확인합니다.</T>
      </Card>
      <Card>
        <T big>활동별 완료 횟수</T>
        <T>
          {data.range.from} ~ {addDays(data.range.to, -1)} · 완료 횟수
        </T>
        {!data.activities.length ? (
          <T>선택한 기간의 실행 기록이 없습니다.</T>
        ) : (
          data.activities.map((a) => (
            <Bar
              key={a.id}
              label={a.title}
              value={a.count}
              max={Math.max(...data.activities.map((x) => x.count))}
              unit="회"
            />
          ))
        )}
      </Card>
      <Card>
        <T big>{period === "년" ? "월별" : "주별"} 누적 실행 시간</T>
        <T>
          기록된 실제 소요 시간만 합산합니다. 미입력 시간은 추정하지 않습니다.
        </T>
        {data.time.map((t) => (
          <Bar
            key={t.label}
            label={t.label}
            value={t.minutes}
            max={Math.max(...data.time.map((x) => x.minutes))}
            unit="분"
          />
        ))}
        {!data.time.some((t) => t.minutes > 0) && (
          <T>기록된 실행 시간이 없습니다.</T>
        )}
      </Card>
      <Card>
        <T big>주간 목표 달성</T>
        <T>조회 날짜가 속한 주 · 주 N회 목표가 있는 활성 루틴만 표시합니다.</T>
        {!data.goals.length ? (
          <T>이 주에 적용되는 주간 목표가 없습니다.</T>
        ) : (
          data.goals.map((g) => (
            <View key={g.id} style={{ gap: 5 }}>
              <Bar
                label={g.title}
                value={g.done}
                max={Math.max(g.target, g.done)}
                unit="회"
              />
              <T>
                {g.done} / 목표 {g.target}회 ·{" "}
                {Math.round((g.done / g.target) * 100)}%
              </T>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
