import { weekday } from "../i18n/labels";
import { useI18n } from "../i18n/context";
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
  unit: "count" | "minutes";
}) {
  const { count } = useI18n();
  const valueLabel = count(
    unit === "count" ? "units.activityCount" : "units.minuteCount",
    value,
  );
  const c = useContext(Theme);
  return (
    <View accessibilityLabel={`${label}: ${valueLabel}`} style={{ gap: 7 }}>
      <Row>
        <View style={{ flex: 1 }}>
          <T>{label}</T>
        </View>
        <T>{valueLabel}</T>
      </Row>
      <View style={{ height: 12, borderRadius: 6, backgroundColor: c.soft }}>
        <View
          style={{
            width: `${(value / Math.max(1, max)) * 100}%`,
            height: 12,
            borderRadius: 6,
            backgroundColor: c.tones.projects.ink,
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
  const { t: tr, locale, number, date: localizedDate, count } = useI18n();

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
          [
            count("units.activityCount", data.currentCount),
            tr("analytics.dashboard.completed.this.week"),
          ],
          [
            count("units.minuteCount", data.currentMinutes),
            tr("analytics.dashboard.activity.time.this.week"),
          ],
          [
            data.rate === null
              ? tr("analytics.dashboard.no.goal")
              : data.rate + "%",
            tr("analytics.dashboard.weekly.goal.completion"),
          ],
          [
            count("units.dayCount", data.activeDays),
            tr("analytics.dashboard.active.days.in.this.week"),
          ],
        ].map(([value, label]) => (
          <View key={label} style={{ flex: 1, minWidth: 135 }}>
            <Card variant="metric" tone="projects">
              <T big>{value}</T>
              <T>{label}</T>
            </Card>
          </View>
        ))}
      </Row>
      <Card>
        <T big>{tr("analytics.dashboard.weekly.activity.chart")}</T>
        <T>
          {data.days[0].date} ~ {data.days[6].date}
        </T>
        <T>
          {tr(
            "analytics.dashboard.count.solid.bars.completed.muted.bars.scheduled",
          )}
        </T>
        <T>
          {tr(
            "analytics.dashboard.weekly.goals.are.not.assigned.to.specific.dates",
          )}
        </T>
        <View style={{ flexDirection: "row", gap: 4, alignItems: "flex-end" }}>
          {data.days.map((d, i) => (
            <Pressable
              key={d.date}
              accessibilityRole="button"
              accessibilityLabel={tr("stats.dayAccessibility", {
                date: localizedDate(new Date(d.date + "T12:00:00")),
                done: number(d.count),
                planned: number(d.planned),
                minutes: number(d.minutes),
              })}
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
                {number(d.count)}
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
                    backgroundColor: c.tones.projects.ink,
                    borderRadius: 4,
                  }}
                />
              </View>
              <Text style={{ color: c.text }}>
                {weekday(locale, (i + 1) % 7)}
              </Text>
              <Text style={{ color: c.muted, fontSize: 11 }}>
                {d.date.slice(5)}
              </Text>
            </Pressable>
          ))}
        </View>
        {!data.days.some((d) => d.count) && (
          <T>
            {tr(
              "analytics.dashboard.no.completed.activities.this.week.complete.an.activity.to",
            )}
          </T>
        )}
        <T>
          {tr("analytics.dashboard.select.a.day.to.view.its.actual.records")}
        </T>
      </Card>
      <Card>
        <T big>{tr("analytics.dashboard.completions.by.activity")}</T>
        <T>
          {tr("stats.range", {
            from: localizedDate(new Date(data.range.from + "T12:00:00")),
            to: localizedDate(
              new Date(addDays(data.range.to, -1) + "T12:00:00"),
            ),
          })}
        </T>
        {!data.activities.length ? (
          <T>{tr("analytics.dashboard.no.activity.records.for.this.period")}</T>
        ) : (
          data.activities.map((a) => (
            <Bar
              key={a.id}
              label={
                state.routines.some((r) => r.id === a.id)
                  ? a.title
                  : tr("errors.archived.activity")
              }
              value={a.count}
              max={Math.max(...data.activities.map((x) => x.count))}
              unit="count"
            />
          ))
        )}
      </Card>
      <Card>
        <T big>
          {tr("stats.durationHeading", {
            period:
              period === "년"
                ? tr("analytics.dashboard.monthly")
                : tr("analytics.dashboard.weekly"),
          })}
        </T>
        <T>
          {tr(
            "analytics.dashboard.only.recorded.durations.are.included.missing.durations.are.not",
          )}
        </T>
        {data.time.map((t) => (
          <Bar
            key={t.label}
            label={t.label}
            value={t.minutes}
            max={Math.max(...data.time.map((x) => x.minutes))}
            unit="minutes"
          />
        ))}
        {!data.time.some((t) => t.minutes > 0) && (
          <T>{tr("analytics.dashboard.no.activity.time.has.been.recorded")}</T>
        )}
      </Card>
      <Card>
        <T big>{tr("analytics.dashboard.weekly.goals")}</T>
        <T>
          {tr(
            "analytics.dashboard.week.of.the.selected.date.active.routines.with.weekly",
          )}
        </T>
        {!data.goals.length ? (
          <T>{tr("analytics.dashboard.no.weekly.goals.apply.to.this.week")}</T>
        ) : (
          data.goals.map((g) => (
            <View key={g.id} style={{ gap: 5 }}>
              <Bar
                label={g.title}
                value={g.done}
                max={Math.max(g.target, g.done)}
                unit="count"
              />
              <T>
                {tr("stats.goalProgress", {
                  done: number(g.done),
                  target: number(g.target),
                  rate: number(Math.round((g.done / g.target) * 100)),
                })}
              </T>
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
