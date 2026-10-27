import {
  activityKeys,
  frequencyKeys,
  periodKeys,
  weekday,
} from "../i18n/labels";
import { formatRaw } from "../i18n/core";
import { LanguageSettings } from "../ui/LanguageSettings";
import { LocalizedError, type AppMessage } from "../i18n/core";
import { useI18n } from "../i18n/context";
import React, { useState, useMemo, useRef } from "react";
import { View, Text, ScrollView, Modal, Platform } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useStore } from "../data/context";
import {
  Routine,
  Project,
  CompletionLog,
  ProjectMilestone,
  parseLocalDateTime,
  stamp,
  localDate,
  weekStart,
  addDays,
} from "../domain/model";
import { saveRoutine, complete, undo, stats } from "../domain/engine";
import {
  saveProjectWithMilestones,
  setProjectStatus,
  projectDays,
} from "../domain/projects";
import { router, useLocalSearchParams } from "expo-router";
import {
  Theme,
  T,
  Card,
  CardTitle,
  Row,
  Button,
  Field,
  Empty,
} from "../ui/design";
import { PurchaseSettings } from "../ui/PurchaseSettings";
import { ThemeSettings } from "../ui/ThemeSettings";
import { BrandMark } from "../ui/BrandMark";
import { useAppTheme } from "../ui/useAppTheme";
import { MenuNavigation } from "../navigation/MenuNavigation";
import { navigateToPage } from "../navigation/menu";
import { EditorScroll } from "../ui/EditorScroll";
import { DateField } from "../ui/DateField";
import { TimeField } from "../ui/TimeField";
import { AnalyticsDashboard } from "../ui/AnalyticsDashboard";
import { NotificationSettings } from "../ui/NotificationSettings";
import { shiftPeriod } from "../domain/pickers";
import { periodRange, Period } from "../domain/analytics";
const EditorInsets = Platform.OS === "web" ? React.Fragment : SafeAreaProvider;
const activities = [
  "독서",
  "운동",
  "일기",
  "프로젝트 작업",
  "공부",
  "취침",
  "기상",
  "기타",
];
export default function Coach({ section = "오늘" }: { section?: string }) {
  const {
    t: tr,
    text,
    locale,
    number,
    date: localizedDate,
    count,
    hydrated,
  } = useI18n();

  const {
    state: s,
    ready,
    busy,
    error,
    notice,
    mutate,
    reload,
    clearError,
  } = useStore();
  const c = useAppTheme();
  const page = section;
  const setPage = navigateToPage;
  const [routine, setRoutine] = useState<Routine | null>(null),
    [project, setProject] = useState<Project | null>(null),
    [log, setLog] = useState<CompletionLog | null>(null),
    [message, setMessage] = useState<AppMessage>("");
  const projectSavePending = useRef(false);
  const [newMilestoneId, setNewMilestoneId] = useState<string | null>(null);
  const [completionTime, setCompletionTime] = useState("");
  const [milestoneDrafts, setMilestoneDrafts] = useState<ProjectMilestone[]>(
    [],
  );
  const openLog = (item: CompletionLog | null) => {
    setLog(item);
    if (item) {
      const d = new Date(item.completedAt);
      setCompletionTime(
        `${localDate(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      );
    }
  };
  const params = useLocalSearchParams<{ date?: string }>();
  const initialDate =
    params.date &&
    /^\d{4}-\d{2}-\d{2}$/.test(params.date) &&
    !Number.isNaN(new Date(params.date + "T12:00:00").getTime()) &&
    localDate(new Date(params.date + "T12:00:00")) === params.date
      ? params.date
      : localDate();
  const [period, setPeriod] = useState("일"),
    [date, setDate] = useState(initialDate),
    [filter, setFilter] = useState("전체"),
    [archive, setArchive] = useState(false);
  const today = localDate(),
    n = useMemo(() => stats(s, today), [s, today]),
    items = s.occurrences.filter(
      (o) =>
        o.localDate === today &&
        (o.status === "completed" ||
          s.routines.some(
            (r) => r.id === o.routineId && r.isActive && !r.deletedAt,
          )),
    ),
    done = items.filter((o) => o.status === "completed").length;
  const title = (id: string) =>
    s.routines.find((r) => r.id === id)?.title ?? tr("coach.archived.routine");
  const change = (patch: Partial<Routine>) =>
    setRoutine((r) => (r ? { ...r, ...patch } : r));
  const create = () =>
    setRoutine({
      ...stamp(),
      title: tr("coach.reading"),
      category: "독서",
      description: null,
      frequencyType: "daily",
      weeklyTarget: 3,
      preferredDays: [1, 3, 5],
      durationMinutes: 20,
      reminderTime: null,
      startDate: today,
      endDate: null,
      isActive: true,
    });
  const [visibleLogs, setVisibleLogs] = useState(50);
  const validDate = true;
  const logs = useMemo(() => {
    const { from, to } = periodRange(date, period as Period);
    return s.logs
      .filter(
        (l) => !l.deletedAt && (filter === "전체" || l.routineId === filter),
      )
      .filter((l) => {
        const day = localDate(new Date(l.completedAt));
        return day >= from && day < to;
      })
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  }, [s.logs, date, period, filter]);
  const close = () => {
    setRoutine(null);
    setProject(null);
    setLog(null);
  };
  return (
    <Theme.Provider value={c}>
      <SafeAreaView
        testID="app-shell"
        edges={Platform.OS === "web" ? undefined : ["top", "left", "right"]}
        style={{ flex: 1, backgroundColor: c.bg }}
      >
        <ScrollView
          testID="screen-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: Platform.OS === "web" ? 80 : 24,
            alignItems: "center",
          }}
        >
          <View style={{ width: "100%", maxWidth: 960, gap: 22 }}>
            <Row>
              <BrandMark />
              <Button
                title={tr("coach.notification.settings")}
                icon="bell"
                onPress={() => setPage("설정")}
              />
            </Row>
            <MenuNavigation activePage={page} />
            <View>
              <Text style={{ color: c.muted }}>
                {hydrated
                  ? new Date().toLocaleDateString(locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long",
                    })
                  : "\u00a0"}
              </Text>
              <T big>
                {page === "오늘"
                  ? tr("coach.ready.to.finish.one.thing.today")
                  : page === "루틴"
                    ? tr("coach.build.consistency.with.routines")
                    : page === "기록"
                      ? tr("coach.your.progress.recorded")
                      : page === "통계"
                        ? tr("coach.see.how.far.you.ve.come")
                        : page === "설정"
                          ? tr("coach.make.finish.coach.your.own")
                          : tr("coach.take.your.projects.to.the.finish")}
              </T>
            </View>
            {!!error && (
              <Card>
                <T>{text(error)}</T>
                <Button
                  title={
                    ready ? tr("common.close") : tr("coach.reopen.storage")
                  }
                  onPress={() => (ready ? clearError() : void reload())}
                />
              </Card>
            )}
            {!!(message || notice) && (
              <Card>
                <T>{text(message || notice)}</T>
                {!!message && (
                  <Button
                    title={tr("common.confirm")}
                    onPress={() => setMessage("")}
                  />
                )}
              </Card>
            )}
            {!ready ? (
              <T>{tr("coach.preparing.storage")}</T>
            ) : (
              <>
                {page === "오늘" && (
                  <>
                    <Card variant="featured">
                      <CardTitle icon="today">
                        {tr("coach.today.s.focus")}
                      </CardTitle>
                      <Text
                        style={{
                          color: c.tones.today.ink,
                          fontSize: 38,
                          fontWeight: "700",
                        }}
                      >
                        {items.length
                          ? Math.round((done / items.length) * 100)
                          : 0}
                        %
                      </Text>
                      <Text style={{ color: c.tones.today.ink }}>
                        {tr("today.summary", {
                          done: number(done),
                          remaining: number(
                            items.filter((o) => o.status === "planned").length,
                          ),
                          skipped: number(
                            items.filter((o) => o.status === "skipped").length,
                          ),
                        })}
                      </Text>
                    </Card>
                    <Row>
                      <View style={{ flex: 1 }}>
                        <T big>{tr("coach.today.s.activities")}</T>
                      </View>
                      <Button
                        title={tr("coach.add.activity")}
                        selected
                        onPress={create}
                      />
                    </Row>
                    {!items.length && (
                      <Empty
                        text={tr(
                          "coach.add.a.routine.to.start.your.first.activity.you",
                        )}
                      />
                    )}
                    {items
                      .sort((a, b) =>
                        a.scheduledAt.localeCompare(b.scheduledAt),
                      )
                      .map((o) => (
                        <Card key={o.id} tone="today">
                          <T>
                            {o.status === "completed"
                              ? "✓ "
                              : o.status === "skipped"
                                ? "↪ "
                                : ""}
                            {title(o.routineId)}
                          </T>
                          <T>
                            {new Date(o.scheduledAt).toLocaleTimeString(
                              locale,
                              { hour: "2-digit", minute: "2-digit" },
                            )}{" "}
                            ·{" "}
                            {
                              {
                                planned: tr("coach.scheduled"),
                                completed: tr("common.complete"),
                                skipped: tr("coach.skipped.coach"),
                              }[o.status]
                            }
                          </T>
                          <Row>
                            <Button
                              title={tr("coach.details")}
                              onPress={() =>
                                setRoutine(
                                  s.routines.find(
                                    (r) => r.id === o.routineId,
                                  ) ?? null,
                                )
                              }
                            />
                            {o.status === "completed" ? (
                              <>
                                <Button
                                  title={tr("coach.edit.record")}
                                  onPress={() =>
                                    openLog(
                                      s.logs.find(
                                        (l) => l.id === o.completedLogId,
                                      ) ?? null,
                                    )
                                  }
                                />
                                <Button
                                  title={tr("coach.undo.completion")}
                                  disabled={busy}
                                  onPress={() =>
                                    void mutate((s) =>
                                      undo(s, o.completedLogId!),
                                    )
                                  }
                                />
                              </>
                            ) : (
                              <>
                                <Button
                                  title={tr("common.complete")}
                                  selected
                                  disabled={busy}
                                  onPress={() =>
                                    void mutate((s) =>
                                      complete(s, o.routineId, o.id),
                                    )
                                  }
                                />
                                <Button
                                  title={
                                    o.status === "skipped"
                                      ? tr("coach.schedule.again")
                                      : tr("coach.skip")
                                  }
                                  disabled={busy}
                                  onPress={() =>
                                    void mutate((s) => {
                                      const x = s.occurrences.find(
                                        (x) => x.id === o.id,
                                      )!;
                                      x.status =
                                        x.status === "skipped"
                                          ? "planned"
                                          : "skipped";
                                      x.updatedAt = new Date().toISOString();
                                    })
                                  }
                                />
                              </>
                            )}
                          </Row>
                        </Card>
                      ))}
                    {s.routines
                      .filter(
                        (r) =>
                          r.frequencyType === "weekly" &&
                          r.isActive &&
                          !r.deletedAt &&
                          r.startDate <= today &&
                          (!r.endDate || r.endDate >= today),
                      )
                      .map((r) => (
                        <Card key={r.id} tone="routines">
                          <T>
                            {tr("routines.weeklyTitle", {
                              title: r.title,
                              count: number(r.weeklyTarget ?? 0),
                            })}
                          </T>
                          <T>
                            {tr("routines.weeklyDone", {
                              count: number(
                                s.logs.filter(
                                  (l) =>
                                    !l.deletedAt &&
                                    l.routineId === r.id &&
                                    localDate(new Date(l.completedAt)) >=
                                      weekStart(today) &&
                                    localDate(new Date(l.completedAt)) <
                                      addDays(weekStart(today), 7),
                                ).length,
                              ),
                            })}
                          </T>
                          <Button
                            title={tr("coach.record.activity.now")}
                            disabled={busy}
                            onPress={() =>
                              void mutate((s) => complete(s, r.id))
                            }
                          />
                        </Card>
                      ))}
                    <T big>{tr("coach.active.projects")}</T>
                    {!s.projects.some((p) => p.status === "active") && (
                      <Empty
                        text={tr("coach.add.a.project.you.d.like.to.finish")}
                      />
                    )}
                    {s.projects
                      .filter((p) => p.status === "active")
                      .map((p) => (
                        <Card key={p.id} tone="projects">
                          <CardTitle icon="projects">{p.title}</CardTitle>
                          <T>
                            {tr("projects.progress", {
                              done: number(
                                s.milestones.filter(
                                  (m) =>
                                    m.projectId === p.id &&
                                    !m.deletedAt &&
                                    m.completedAt,
                                ).length,
                              ),
                              total: number(
                                s.milestones.filter(
                                  (m) => m.projectId === p.id && !m.deletedAt,
                                ).length,
                              ),
                            })}
                          </T>
                          <Button
                            title={tr("coach.view.projects")}
                            onPress={() => setPage("프로젝트")}
                          />
                        </Card>
                      ))}
                  </>
                )}
                {page === "루틴" && (
                  <>
                    <Row>
                      <Button
                        title={tr("coach.create.routine")}
                        selected
                        onPress={create}
                      />
                      <Button
                        title={
                          archive
                            ? tr("coach.current.routines")
                            : tr("coach.archive")
                        }
                        onPress={() => setArchive(!archive)}
                      />
                    </Row>
                    {!s.routines.filter((r) => Boolean(r.deletedAt) === archive)
                      .length && (
                      <Empty
                        text={tr(
                          "coach.choose.an.activity.and.frequency.to.create.your.own",
                        )}
                      />
                    )}
                    {s.routines
                      .filter((r) => Boolean(r.deletedAt) === archive)
                      .map((r) => (
                        <Card key={r.id} tone="routines">
                          <T big>{r.title}</T>
                          <T>
                            {tr("routines.summary", {
                              frequency:
                                r.frequencyType === "weekly"
                                  ? tr("routines.weeklyFrequency", {
                                      count: number(r.weeklyTarget ?? 0),
                                    })
                                  : tr(frequencyKeys[r.frequencyType]),
                              duration:
                                r.durationMinutes === null
                                  ? tr("coach.not.set")
                                  : count(
                                      "units.minuteCount",
                                      r.durationMinutes,
                                    ),
                              status: r.isActive
                                ? tr("coach.active")
                                : tr("coach.paused"),
                            })}
                          </T>
                          <Row>
                            <Button
                              title={tr("coach.details.edit")}
                              onPress={() => setRoutine(r)}
                            />
                            <Button
                              title={
                                r.deletedAt
                                  ? tr("coach.restore")
                                  : r.isActive
                                    ? tr("coach.paused")
                                    : tr("coach.resume")
                              }
                              disabled={busy}
                              onPress={() =>
                                void mutate((s) =>
                                  saveRoutine(s, {
                                    ...r,
                                    deletedAt: null,
                                    isActive: r.deletedAt ? true : !r.isActive,
                                  }),
                                )
                              }
                            />
                            {!r.deletedAt && (
                              <Button
                                title={tr("coach.archive.coach")}
                                disabled={busy}
                                onPress={() =>
                                  void mutate((s) =>
                                    saveRoutine(s, {
                                      ...r,
                                      isActive: false,
                                      deletedAt: new Date().toISOString(),
                                    }),
                                  )
                                }
                              />
                            )}
                          </Row>
                        </Card>
                      ))}
                  </>
                )}
                {page === "기록" && (
                  <>
                    <Row>
                      {["일", "주", "월", "년"].map((p) => (
                        <Button
                          key={p}
                          title={tr(periodKeys[p as Period])}
                          selected={period === p}
                          onPress={() => setPeriod(p)}
                        />
                      ))}
                    </Row>
                    <DateField
                      label={tr("coach.reference.date")}
                      value={date}
                      onChange={(v) => setDate(v!)}
                    />
                    <Row>
                      <Button
                        title={tr("coach.previous")}
                        disabled={!validDate}
                        onPress={() => setDate(shiftPeriod(date, period, -1))}
                      />
                      <Button
                        title={tr("navigation.today")}
                        onPress={() => setDate(today)}
                      />
                      <Button
                        title={tr("coach.next")}
                        disabled={!validDate}
                        onPress={() => setDate(shiftPeriod(date, period, 1))}
                      />
                    </Row>
                    <Row>
                      <Button
                        title={tr("common.all")}
                        selected={filter === "전체"}
                        onPress={() => setFilter("전체")}
                      />
                      {s.routines.map((r) => (
                        <Button
                          key={r.id}
                          title={r.title}
                          selected={filter === r.id}
                          onPress={() => setFilter(r.id)}
                        />
                      ))}
                    </Row>
                    <AnalyticsDashboard
                      state={s}
                      date={date}
                      period={period as Period}
                      filter={filter}
                      onDay={(d) => {
                        setDate(d);
                        setPeriod("일");
                      }}
                    />
                    <T big>{tr("coach.activity.records.by.date")}</T>
                    {!logs.length && (
                      <Empty
                        text={tr(
                          "coach.no.completed.activities.in.this.period",
                        )}
                      />
                    )}
                    {logs.slice(0, visibleLogs).map((l, index) => (
                      <View key={l.id} style={{ gap: 10 }}>
                        {(index === 0 ||
                          localDate(new Date(logs[index - 1].completedAt)) !==
                            localDate(new Date(l.completedAt))) && (
                          <T big>{localDate(new Date(l.completedAt))}</T>
                        )}
                        <Card>
                          <T>{title(l.routineId)}</T>
                          <T>
                            {new Date(l.completedAt).toLocaleString(locale)} ·{" "}
                            {l.actualDurationMinutes ?? tr("coach.not.entered")}
                            {tr("units.minutes")}
                          </T>
                          {!!l.note && <T>{l.note}</T>}
                          <Row>
                            <Button
                              title={tr("coach.edit")}
                              onPress={() => openLog(l)}
                            />
                            <Button
                              title={tr("coach.undo.completion")}
                              disabled={busy}
                              onPress={() => void mutate((s) => undo(s, l.id))}
                            />
                          </Row>
                        </Card>
                      </View>
                    ))}
                    {logs.length > visibleLogs && (
                      <Button
                        title={tr("records.showMore", {
                          shown: visibleLogs,
                          total: logs.length,
                        })}
                        onPress={() => setVisibleLogs((n) => n + 50)}
                      />
                    )}
                  </>
                )}
                {page === "설정" && (
                  <>
                    <LanguageSettings />
                    <ThemeSettings />
                    <PurchaseSettings />
                    <NotificationSettings />
                  </>
                )}
                {page === "통계" && (
                  <>
                    <AnalyticsDashboard
                      state={s}
                      date={today}
                      period="년"
                      filter="전체"
                      onDay={(d) => {
                        router.replace({
                          pathname: "/history",
                          params: { date: d },
                        });
                      }}
                    />
                    {!s.logs.some((l) => !l.deletedAt) && (
                      <Empty
                        text={tr(
                          "coach.complete.your.first.activity.to.see.statistics.based.on",
                        )}
                      />
                    )}
                    <Row>
                      {[
                        [
                          `${n.weeklyDone} / ${n.weeklyGoal}`,
                          tr("coach.completed.goal.this.week"),
                        ],
                        [n.month, tr("coach.activities.this.month")],
                        [n.year, tr("coach.activities.this.year")],
                        [
                          count("units.minuteCount", n.minutes),
                          tr("coach.total.activity.time"),
                        ],
                      ].map(([value, label]) => (
                        <View key={label} style={{ flex: 1, minWidth: 160 }}>
                          <Card>
                            <T big>{value}</T>
                            <T>{label}</T>
                          </Card>
                        </View>
                      ))}
                    </Row>
                    <Card>
                      <T big>{tr("coach.activity.over.the.last.6.weeks")}</T>
                      {n.trends.map((t) => (
                        <View key={t.date} style={{ gap: 7 }}>
                          <T>
                            {tr("stats.chartPoint", {
                              date: localizedDate(
                                new Date(t.date + "T12:00:00"),
                              ),
                              count: number(t.count),
                            })}
                          </T>
                          <View
                            style={{
                              backgroundColor: c.soft,
                              height: 8,
                              borderRadius: 4,
                            }}
                          >
                            <View
                              style={{
                                height: 8,
                                borderRadius: 4,
                                backgroundColor: c.accent,
                                width: `${(t.count / Math.max(1, ...n.trends.map((t) => t.count))) * 100}%`,
                              }}
                            />
                          </View>
                        </View>
                      ))}
                    </Card>
                    <T big>{tr("coach.completion.by.activity")}</T>
                    {s.routines.map((r) => {
                      const total = s.occurrences.filter(
                        (o) => o.routineId === r.id && o.localDate <= today,
                      ).length;
                      const count = s.occurrences.filter(
                        (o) =>
                          o.routineId === r.id &&
                          o.localDate <= today &&
                          o.status === "completed",
                      ).length;
                      const weekly = s.logs.filter(
                        (l) =>
                          !l.deletedAt &&
                          l.routineId === r.id &&
                          localDate(new Date(l.completedAt)) >=
                            weekStart(today) &&
                          localDate(new Date(l.completedAt)) <
                            addDays(weekStart(today), 7),
                      ).length;
                      return (
                        <Card key={r.id} tone="routines">
                          <CardTitle icon="routines">{r.title}</CardTitle>
                          <T>
                            {r.frequencyType === "weekly"
                              ? tr("stats.weeklyProgress", {
                                  done: weekly,
                                  target: r.weeklyTarget ?? 0,
                                  rate: Math.round(
                                    (weekly /
                                      Math.max(1, r.weeklyTarget ?? 0)) *
                                      100,
                                  ),
                                })
                              : tr("stats.progress", {
                                  done: count,
                                  target: total,
                                  rate: total
                                    ? Math.round((count / total) * 100)
                                    : 0,
                                })}
                          </T>
                        </Card>
                      );
                    })}
                    <T big>{tr("coach.completed.projects")}</T>
                    {s.projects
                      .filter((p) => p.status === "completed" && p.completedAt)
                      .map((p) => (
                        <Card key={p.id} tone="projects">
                          <CardTitle icon="projects">{p.title}</CardTitle>
                          <T>
                            {count("projects.elapsed", projectDays(p) ?? 0)}
                          </T>
                        </Card>
                      ))}
                  </>
                )}
                {page === "프로젝트" && (
                  <>
                    <Button
                      title={tr("coach.create.project")}
                      selected
                      onPress={() => {
                        setNewMilestoneId(null);
                        setMilestoneDrafts([]);
                        setProject({
                          ...stamp(),
                          title: "",
                          description: null,
                          startedAt: today,
                          targetDate: null,
                          completedAt: null,
                          status: "active",
                          completionCriteria: null,
                        });
                      }}
                    />
                    {!s.projects.length && (
                      <Empty
                        text={tr(
                          "coach.set.a.finish.line.and.start.with.small.milestones",
                        )}
                      />
                    )}
                    {s.projects
                      .filter((p) => !p.deletedAt)
                      .map((p) => (
                        <Card key={p.id} tone="projects">
                          <CardTitle icon="projects" big>
                            {p.title}
                          </CardTitle>
                          <T>
                            {tr("projects.dateRange", {
                              status: {
                                active: tr("coach.in.progress"),
                                paused: tr("coach.on.hold"),
                                completed: tr("common.complete"),
                                cancelled: tr("common.cancel"),
                              }[p.status],
                              start: localizedDate(
                                new Date(p.startedAt + "T12:00:00"),
                              ),
                              target: p.targetDate
                                ? localizedDate(
                                    new Date(p.targetDate + "T12:00:00"),
                                  )
                                : tr("coach.no.target.date"),
                            })}
                          </T>
                          {!!p.description && <T>{p.description}</T>}
                          {!!p.completionCriteria && (
                            <T>
                              {tr("projects.criteria", {
                                value: p.completionCriteria!,
                              })}
                            </T>
                          )}
                          {!!p.completedAt && (
                            <T>
                              {tr("projects.completedDate", {
                                date: localizedDate(new Date(p.completedAt!)),
                              })}
                            </T>
                          )}
                          {s.milestones
                            .filter((m) => m.projectId === p.id && !m.deletedAt)
                            .sort((a, b) => a.sortOrder - b.sortOrder)
                            .map((m) => (
                              <Row key={m.id}>
                                <Button
                                  title={`${m.completedAt ? "✓" : "○"} ${m.title}`}
                                  disabled={busy}
                                  onPress={() =>
                                    void mutate((s) => {
                                      const x = s.milestones.find(
                                        (x) => x.id === m.id,
                                      )!;
                                      x.completedAt = x.completedAt
                                        ? null
                                        : new Date().toISOString();
                                      x.updatedAt = new Date().toISOString();
                                    })
                                  }
                                />
                                <Button
                                  title={tr("common.delete")}
                                  disabled={busy}
                                  onPress={() =>
                                    void mutate((s) => {
                                      const x = s.milestones.find(
                                        (x) => x.id === m.id,
                                      )!;
                                      x.deletedAt = new Date().toISOString();
                                      x.updatedAt = x.deletedAt;
                                    })
                                  }
                                />
                              </Row>
                            ))}
                          <Row>
                            <Button
                              title={tr("coach.edit.add.milestones")}
                              onPress={() => {
                                setProject(p);
                                setMilestoneDrafts(
                                  s.milestones
                                    .filter(
                                      (m) =>
                                        m.projectId === p.id && !m.deletedAt,
                                    )
                                    .sort((a, b) => a.sortOrder - b.sortOrder),
                                );
                                setNewMilestoneId(null);
                              }}
                            />
                            {(
                              [
                                "active",
                                "paused",
                                "completed",
                                "cancelled",
                              ] as const
                            )
                              .filter((status) => status !== p.status)
                              .map((status) => (
                                <Button
                                  key={status}
                                  title={
                                    {
                                      active: tr("coach.resume.coach"),
                                      paused: tr("coach.on.hold"),
                                      completed: tr("common.complete"),
                                      cancelled: tr("common.cancel"),
                                    }[status]
                                  }
                                  disabled={busy}
                                  onPress={() =>
                                    void mutate((s) => {
                                      setProjectStatus(s, p.id, status);
                                    })
                                  }
                                />
                              ))}
                          </Row>
                        </Card>
                      ))}
                  </>
                )}
              </>
            )}
            <Text style={{ color: c.muted }}>
              {busy
                ? tr("coach.saving")
                : tr("coach.saved.on.this.device.go.at.your.own.pace")}
              {Platform.OS === "web"
                ? tr("coach.clearing.browser.data.also.deletes.your.records")
                : ""}
            </Text>
          </View>
        </ScrollView>
        <Modal
          visible={!!routine || !!project || !!log}
          animationType="slide"
          onRequestClose={close}
        >
          <EditorInsets>
            <SafeAreaView
              testID="app-shell"
              style={{ flex: 1, backgroundColor: c.bg }}
            >
              <EditorScroll>
                <View style={{ width: "100%", maxWidth: 640, gap: 18 }}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <T big>
                        {routine
                          ? tr("coach.my.routine")
                          : project
                            ? tr("coach.my.project")
                            : tr("coach.edit.activity.record")}
                      </T>
                    </View>
                    <Button
                      title={tr("common.close")}
                      disabled={busy}
                      onPress={close}
                    />
                  </Row>
                  {!!error && <T>{text(error)}</T>}
                  {routine && (
                    <>
                      <T>{tr("coach.1.what.would.you.like.to.do")}</T>
                      <Row>
                        {[
                          ...new Set([
                            ...activities,
                            ...s.routines.map((r) => r.category),
                          ]),
                        ].map((a) => (
                          <Button
                            key={a}
                            title={
                              activityKeys[a]
                                ? formatRaw(locale, activityKeys[a])
                                : a
                            }
                            selected={routine.category === a}
                            onPress={() =>
                              change({
                                category: a,
                                title: activityKeys[a]
                                  ? formatRaw(locale, activityKeys[a])
                                  : a,
                                durationMinutes: ["취침", "기상"].includes(a)
                                  ? null
                                  : 20,
                              })
                            }
                          />
                        ))}
                      </Row>
                      <Field
                        label={tr("coach.activity.name.you.can.add.your.own")}
                        value={routine.title}
                        onChange={(title) =>
                          change({
                            title,
                            category: title.trim() || "기타",
                          })
                        }
                      />
                      <Field
                        label={tr("coach.description.optional")}
                        multiline
                        value={routine.description ?? ""}
                        onChange={(description) =>
                          change({ description: description || null })
                        }
                      />
                      <T>{tr("coach.2.how.often")}</T>
                      <Row>
                        {(
                          Object.keys(
                            frequencyKeys,
                          ) as (keyof typeof frequencyKeys)[]
                        ).map((f) => (
                          <Button
                            key={f}
                            title={tr(frequencyKeys[f])}
                            selected={routine.frequencyType === f}
                            onPress={() => change({ frequencyType: f })}
                          />
                        ))}
                      </Row>
                      {routine.frequencyType === "weekly" && (
                        <>
                          <T>{tr("coach.weekly.goal.coach")}</T>
                          <Row>
                            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                              <Button
                                key={n}
                                title={tr("routines.goalCount", { count: n })}
                                selected={routine.weeklyTarget === n}
                                onPress={() => change({ weeklyTarget: n })}
                              />
                            ))}
                          </Row>
                          <T>
                            {tr(
                              "coach.weekly.goals.are.not.assigned.to.specific.dates",
                            )}
                          </T>
                        </>
                      )}
                      {routine.frequencyType === "weekdays" && (
                        <Row>
                          {["일", "월", "화", "수", "목", "금", "토"].map(
                            (d, i) => (
                              <Button
                                key={d}
                                title={weekday(locale, i)}
                                selected={routine.preferredDays.includes(i)}
                                onPress={() =>
                                  change({
                                    preferredDays:
                                      routine.preferredDays.includes(i)
                                        ? routine.preferredDays.filter(
                                            (d) => d !== i,
                                          )
                                        : [...routine.preferredDays, i],
                                  })
                                }
                              />
                            ),
                          )}
                        </Row>
                      )}
                      {!["취침", "기상"].includes(routine.category) && (
                        <Row>
                          {[10, 15, 20, 30, 45, 60].map((n) => (
                            <Button
                              key={n}
                              title={tr("units.duration", { minutes: n })}
                              selected={routine.durationMinutes === n}
                              onPress={() => change({ durationMinutes: n })}
                            />
                          ))}
                        </Row>
                      )}
                      {!["취침", "기상"].includes(routine.category) && (
                        <Field
                          label={tr("coach.duration.minutes.optional")}
                          numeric
                          value={
                            routine.durationMinutes === null
                              ? ""
                              : String(routine.durationMinutes)
                          }
                          onChange={(v) =>
                            change({
                              durationMinutes: v === "" ? null : Number(v),
                            })
                          }
                        />
                      )}
                      <DateField
                        label={
                          routine.frequencyType === "once"
                            ? tr("coach.activity.date")
                            : tr("coach.start.date")
                        }
                        value={routine.startDate}
                        onChange={(v) => change({ startDate: v! })}
                      />
                      {routine.frequencyType !== "once" && (
                        <DateField
                          label={tr("coach.end.date.optional")}
                          value={routine.endDate}
                          optional
                          min={routine.startDate}
                          onChange={(endDate) => change({ endDate })}
                        />
                      )}
                      {routine.frequencyType !== "weekly" && (
                        <>
                          <TimeField
                            label={tr("coach.notification.and.target.time")}
                            value={routine.reminderTime}
                            optional
                            onChange={(reminderTime) =>
                              change({ reminderTime })
                            }
                          />
                          <T>
                            {tr(
                              "coach.leave.blank.to.schedule.at.9.am.without.notifications",
                            )}
                          </T>
                        </>
                      )}
                      <Button
                        title={tr("coach.save.routine")}
                        selected
                        disabled={busy}
                        onPress={() =>
                          void mutate((s) => saveRoutine(s, routine)).then(
                            (ok) => {
                              if (ok) setRoutine(null);
                            },
                          )
                        }
                      />
                    </>
                  )}
                  {project && (
                    <>
                      <Field
                        label={tr("coach.project.title")}
                        value={project.title}
                        onChange={(title) => setProject({ ...project, title })}
                      />
                      <Field
                        label={tr("coach.description")}
                        multiline
                        value={project.description ?? ""}
                        onChange={(description) =>
                          setProject({
                            ...project,
                            description: description || null,
                          })
                        }
                      />
                      <DateField
                        label={tr("coach.project.start.date")}
                        value={project.startedAt}
                        onChange={(v) =>
                          setProject({ ...project, startedAt: v! })
                        }
                      />
                      <DateField
                        label={tr("coach.project.target.date.optional")}
                        value={project.targetDate}
                        optional
                        min={project.startedAt}
                        onChange={(targetDate) =>
                          setProject({ ...project, targetDate })
                        }
                      />
                      <Field
                        label={tr("coach.finish.criteria.coach")}
                        multiline
                        value={project.completionCriteria ?? ""}
                        onChange={(completionCriteria) =>
                          setProject({
                            ...project,
                            completionCriteria: completionCriteria || null,
                          })
                        }
                      />
                      {milestoneDrafts.map((m, index) => (
                        <Card key={m.id}>
                          <Field
                            label={tr("projects.milestones.label", {
                              number: index + 1,
                            })}
                            autoFocus={m.id === newMilestoneId}
                            value={m.title}
                            onChange={(title) =>
                              setMilestoneDrafts((ms) =>
                                ms.map((x) =>
                                  x.id === m.id ? { ...x, title } : x,
                                ),
                              )
                            }
                          />
                          <Row>
                            <Button
                              title={tr("coach.move.up")}
                              disabled={index === 0}
                              onPress={() =>
                                setMilestoneDrafts((ms) => {
                                  const next = [...ms];
                                  [next[index - 1], next[index]] = [
                                    next[index],
                                    next[index - 1],
                                  ];
                                  return next;
                                })
                              }
                            />
                            <Button
                              title={tr("coach.move.down")}
                              disabled={index === milestoneDrafts.length - 1}
                              onPress={() =>
                                setMilestoneDrafts((ms) => {
                                  const next = [...ms];
                                  [next[index + 1], next[index]] = [
                                    next[index],
                                    next[index + 1],
                                  ];
                                  return next;
                                })
                              }
                            />
                            <Button
                              title={tr("projects.milestones.delete", {
                                number: index + 1,
                              })}
                              disabled={busy}
                              onPress={() =>
                                setMilestoneDrafts((items) =>
                                  items.filter((item) => item.id !== m.id),
                                )
                              }
                            />
                          </Row>
                        </Card>
                      ))}
                      <Button
                        title={tr("projects.milestones.add")}
                        disabled={busy}
                        onPress={() => {
                          const item: ProjectMilestone = {
                            ...stamp(),
                            projectId: project.id,
                            title: "",
                            sortOrder: milestoneDrafts.length,
                            completedAt: null,
                          };
                          setMilestoneDrafts((items) => [...items, item]);
                          setNewMilestoneId(item.id);
                        }}
                      />
                      <T>
                        {tr(
                          "coach.add.milestones.then.save.them.together.name.or.delete",
                        )}
                      </T>
                      <Button
                        title={tr("coach.save.project")}
                        selected
                        disabled={busy}
                        onPress={() => {
                          if (projectSavePending.current) return;
                          projectSavePending.current = true;
                          void mutate((s) => {
                            saveProjectWithMilestones(
                              s,
                              project,
                              milestoneDrafts,
                            );
                          })
                            .then((ok) => {
                              if (ok) {
                                setProject(null);
                                setNewMilestoneId(null);
                              }
                            })
                            .finally(() => {
                              projectSavePending.current = false;
                            });
                        }}
                      />
                    </>
                  )}
                  {log && (
                    <>
                      <DateField
                        label={tr("coach.completion.date")}
                        value={completionTime.slice(0, 10)}
                        onChange={(v) =>
                          setCompletionTime(v + completionTime.slice(10))
                        }
                      />
                      <TimeField
                        label={tr("coach.completion.time")}
                        value={completionTime.slice(11)}
                        onChange={(v) =>
                          setCompletionTime(completionTime.slice(0, 11) + v)
                        }
                      />
                      <Field
                        label={tr("coach.actual.duration.minutes")}
                        numeric
                        value={
                          log.actualDurationMinutes === null
                            ? ""
                            : String(log.actualDurationMinutes)
                        }
                        onChange={(v) =>
                          setLog({
                            ...log,
                            actualDurationMinutes: v === "" ? null : Number(v),
                          })
                        }
                      />
                      <Field
                        label={tr("coach.notes")}
                        multiline
                        value={log.note ?? ""}
                        onChange={(note) =>
                          setLog({ ...log, note: note || null })
                        }
                      />
                      <Button
                        title={tr("coach.save.record")}
                        selected
                        disabled={busy}
                        onPress={() =>
                          void mutate((s) => {
                            const completedAt =
                              parseLocalDateTime(completionTime);
                            if (
                              log.actualDurationMinutes !== null &&
                              (!Number.isFinite(log.actualDurationMinutes) ||
                                log.actualDurationMinutes < 0)
                            )
                              throw new LocalizedError(
                                "errors.check.the.duration",
                              );
                            const i = s.logs.findIndex(
                              (l) => l.id === log.id && !l.deletedAt,
                            );
                            if (i < 0)
                              throw new LocalizedError(
                                "coach.no.records.found",
                              );
                            s.logs[i] = {
                              ...log,
                              completedAt,
                              updatedAt: new Date().toISOString(),
                            };
                          }).then((ok) => {
                            if (ok) setLog(null);
                          })
                        }
                      />
                    </>
                  )}
                </View>
              </EditorScroll>
            </SafeAreaView>
          </EditorInsets>
        </Modal>
      </SafeAreaView>
    </Theme.Provider>
  );
}
