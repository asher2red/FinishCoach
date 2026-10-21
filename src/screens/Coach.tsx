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
const frequencies = {
  daily: "매일",
  weekly: "주 N회",
  weekdays: "특정 요일",
  once: "한 번",
};
export default function Coach({ section = "오늘" }: { section?: string }) {
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
    [message, setMessage] = useState("");
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
    s.routines.find((r) => r.id === id)?.title ?? "보관된 루틴";
  const change = (patch: Partial<Routine>) =>
    setRoutine((r) => (r ? { ...r, ...patch } : r));
  const create = () =>
    setRoutine({
      ...stamp(),
      title: "독서",
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
                title="알림 설정"
                icon="bell"
                onPress={() => setPage("설정")}
              />
            </Row>
            <MenuNavigation activePage={page} />
            <View>
              <Text style={{ color: c.muted }}>
                {new Date().toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                })}
              </Text>
              <T big>
                {page === "오늘"
                  ? "오늘, 하나씩 끝내볼까요?"
                  : page === "루틴"
                    ? "꾸준함을 만드는 루틴"
                    : page === "기록"
                      ? "쌓여가는 나의 실행"
                      : page === "통계"
                        ? "실행으로 확인하는 성장"
                        : page === "설정"
                          ? "나에게 맞는 설정"
                          : "끝까지 가는 프로젝트"}
              </T>
            </View>
            {!!error && (
              <Card>
                <T>{error}</T>
                <Button
                  title={ready ? "닫기" : "저장소 다시 열기"}
                  onPress={() => (ready ? clearError() : void reload())}
                />
              </Card>
            )}
            {!!(message || notice) && (
              <Card>
                <T>{message || notice}</T>
                {!!message && (
                  <Button title="확인" onPress={() => setMessage("")} />
                )}
              </Card>
            )}
            {!ready ? (
              <T>저장소를 준비하고 있습니다…</T>
            ) : (
              <>
                {page === "오늘" && (
                  <>
                    <Card variant="featured">
                      <CardTitle icon="today">오늘의 핵심 행동</CardTitle>
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
                        {done}개 완료 ·{" "}
                        {items.filter((o) => o.status === "planned").length}개
                        남음 ·{" "}
                        {items.filter((o) => o.status === "skipped").length}개
                        건너뜀
                      </Text>
                    </Card>
                    <Row>
                      <View style={{ flex: 1 }}>
                        <T big>오늘의 활동</T>
                      </View>
                      <Button title="＋ 활동 추가" selected onPress={create} />
                    </Row>
                    {!items.length && (
                      <Empty text="루틴을 추가해 첫 실행을 시작하세요. 주간 목표는 아래에서 자유롭게 기록할 수 있어요." />
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
                              "ko-KR",
                              { hour: "2-digit", minute: "2-digit" },
                            )}{" "}
                            ·{" "}
                            {
                              {
                                planned: "예정",
                                completed: "완료",
                                skipped: "건너뜀",
                              }[o.status]
                            }
                          </T>
                          <Row>
                            <Button
                              title="상세"
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
                                  title="기록 수정"
                                  onPress={() =>
                                    openLog(
                                      s.logs.find(
                                        (l) => l.id === o.completedLogId,
                                      ) ?? null,
                                    )
                                  }
                                />
                                <Button
                                  title="완료 취소"
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
                                  title="완료"
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
                                      ? "다시 예정"
                                      : "건너뛰기"
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
                            {r.title} · 주 {r.weeklyTarget}회 목표
                          </T>
                          <T>
                            이번 주{" "}
                            {
                              s.logs.filter(
                                (l) =>
                                  !l.deletedAt &&
                                  l.routineId === r.id &&
                                  localDate(new Date(l.completedAt)) >=
                                    weekStart(today) &&
                                  localDate(new Date(l.completedAt)) <
                                    addDays(weekStart(today), 7),
                              ).length
                            }
                            회 완료 · 정해진 요일 없이 실행
                          </T>
                          <Button
                            title="지금 실행 기록"
                            disabled={busy}
                            onPress={() =>
                              void mutate((s) => complete(s, r.id))
                            }
                          />
                        </Card>
                      ))}
                    <T big>진행 중인 프로젝트</T>
                    {!s.projects.some((p) => p.status === "active") && (
                      <Empty text="프로젝트에서 완성하고 싶은 일을 등록하세요." />
                    )}
                    {s.projects
                      .filter((p) => p.status === "active")
                      .map((p) => (
                        <Card key={p.id} tone="projects">
                          <CardTitle icon="projects">{p.title}</CardTitle>
                          <T>
                            마일스톤{" "}
                            {
                              s.milestones.filter(
                                (m) =>
                                  m.projectId === p.id &&
                                  !m.deletedAt &&
                                  m.completedAt,
                              ).length
                            }{" "}
                            /{" "}
                            {
                              s.milestones.filter(
                                (m) => m.projectId === p.id && !m.deletedAt,
                              ).length
                            }
                          </T>
                          <Button
                            title="프로젝트 보기"
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
                        title="＋ 루틴 만들기"
                        selected
                        onPress={create}
                      />
                      <Button
                        title={archive ? "현재 루틴" : "보관함"}
                        onPress={() => setArchive(!archive)}
                      />
                    </Row>
                    {!s.routines.filter((r) => Boolean(r.deletedAt) === archive)
                      .length && (
                      <Empty text="활동과 반복 빈도를 선택해 나만의 루틴을 만드세요." />
                    )}
                    {s.routines
                      .filter((r) => Boolean(r.deletedAt) === archive)
                      .map((r) => (
                        <Card key={r.id} tone="routines">
                          <T big>{r.title}</T>
                          <T>
                            {frequencies[r.frequencyType]}
                            {r.frequencyType === "weekly"
                              ? ` ${r.weeklyTarget}회`
                              : ""}{" "}
                            · {r.durationMinutes ?? "미지정"}분 ·{" "}
                            {r.isActive ? "활성" : "일시 중지"}
                          </T>
                          <Row>
                            <Button
                              title="상세 · 수정"
                              onPress={() => setRoutine(r)}
                            />
                            <Button
                              title={
                                r.deletedAt
                                  ? "복원"
                                  : r.isActive
                                    ? "일시 중지"
                                    : "다시 시작"
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
                                title="보관"
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
                          title={p}
                          selected={period === p}
                          onPress={() => setPeriod(p)}
                        />
                      ))}
                    </Row>
                    <DateField
                      label="조회 기준일"
                      value={date}
                      onChange={(v) => setDate(v!)}
                    />
                    <Row>
                      <Button
                        title="이전"
                        disabled={!validDate}
                        onPress={() => setDate(shiftPeriod(date, period, -1))}
                      />
                      <Button title="오늘" onPress={() => setDate(today)} />
                      <Button
                        title="다음"
                        disabled={!validDate}
                        onPress={() => setDate(shiftPeriod(date, period, 1))}
                      />
                    </Row>
                    <Row>
                      <Button
                        title="전체"
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
                    <T big>날짜별 실행 기록</T>
                    {!logs.length && (
                      <Empty text="이 기간에 완료 기록이 없습니다." />
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
                            {new Date(l.completedAt).toLocaleString("ko-KR")} ·{" "}
                            {l.actualDurationMinutes ?? "미입력"}분
                          </T>
                          {!!l.note && <T>{l.note}</T>}
                          <Row>
                            <Button title="수정" onPress={() => openLog(l)} />
                            <Button
                              title="완료 취소"
                              disabled={busy}
                              onPress={() => void mutate((s) => undo(s, l.id))}
                            />
                          </Row>
                        </Card>
                      </View>
                    ))}
                    {logs.length > visibleLogs && (
                      <Button
                        title={`기록 더 보기 (${visibleLogs} / ${logs.length})`}
                        onPress={() => setVisibleLogs((n) => n + 50)}
                      />
                    )}
                  </>
                )}
                {page === "설정" && (
                  <>
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
                      <Empty text="첫 활동을 완료하면 실제 데이터로 통계를 확인할 수 있어요." />
                    )}
                    <Row>
                      {[
                        [
                          `${n.weeklyDone} / ${n.weeklyGoal}`,
                          "이번 주 완료 / 목표",
                        ],
                        [n.month, "이번 달 활동"],
                        [n.year, "올해 활동"],
                        [`${n.minutes}분`, "누적 실행 시간"],
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
                      <T big>최근 6주 실행 추이</T>
                      {n.trends.map((t) => (
                        <View key={t.date} style={{ gap: 7 }}>
                          <T>
                            {t.date} · {t.count}회
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
                    <T big>활동별 완료율</T>
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
                              ? `이번 주 ${weekly} / ${r.weeklyTarget}회 · ${Math.round((weekly / Math.max(1, r.weeklyTarget ?? 0)) * 100)}%`
                              : `${count} / ${total}회 · ${total ? Math.round((count / total) * 100) : 0}%`}
                          </T>
                        </Card>
                      );
                    })}
                    <T big>완성한 프로젝트</T>
                    {s.projects
                      .filter((p) => p.status === "completed" && p.completedAt)
                      .map((p) => (
                        <Card key={p.id} tone="projects">
                          <CardTitle icon="projects">{p.title}</CardTitle>
                          <T>{projectDays(p)}일 소요</T>
                        </Card>
                      ))}
                  </>
                )}
                {page === "프로젝트" && (
                  <>
                    <Button
                      title="＋ 프로젝트 만들기"
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
                      <Empty text="완료 기준을 정하고 작은 마일스톤부터 시작하세요." />
                    )}
                    {s.projects
                      .filter((p) => !p.deletedAt)
                      .map((p) => (
                        <Card key={p.id} tone="projects">
                          <CardTitle icon="projects" big>
                            {p.title}
                          </CardTitle>
                          <T>
                            {
                              {
                                active: "진행 중",
                                paused: "보류",
                                completed: "완료",
                                cancelled: "취소",
                              }[p.status]
                            }{" "}
                            · {p.startedAt} ~ {p.targetDate ?? "목표일 미정"}
                          </T>
                          {!!p.description && <T>{p.description}</T>}
                          {!!p.completionCriteria && (
                            <T>완료 기준: {p.completionCriteria}</T>
                          )}
                          {!!p.completedAt && (
                            <T>완료일 {localDate(new Date(p.completedAt))}</T>
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
                                  title="삭제"
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
                              title="편집 · 마일스톤 추가"
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
                                      active: "재개",
                                      paused: "보류",
                                      completed: "완료",
                                      cancelled: "취소",
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
              {busy ? "저장 중…" : "기기에 저장 · 로그인 없이 나의 속도로"}
              {Platform.OS === "web"
                ? " · 브라우저 데이터 삭제 시 기록도 삭제됩니다."
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
                          ? "나의 루틴"
                          : project
                            ? "나의 프로젝트"
                            : "실행 기록 수정"}
                      </T>
                    </View>
                    <Button title="닫기" disabled={busy} onPress={close} />
                  </Row>
                  {!!error && <T>{error}</T>}
                  {routine && (
                    <>
                      <T>1. 어떤 활동을 할까요?</T>
                      <Row>
                        {[
                          ...new Set([
                            ...activities,
                            ...s.routines.map((r) => r.category),
                          ]),
                        ].map((a) => (
                          <Button
                            key={a}
                            title={a}
                            selected={routine.category === a}
                            onPress={() =>
                              change({
                                category: a,
                                title: a,
                                durationMinutes: ["취침", "기상"].includes(a)
                                  ? null
                                  : 20,
                              })
                            }
                          />
                        ))}
                      </Row>
                      <Field
                        label="활동 이름 (직접 추가 가능)"
                        value={routine.title}
                        onChange={(title) =>
                          change({
                            title,
                            category: title.trim() || "기타",
                          })
                        }
                      />
                      <Field
                        label="설명 (선택)"
                        multiline
                        value={routine.description ?? ""}
                        onChange={(description) =>
                          change({ description: description || null })
                        }
                      />
                      <T>2. 얼마나 자주 할까요?</T>
                      <Row>
                        {(
                          Object.keys(
                            frequencies,
                          ) as (keyof typeof frequencies)[]
                        ).map((f) => (
                          <Button
                            key={f}
                            title={frequencies[f]}
                            selected={routine.frequencyType === f}
                            onPress={() => change({ frequencyType: f })}
                          />
                        ))}
                      </Row>
                      {routine.frequencyType === "weekly" && (
                        <>
                          <T>주간 목표 횟수</T>
                          <Row>
                            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                              <Button
                                key={n}
                                title={`${n}회`}
                                selected={routine.weeklyTarget === n}
                                onPress={() => change({ weeklyTarget: n })}
                              />
                            ))}
                          </Row>
                          <T>주간 목표는 특정 날짜에 강제 배정하지 않습니다.</T>
                        </>
                      )}
                      {routine.frequencyType === "weekdays" && (
                        <Row>
                          {["일", "월", "화", "수", "목", "금", "토"].map(
                            (d, i) => (
                              <Button
                                key={d}
                                title={d}
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
                              title={`${n}분`}
                              selected={routine.durationMinutes === n}
                              onPress={() => change({ durationMinutes: n })}
                            />
                          ))}
                        </Row>
                      )}
                      {!["취침", "기상"].includes(routine.category) && (
                        <Field
                          label="소요 시간 (분, 선택)"
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
                          routine.frequencyType === "once" ? "실행일" : "시작일"
                        }
                        value={routine.startDate}
                        onChange={(v) => change({ startDate: v! })}
                      />
                      {routine.frequencyType !== "once" && (
                        <DateField
                          label="종료일 (선택)"
                          value={routine.endDate}
                          optional
                          min={routine.startDate}
                          onChange={(endDate) => change({ endDate })}
                        />
                      )}
                      {routine.frequencyType !== "weekly" && (
                        <>
                          <TimeField
                            label="알림 및 목표 시각"
                            value={routine.reminderTime}
                            optional
                            onChange={(reminderTime) =>
                              change({ reminderTime })
                            }
                          />
                          <T>
                            비워 두면 알림 없이 오전 9시 일정으로 표시합니다.
                            상단 알림 설정에서 권한을 허용하세요.
                          </T>
                        </>
                      )}
                      <Button
                        title="루틴 저장"
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
                        label="프로젝트 제목"
                        value={project.title}
                        onChange={(title) => setProject({ ...project, title })}
                      />
                      <Field
                        label="설명"
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
                        label="프로젝트 시작일"
                        value={project.startedAt}
                        onChange={(v) =>
                          setProject({ ...project, startedAt: v! })
                        }
                      />
                      <DateField
                        label="프로젝트 목표일 (선택)"
                        value={project.targetDate}
                        optional
                        min={project.startedAt}
                        onChange={(targetDate) =>
                          setProject({ ...project, targetDate })
                        }
                      />
                      <Field
                        label="완료 기준"
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
                            label={`마일스톤 ${index + 1}`}
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
                              title="위로"
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
                              title="아래로"
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
                              title={`마일스톤 ${index + 1} 삭제`}
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
                        title="＋ 마일스톤 추가"
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
                        마일스톤을 연속해서 추가한 뒤 한 번에 저장하세요. 빈
                        항목은 이름을 입력하거나 삭제해주세요.
                      </T>
                      <Button
                        title="프로젝트 저장"
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
                        label="완료 날짜"
                        value={completionTime.slice(0, 10)}
                        onChange={(v) =>
                          setCompletionTime(v + completionTime.slice(10))
                        }
                      />
                      <TimeField
                        label="완료 시각"
                        value={completionTime.slice(11)}
                        onChange={(v) =>
                          setCompletionTime(completionTime.slice(0, 11) + v)
                        }
                      />
                      <Field
                        label="실제 소요 시간 (분)"
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
                        label="메모"
                        multiline
                        value={log.note ?? ""}
                        onChange={(note) =>
                          setLog({ ...log, note: note || null })
                        }
                      />
                      <Button
                        title="기록 저장"
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
                              throw new Error("소요 시간을 확인하세요.");
                            const i = s.logs.findIndex(
                              (l) => l.id === log.id && !l.deletedAt,
                            );
                            if (i < 0) throw new Error("기록이 없습니다.");
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
