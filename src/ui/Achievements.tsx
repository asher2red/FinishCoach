import { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  achievementProgress,
  buildAchievements,
  type AchievementGoal,
} from "../domain/achievements";
import { dateAt, type State } from "../domain/model";
import { useI18n } from "../i18n/context";
import { Button } from "./design";
import { useAppTheme } from "./useAppTheme";

const runner = require("../../assets/achievements/runner.png");
const paw = require("../../assets/achievements/runner-paw.png");
const runnerSize = 88;
const runnerHeight = 80;
const stride = [0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0];
const strideTimes = stride.map((_, index) => index / (stride.length - 1));
const limbs = [
  { name: "back-arm", x: 56, y: 45, length: 17, rest: -40, swing: 29 },
  { name: "back-foot", x: 35, y: 59, length: 19, rest: 26, swing: -36 },
  { name: "front-foot", x: 47, y: 59, length: 20, rest: -22, swing: 39 },
  { name: "front-arm", x: 44, y: 50, length: 17, rest: -55, swing: -32 },
] as const;

function RunnerSprite({ position }: { position?: Animated.Value }) {
  const renderLimb = (limb: (typeof limbs)[number], behind?: boolean) => {
    const rotate =
      position?.interpolate({
        inputRange: strideTimes,
        outputRange: stride.map(
          (phase) => limb.rest + phase * limb.swing + "deg",
        ),
        extrapolate: "clamp",
      }) ?? limb.rest + "deg";
    return (
      <Animated.View
        key={limb.name}
        testID={position ? "achievement-runner-" + limb.name : undefined}
        style={{
          position: "absolute",
          left: limb.x,
          top: limb.y,
          height: limb.length,
          width: 12,
          opacity: behind ? 0.8 : 1,
          // Move the rotation pivot from the middle to the shoulder or hip.
          transform: [
            { translateY: -limb.length / 2 },
            { rotate },
            { translateY: limb.length / 2 },
          ],
        }}
      >
        <Image
          source={paw}
          style={styles.runnerImage}
          contentFit="fill"
          accessible={false}
        />
      </Animated.View>
    );
  };
  return (
    <View style={styles.sprite} accessible={false} pointerEvents="none">
      {limbs.slice(0, 2).map((limb) => renderLimb(limb, true))}
      {renderLimb(limbs[2])}
      <Image
        source={runner}
        style={styles.runnerImage}
        contentFit="fill"
        accessible={false}
      />
      {renderLimb(limbs[3])}
    </View>
  );
}
const goalLabels = {
  days: "achievements.daysGoal",
  weekly: "achievements.weeklyGoal",
  milestones: "achievements.milestoneGoal",
  project: "achievements.finishedProject",
} as const;

function Race({ goal }: { goal: AchievementGoal }) {
  const { t, number } = useI18n();
  const progress = achievementProgress(goal);
  const [trackWidth, setTrackWidth] = useState(0);
  const [motion, setMotion] = useState(false);
  const [replay, setReplay] = useState(0);
  const [position] = useState(() => new Animated.Value(1));
  const remaining = Math.max(0, goal.target - goal.done);
  const complete = remaining === 0;
  const encouragement = complete
    ? "achievements.reached"
    : progress >= 0.75
      ? "achievements.almost"
      : goal.done > 0
        ? "achievements.soFar"
        : "achievements.firstStep";

  useEffect(() => {
    let active = true;
    const update = (reduced: boolean) => {
      if (active) setMotion(!reduced);
    };
    void AccessibilityInfo.isReduceMotionEnabled().then(update, () => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      update,
    );
    return () => {
      active = false;
      listener.remove();
    };
  }, []);

  useEffect(() => {
    if (!motion || !progress || trackWidth <= runnerSize) {
      position.setValue(1);
      return;
    }
    position.setValue(0);
    const animation = Animated.timing(position, {
      toValue: 1,
      duration: 850 + Math.round(700 * progress),
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [goal.id, motion, position, progress, replay, trackWidth]);

  const distance = Math.max(0, trackWidth - runnerSize) * progress;
  const translateX = position.interpolate({
    inputRange: [0, 1],
    outputRange: [0, distance],
  });
  const translateY = position.interpolate({
    inputRange: [0, 0.16, 0.32, 0.48, 0.64, 0.8, 0.9, 1],
    outputRange: [0, -9, 0, -9, 0, -9, -3, 0],
  });
  const scale = position.interpolate({
    inputRange: [0, 0.84, 0.94, 1],
    outputRange: [0.88, 1, complete ? 1.09 : 1.04, 1],
  });
  const percent = number(complete ? 100 : Math.floor(progress * 100));
  const unit = t(
    goal.kind === "days"
      ? "achievements.dayUnit"
      : goal.kind === "weekly"
        ? "achievements.sessionUnit"
        : "achievements.stepUnit",
  );
  return (
    <View style={styles.hero}>
      <Text style={styles.goalType}>
        {t(goalLabels[goal.kind])}
        {goal.title ? " \u00b7 " + goal.title : ""}
      </Text>
      <Text accessibilityRole="header" style={styles.heroTitle}>
        {t(encouragement)}
      </Text>
      <Text style={styles.heroCopy}>
        {complete
          ? t("achievements.reachedNote")
          : t("achievements.remaining", { count: number(remaining), unit })}
      </Text>
      <View style={styles.heroNumbers}>
        <Text style={styles.percent}>{percent}%</Text>
        <Text style={styles.goalCount}>
          {number(goal.done)} / {number(goal.target)}
          {goal.kind !== "project" && " " + unit}
        </Text>
      </View>
      <View
        accessible={false}
        style={styles.race}
        onLayout={({ nativeEvent }) => setTrackWidth(nativeEvent.layout.width)}
      >
        <View style={styles.lane} />
        <View style={styles.finishPost}>
          <View style={styles.checker}>
            {Array.from({ length: 8 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.square,
                  {
                    backgroundColor:
                      (i + Math.floor(i / 4)) % 2 ? "#FFF4D6" : "#563E32",
                  },
                ]}
              />
            ))}
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.runner,
            { transform: [{ translateX }, { translateY }, { scale }] },
          ]}
        >
          <RunnerSprite position={position} />
        </Animated.View>
      </View>
      <View
        style={styles.rail}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <View style={styles.trackLabels}>
        <Text style={styles.trackText}>{t("achievements.start")}</Text>
        {motion && progress > 0 && (
          <Pressable
            accessibilityRole="button"
            onPress={() => setReplay((value) => value + 1)}
            style={styles.replay}
          >
            <Text style={styles.replayText}>{t("achievements.replay")}</Text>
          </Pressable>
        )}
        <Text style={styles.trackText}>{t("achievements.finish")}</Text>
      </View>
    </View>
  );
}

function AchievementContent({
  state,
  today,
  onClose,
}: {
  state: State;
  today: string;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const { t, date, number } = useI18n();
  const { goals, days, titles } = useMemo(
    () => buildAchievements(state, today),
    [state, today],
  );
  const [selectedGoal, setSelectedGoal] = useState(goals[0].id);
  const [selectedDate, setSelectedDate] = useState<string>();
  const goal = goals.find(({ id }) => id === selectedGoal) ?? goals[0];
  const activeDays = days.filter(({ entries }) => entries.length > 0);
  const detail =
    activeDays.find((day) => day.date === selectedDate) ?? activeDays.at(-1);
  return (
    <SafeAreaView
      accessibilityViewIsModal
      style={[styles.screen, { backgroundColor: theme.bg }]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <View style={styles.headerInner}>
          <Text
            accessibilityRole="header"
            style={[styles.headerTitle, { color: theme.text }]}
          >
            {t("achievements.title")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.close")}
            onPress={onClose}
            style={[styles.close, { backgroundColor: theme.soft }]}
          >
            <Text style={[styles.closeText, { color: theme.text }]}>
              {"\u00d7"}
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          {goals.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.goals}
            >
              {goals.map((item) => {
                const selected = item.id === goal.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setSelectedGoal(item.id)}
                    style={[
                      styles.goal,
                      {
                        borderColor: theme.border,
                        backgroundColor: selected ? theme.accent : theme.card,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        color: selected ? theme.onAccent : theme.text,
                        fontWeight: "700",
                      }}
                    >
                      {item.title ?? t(goalLabels[item.kind])}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <Race goal={goal} />
          <View
            style={[
              styles.history,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: theme.text }]}
            >
              {t("achievements.last30")}
            </Text>
            <Text style={{ color: theme.muted }}>
              {t("achievements.activeDays", {
                count: number(activeDays.length),
              })}
            </Text>
            <View style={styles.calendar}>
              {days.map(({ date: day, entries }) => {
                const selected = day === detail?.date;
                return (
                  <View key={day} style={styles.daySlot}>
                    <Pressable
                      testID={`achievement-day-${day}`}
                      accessibilityRole="button"
                      accessibilityLabel={`${date(dateAt(day), { month: "long", day: "numeric" })} ? ${t("achievements.entries", { count: number(entries.length) })}`}
                      accessibilityState={{
                        disabled: entries.length === 0,
                        selected,
                      }}
                      disabled={!entries.length}
                      onPress={() => setSelectedDate(day)}
                      style={[
                        styles.day,
                        {
                          backgroundColor: selected
                            ? theme.accent
                            : entries.length
                              ? theme.hover
                              : theme.bg,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: selected
                            ? theme.onAccent
                            : entries.length
                              ? theme.text
                              : theme.muted,
                          fontWeight: entries.length ? "800" : "400",
                        }}
                      >
                        {number(Number(day.slice(-2)))}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {detail ? (
              <View style={[styles.detail, { borderTopColor: theme.border }]}>
                <Text
                  accessibilityRole="header"
                  style={[styles.detailTitle, { color: theme.text }]}
                >
                  {date(dateAt(detail.date), {
                    month: "long",
                    day: "numeric",
                    weekday: "short",
                  })}
                </Text>
                {detail.entries.map((log) => (
                  <View key={log.id} style={styles.entry}>
                    <Text style={[styles.tick, { color: theme.accent }]}>
                      {"\u2713"}
                    </Text>
                    <Text style={[styles.entryTitle, { color: theme.text }]}>
                      {titles.get(log.routineId) ?? t("coach.archived.routine")}
                    </Text>
                    {log.actualDurationMinutes !== null && (
                      <Text style={[styles.entryTime, { color: theme.muted }]}>
                        {t("achievements.minutes", {
                          count: number(log.actualDurationMinutes),
                        })}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: theme.muted }}>
                {t("achievements.empty")}
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function AchievementEntry({
  state,
  today,
}: {
  state: State;
  today: string;
}) {
  const { t } = useI18n();
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <View
        style={[
          styles.entryCard,
          { borderColor: theme.border, backgroundColor: theme.soft },
        ]}
      >
        <RunnerSprite />
        <View style={styles.entryCopy}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t("achievements.title")}
          </Text>
          <Text style={{ color: theme.muted }}>
            {t("achievements.entryCopy")}
          </Text>
          <Button
            selected
            title={t("achievements.open")}
            onPress={() => setOpen(true)}
          />
        </View>
      </View>
      {open && (
        <Modal
          visible
          animationType="none"
          presentationStyle="fullScreen"
          onRequestClose={() => setOpen(false)}
        >
          <AchievementContent
            state={state}
            today={today}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerInner: {
    minHeight: 62,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: { fontSize: 21, fontWeight: "800", flexShrink: 1 },
  close: {
    height: 44,
    width: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { fontSize: 28, lineHeight: 30 },
  scroll: { alignItems: "center", padding: 16, paddingBottom: 32 },
  content: { width: "100%", maxWidth: 680, gap: 16 },
  goals: { gap: 8, paddingRight: 2 },
  goal: {
    minHeight: 44,
    maxWidth: 230,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 22,
  },
  hero: {
    padding: 20,
    borderRadius: 26,
    backgroundColor: "#FCECCB",
    borderWidth: 1,
    borderColor: "#EBD6AB",
    gap: 5,
  },
  goalType: { fontSize: 13, fontWeight: "800", color: "#884222" },
  heroTitle: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "900",
    letterSpacing: -1,
    color: "#412A23",
  },
  heroCopy: { fontSize: 15, lineHeight: 22, color: "#725043" },
  heroNumbers: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    columnGap: 10,
    marginTop: 2,
  },
  percent: {
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -2,
    color: "#A23323",
  },
  goalCount: { fontSize: 15, fontWeight: "800", color: "#725043" },
  race: { height: 102, position: "relative", overflow: "hidden", marginTop: 3 },
  lane: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 11,
    height: 18,
    backgroundColor: "#EFCBA6",
    borderRadius: 12,
    borderBottomWidth: 2,
    borderColor: "#D59669",
  },
  runner: {
    position: "absolute",
    left: 0,
    bottom: 14,
    width: runnerSize,
    height: runnerHeight,
  },
  runnerImage: { width: "100%", height: "100%" },
  finishPost: {
    position: "absolute",
    right: 3,
    bottom: 17,
    height: 55,
    width: 3,
    backgroundColor: "#563E32",
    borderRadius: 2,
  },
  checker: {
    position: "absolute",
    right: 2,
    width: 28,
    height: 14,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  square: { width: 7, height: 7 },
  rail: {
    height: 7,
    borderRadius: 9,
    overflow: "hidden",
    backgroundColor: "#EBD5AA",
  },
  fill: { height: "100%", borderRadius: 9, backgroundColor: "#AD3827" },
  trackLabels: {
    minHeight: 38,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  trackText: { color: "#725043", fontSize: 12, fontWeight: "700" },
  replay: { minHeight: 44, paddingHorizontal: 12, justifyContent: "center" },
  replayText: { color: "#863723", fontWeight: "800", fontSize: 13 },
  history: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 9 },
  sectionTitle: { fontSize: 19, fontWeight: "800" },
  calendar: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -3,
    rowGap: 6,
  },
  daySlot: { width: "16.666666%", paddingHorizontal: 3 },
  day: {
    height: 44,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  detail: { borderTopWidth: 1, paddingTop: 12, gap: 4 },
  detailTitle: { fontSize: 15, fontWeight: "800", marginBottom: 6 },
  entry: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingVertical: 5,
  },
  tick: { fontWeight: "900" },
  entryTitle: { flex: 1, fontSize: 14 },
  entryTime: { fontSize: 13 },
  entryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  sprite: { width: runnerSize, height: runnerHeight, position: "relative" },
  entryCopy: { flex: 1, gap: 7, alignItems: "flex-start" },
});
