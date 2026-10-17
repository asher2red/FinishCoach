import React, { useState, useSyncExternalStore } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { saveRoutine, complete, undo, stats, generate } from "../domain/engine";
import { saveProject, setProjectStatus, projectDays } from "../domain/projects";
import { requestPermission } from "../services/notifications";
import { router } from "expo-router";
const pages = ["오늘", "루틴", "기록", "통계", "프로젝트"];
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
const Theme = React.createContext({
  bg: "#F3F5F0",
  card: "#FFFFFF",
  text: "#172C25",
  muted: "#62756A",
  accent: "#28644C",
  soft: "#E1ECE2",
});
function T({
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
function Card({ children }: { children: React.ReactNode }) {
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
function Row({ children }: { children: React.ReactNode }) {
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
function Button({
  title,
  onPress,
  selected = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const c = React.useContext(Theme);
  return (
    <Pressable
      accessibilityRole="button"
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
function Field({
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
function Empty({ text }: { text: string }) {
  return (
    <Card>
      <T>아직 기록이 없어요</T>
      <T>{text}</T>
    </Card>
  );
}
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
  const scheme = useColorScheme();
  // Match the static server snapshot before applying the browser's preference.
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const dark = hydrated && scheme === "dark";
  const c = dark
    ? {
        bg: "#111C17",
        card: "#1D2D24",
        text: "#EAF4EC",
        muted: "#AEC1B2",
        accent: "#A1D5AE",
        soft: "#304838",
      }
    : {
        bg: "#F3F5F0",
        card: "#FFFFFF",
        text: "#172C25",
        muted: "#62756A",
        accent: "#28644C",
        soft: "#E1ECE2",
      };
  const page = section;
  const setPage = (p: string) =>
    router.replace(
      (["/", "/routines", "/history", "/statistics", "/projects"] as const)[
        pages.indexOf(p)
      ],
    );
  const [routine, setRoutine] = useState<Routine | null>(null),
    [project, setProject] = useState<Project | null>(null),
    [log, setLog] = useState<CompletionLog | null>(null),
    [message, setMessage] = useState(""),
    [milestone, setMilestone] = useState("");
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
  const [period, setPeriod] = useState("일"),
    [date, setDate] = useState(localDate()),
    [filter, setFilter] = useState("전체"),
    [archive, setArchive] = useState(false);
  const today = localDate(),
    n = stats(s, today),
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
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(date + "T12:00:00").getTime());
  const logs = s.logs
    .filter(
      (l) =>
        !l.deletedAt &&
        (filter === "전체" || l.routineId === filter) &&
        validDate,
    )
    .filter((l) => {
      const d = localDate(new Date(l.completedAt));
      return period === "일"
        ? d === date
        : period === "주"
          ? d >= weekStart(date) && d < addDays(weekStart(date), 7)
          : d.startsWith(date.slice(0, 7));
    })
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const close = () => {
    setRoutine(null);
    setProject(null);
    setLog(null);
  };
  return (
    <Theme.Provider value={c}>
      <SafeAreaView
        testID="app-shell"
        style={{ flex: 1, backgroundColor: c.bg }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 20,
            paddingBottom: 80,
            alignItems: "center",
          }}
        >
          <View style={{ width: "100%", maxWidth: 960, gap: 22 }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ color: c.accent, fontSize: 23, fontWeight: "800" }}
                >
                  finish coach ↗
                </Text>
                <Text style={{ color: c.muted }}>
                  작은 실행이 완성으로 이어지는 곳
                </Text>
              </View>
              <Button
                title="알림 설정"
                onPress={() =>
                  void requestPermission()
                    .then((message) => {
                      setMessage(message);
                      void mutate((s) => generate(s));
                    })
                    .catch(() => setMessage("알림 설정을 열 수 없습니다."))
                }
              />
            </Row>
            <Row>
              {pages.map((p) => (
                <Button
                  key={p}
                  title={p}
                  selected={page === p}
                  onPress={() => setPage(p)}
                />
              ))}
            </Row>
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
                    <View
                      style={{
                        backgroundColor: c.accent,
                        padding: 26,
                        borderRadius: 24,
                        gap: 15,
                      }}
                    >
                      <Text style={{ color: c.bg }}>TODAY’S FOCUS</Text>
                      <Text
                        style={{ color: c.bg, fontSize: 38, fontWeight: "700" }}
                      >
                        {items.length
                          ? Math.round((done / items.length) * 100)
                          : 0}
                        %
                      </Text>
                      <Text style={{ color: c.bg }}>
                        {done}개 완료 ·{" "}
                        {items.filter((o) => o.status === "planned").length}개
                        남음 ·{" "}
                        {items.filter((o) => o.status === "skipped").length}개
                        건너뜀
                      </Text>
                    </View>
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
                        <Card key={o.id}>
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
                        <Card key={r.id}>
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
                        <Card key={p.id}>
                          <T>{p.title}</T>
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
                        <Card key={r.id}>
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
                      {["일", "주", "월"].map((p) => (
                        <Button
                          key={p}
                          title={p}
                          selected={period === p}
                          onPress={() => setPeriod(p)}
                        />
                      ))}
                    </Row>
                    <Field
                      label="조회 기준일 (YYYY-MM-DD)"
                      value={date}
                      onChange={setDate}
                    />
                    <Row>
                      <Button
                        title="이전"
                        disabled={!validDate}
                        onPress={() =>
                          setDate(
                            addDays(
                              date,
                              period === "일" ? -1 : period === "주" ? -7 : -30,
                            ),
                          )
                        }
                      />
                      <Button title="오늘" onPress={() => setDate(today)} />
                      <Button
                        title="다음"
                        disabled={!validDate}
                        onPress={() =>
                          setDate(
                            addDays(
                              date,
                              period === "일" ? 1 : period === "주" ? 7 : 30,
                            ),
                          )
                        }
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
                    {!logs.length && (
                      <Empty text="이 기간에 완료 기록이 없습니다." />
                    )}
                    {logs.map((l) => (
                      <Card key={l.id}>
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
                    ))}
                  </>
                )}
                {page === "통계" && (
                  <>
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
                        <Card key={r.id}>
                          <T>{r.title}</T>
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
                        <Card key={p.id}>
                          <T>{p.title}</T>
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
                        setMilestone("");
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
                        <Card key={p.id}>
                          <T big>{p.title}</T>
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
                                setMilestone("");
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
          <SafeAreaView
            testID="app-shell"
            style={{ flex: 1, backgroundColor: c.bg }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 24, alignItems: "center" }}
            >
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
                      value={routine.description ?? ""}
                      onChange={(description) =>
                        change({ description: description || null })
                      }
                    />
                    <T>2. 얼마나 자주 할까요?</T>
                    <Row>
                      {(
                        Object.keys(frequencies) as (keyof typeof frequencies)[]
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
                        <Field
                          label="주간 목표 (1~7회)"
                          numeric
                          value={String(routine.weeklyTarget ?? 3)}
                          onChange={(v) => change({ weeklyTarget: Number(v) })}
                        />
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
                                  preferredDays: routine.preferredDays.includes(
                                    i,
                                  )
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
                    <Field
                      label={
                        routine.frequencyType === "once"
                          ? "실행일 (YYYY-MM-DD)"
                          : "시작일 (YYYY-MM-DD)"
                      }
                      value={routine.startDate}
                      onChange={(startDate) => change({ startDate })}
                    />
                    {routine.frequencyType !== "once" && (
                      <Field
                        label="종료일 (선택, YYYY-MM-DD)"
                        value={routine.endDate ?? ""}
                        onChange={(v) => change({ endDate: v || null })}
                      />
                    )}
                    {routine.frequencyType !== "weekly" && (
                      <>
                        <Field
                          label="알림 및 목표 시각 (선택, HH:mm)"
                          value={routine.reminderTime ?? ""}
                          onChange={(v) => change({ reminderTime: v || null })}
                        />
                        <T>
                          비워 두면 알림 없이 오전 9시 일정으로 표시합니다. 상단
                          알림 설정에서 권한을 허용하세요.
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
                      value={project.description ?? ""}
                      onChange={(description) =>
                        setProject({
                          ...project,
                          description: description || null,
                        })
                      }
                    />
                    <Field
                      label="시작일 (YYYY-MM-DD)"
                      value={project.startedAt}
                      onChange={(startedAt) =>
                        setProject({ ...project, startedAt })
                      }
                    />
                    <Field
                      label="목표일 (선택, YYYY-MM-DD)"
                      value={project.targetDate ?? ""}
                      onChange={(targetDate) =>
                        setProject({
                          ...project,
                          targetDate: targetDate || null,
                        })
                      }
                    />
                    <Field
                      label="완료 기준"
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
                        </Row>
                      </Card>
                    ))}
                    <Field
                      label="추가할 마일스톤 (선택)"
                      value={milestone}
                      onChange={setMilestone}
                    />
                    <T>
                      저장 후 다시 편집하면 마일스톤을 계속 추가할 수 있습니다.
                    </T>
                    <Button
                      title="프로젝트 저장"
                      selected
                      disabled={busy}
                      onPress={() =>
                        void mutate((s) => {
                          saveProject(s, project);
                          const p = project;
                          milestoneDrafts.forEach((draft, index) => {
                            if (!draft.title.trim())
                              throw new Error("마일스톤 이름을 입력하세요.");
                            const item = s.milestones.find(
                              (m) => m.id === draft.id,
                            );
                            if (item) {
                              item.title = draft.title.trim();
                              item.sortOrder = index;
                              item.updatedAt = new Date().toISOString();
                            }
                          });
                          if (milestone.trim())
                            s.milestones.push({
                              ...stamp(),
                              projectId: p.id,
                              title: milestone.trim(),
                              sortOrder: s.milestones.filter(
                                (m) => m.projectId === p.id,
                              ).length,
                              completedAt: null,
                            });
                        }).then((ok) => {
                          if (ok) {
                            setProject(null);
                            setMilestone("");
                          }
                        })
                      }
                    />
                  </>
                )}
                {log && (
                  <>
                    <Field
                      label="완료 날짜 및 시각 (YYYY-MM-DD HH:mm)"
                      value={completionTime}
                      onChange={setCompletionTime}
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
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Theme.Provider>
  );
}
