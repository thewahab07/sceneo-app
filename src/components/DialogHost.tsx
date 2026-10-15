import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  addDays,
  buildMonthGrid,
  formatYMD,
  isFuture,
  MIN_YEAR,
  MONTHS,
  MONTHS_SHORT,
  sameDay,
  todayYMD,
  toTimestamp,
  WEEKDAYS,
  ymdOf,
  type YMD,
} from "@/lib/dates";
import {
  useDialogStore,
  type DateRequest,
  type DialogAction,
  type MessageRequest,
} from "@/lib/dialog";
import { useTheme } from "@/lib/theme";
import { Chip, type IconName } from "./ui";

const DANGER = "#ef4444";
const SUCCESS = "#22c55e";

/* ---------- Host: mounts once in the root layout ---------- */

export function DialogHost() {
  const current = useDialogStore((s) => s.queue[0]);
  const shift = useDialogStore((s) => s.shift);
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const currentId = current?.id;

  // Animate in whenever a new dialog becomes the current one.
  useEffect(() => {
    if (currentId === undefined) return;
    closing.current = false;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [currentId, progress]);

  /** Animates out, then resolves the caller's promise and moves on to the next dialog. */
  const close = useCallback(
    (deliver: () => void) => {
      if (closing.current) return;
      closing.current = true;
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        deliver();
        shift();
      });
    },
    [progress, shift],
  );

  if (!current) return null;

  const dismiss = () => close(() => current.resolve(null));

  const isSheet = current.kind === "date";

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.fill}>
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, styles.backdrop, { opacity: progress }]}
        />
        <Pressable
          style={styles.fill}
          onPress={dismiss}
          accessibilityLabel="Close"
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.fill,
            isSheet ? styles.sheetAlign : styles.centerAlign,
          ]}
        >
          <Animated.View
            style={
              isSheet
                ? {
                    width: "100%",
                    alignItems: "center",
                    transform: [
                      {
                        translateY: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [360, 0],
                        }),
                      },
                    ],
                  }
                : {
                    width: "100%",
                    alignItems: "center",
                    opacity: progress,
                    transform: [
                      {
                        scale: progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.94, 1],
                        }),
                      },
                    ],
                  }
            }
          >
            {current.kind === "message" ? (
              <MessageDialog
                request={current}
                onAction={(value) => close(() => current.resolve(value))}
              />
            ) : (
              <DateSheet
                request={current}
                onCancel={dismiss}
                onDone={(ts) => close(() => current.resolve(ts))}
              />
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  backdrop: { backgroundColor: "rgba(0,0,0,0.65)" },
  centerAlign: { justifyContent: "center", alignItems: "center", padding: 24 },
  sheetAlign: { justifyContent: "flex-end", alignItems: "center" },
});

/* ---------- Message dialog (alerts, confirms, choices) ---------- */

function DialogButton({
  action,
  onPress,
  className = "",
}: {
  action: DialogAction;
  onPress: () => void;
  className?: string;
}) {
  const style = action.style ?? "secondary";
  const box = {
    primary: "bg-accent",
    danger: "bg-red-500",
    secondary:
      "border border-paper-line bg-paper-soft dark:border-ink-line dark:bg-ink-soft",
    ghost: "",
  }[style];
  const text = {
    primary: "text-white",
    danger: "text-white",
    secondary: "text-zinc-900 dark:text-zinc-50",
    ghost: "text-zinc-500 dark:text-zinc-400",
  }[style];

  return (
    <Pressable
      onPress={onPress}
      className={`items-center justify-center rounded-xl px-4 py-3.5 active:opacity-80 ${box} ${className}`}
    >
      <Text className={`text-[15px] font-semibold ${text}`}>
        {action.label}
      </Text>
    </Pressable>
  );
}

function MessageDialog({
  request,
  onAction,
}: {
  request: MessageRequest;
  onAction: (value: string) => void;
}) {
  const { c } = useTheme();
  const tone =
    request.tone === "danger"
      ? DANGER
      : request.tone === "success"
        ? SUCCESS
        : c.accent;
  const stacked = request.actions.length > 2;

  return (
    <View className="w-full max-w-sm rounded-3xl border border-paper-line bg-paper-card p-6 dark:border-ink-line dark:bg-ink-card">
      {request.icon ? (
        <View
          className="mb-4 h-14 w-14 items-center justify-center self-center rounded-full"
          style={{ backgroundColor: `${tone}26` }}
        >
          <Ionicons name={request.icon as IconName} size={28} color={tone} />
        </View>
      ) : null}

      <Text className="text-center text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        {request.title}
      </Text>
      {request.message ? (
        <Text className="mt-2 text-center text-[15px] leading-[22px] text-zinc-500 dark:text-zinc-400">
          {request.message}
        </Text>
      ) : null}

      <View className={`mt-6 gap-3 ${stacked ? "" : "flex-row"}`}>
        {request.actions.map((action) => (
          <DialogButton
            key={action.value}
            action={action}
            className={stacked ? "" : "flex-1"}
            onPress={() => {
              if (action.style === "danger") {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
              }
              onAction(action.value);
            }}
          />
        ))}
      </View>
    </View>
  );
}

/* ---------- Date sheet ---------- */

function NavButton({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={6}
      className={`h-10 w-10 items-center justify-center rounded-full bg-paper-soft active:opacity-70 dark:bg-ink-soft ${
        disabled ? "opacity-30" : ""
      }`}
    >
      <Ionicons name={icon} size={20} color={c.text} />
    </Pressable>
  );
}

function DateSheet({
  request,
  onCancel,
  onDone,
}: {
  request: DateRequest;
  onCancel: () => void;
  onDone: (timestamp: number) => void;
}) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  const today = useMemo(() => todayYMD(), []);
  const yesterday = useMemo(() => addDays(today, -1), [today]);

  const start = useMemo(() => {
    const initial = request.initial != null ? ymdOf(request.initial) : today;
    return isFuture(initial, today) ? today : initial;
  }, [request.initial, today]);

  const [selected, setSelected] = useState<YMD>(start);
  const [view, setView] = useState({ y: start.y, m: start.m });
  const [mode, setMode] = useState<"days" | "months">("days");

  const choose = (day: YMD) => {
    Haptics.selectionAsync();
    setSelected(day);
    setView({ y: day.y, m: day.m });
    setMode("days");
  };

  const atCurrentMonth = view.y === today.y && view.m >= today.m;
  const atMinMonth = view.y <= MIN_YEAR && (mode === "months" || view.m === 0);
  const canNext = mode === "days" ? !atCurrentMonth : view.y < today.y;
  const canPrev = !atMinMonth;

  const step = (dir: 1 | -1) => {
    if (mode === "days") {
      const date = new Date(view.y, view.m + dir, 1);
      setView({ y: date.getFullYear(), m: date.getMonth() });
    } else {
      const y = view.y + dir;
      // Don't land on a month that hasn't happened yet this year.
      setView({ y, m: y === today.y ? Math.min(view.m, today.m) : view.m });
    }
  };

  const grid = useMemo(() => buildMonthGrid(view.y, view.m), [view.y, view.m]);
  const cell = { width: `${100 / 7}%` as const, height: 44 };

  return (
    <View
      className="w-full max-w-md rounded-t-3xl border border-b-0 border-paper-line bg-paper-card dark:border-ink-line dark:bg-ink-card"
      style={{
        paddingBottom: Math.max(insets.bottom, 16),
        maxHeight: height * 0.92,
      }}
    >
      <View className="mt-3 h-1 w-10 self-center rounded-full bg-zinc-300 dark:bg-zinc-700" />

      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerClassName="px-5 pb-2 pt-4"
      >
        <Text className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {request.title}
        </Text>
        {request.subtitle ? (
          <Text
            className="mt-1 text-sm text-zinc-500 dark:text-zinc-400"
            numberOfLines={1}
          >
            {request.subtitle}
          </Text>
        ) : null}

        {/* Quick picks */}
        <View className="mt-4 flex-row">
          <Chip
            label="Today"
            active={sameDay(selected, today)}
            onPress={() => choose(today)}
          />
          <Chip
            label="Yesterday"
            active={sameDay(selected, yesterday)}
            onPress={() => choose(yesterday)}
          />
        </View>

        {/* Calendar */}
        <View className="mt-3 rounded-2xl bg-paper-soft p-3 dark:bg-ink-soft">
          <View className="mb-2 flex-row items-center justify-between">
            <NavButton
              icon="chevron-back"
              label={mode === "days" ? "Previous month" : "Previous year"}
              disabled={!canPrev}
              onPress={() => step(-1)}
            />
            <Pressable
              onPress={() => setMode(mode === "days" ? "months" : "days")}
              accessibilityLabel="Choose month and year"
              className="flex-row items-center rounded-full px-3 py-2 active:opacity-70"
            >
              <Text className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {mode === "days" ? `${MONTHS[view.m]} ${view.y}` : view.y}
              </Text>
              <Ionicons
                name={mode === "days" ? "chevron-down" : "chevron-up"}
                size={16}
                color={c.muted}
                style={{ marginLeft: 6 }}
              />
            </Pressable>
            <NavButton
              icon="chevron-forward"
              label={mode === "days" ? "Next month" : "Next year"}
              disabled={!canNext}
              onPress={() => step(1)}
            />
          </View>

          {mode === "days" ? (
            <>
              <View className="flex-row">
                {WEEKDAYS.map((w, i) => (
                  <View
                    key={i}
                    style={{ width: cell.width, height: 28 }}
                    className="items-center justify-center"
                  >
                    <Text className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                      {w}
                    </Text>
                  </View>
                ))}
              </View>
              <View className="flex-row flex-wrap">
                {grid.map((d, i) => {
                  if (d === null) return <View key={i} style={cell} />;
                  const day: YMD = { y: view.y, m: view.m, d };
                  const disabled = isFuture(day, today);
                  const isSelected = sameDay(day, selected);
                  const isToday = sameDay(day, today);
                  return (
                    <Pressable
                      key={i}
                      disabled={disabled}
                      onPress={() => choose(day)}
                      accessibilityLabel={formatYMD(day)}
                      style={cell}
                      className="items-center justify-center"
                    >
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${
                          isSelected
                            ? "bg-accent"
                            : isToday
                              ? "border border-accent"
                              : ""
                        }`}
                      >
                        <Text
                          className={`text-[15px] ${
                            isSelected
                              ? "font-bold text-white"
                              : disabled
                                ? "text-zinc-300 dark:text-zinc-700"
                                : "text-zinc-900 dark:text-zinc-50"
                          }`}
                        >
                          {d}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : (
            <View className="flex-row flex-wrap py-1">
              {MONTHS_SHORT.map((name, m) => {
                const disabled = view.y === today.y && m > today.m;
                const active = view.m === m;
                return (
                  <Pressable
                    key={name}
                    disabled={disabled}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setView({ y: view.y, m });
                      setMode("days");
                    }}
                    style={{ width: "33.333%", height: 52 }}
                    className="items-center justify-center"
                  >
                    <View
                      className={`h-11 w-[86%] items-center justify-center rounded-xl ${
                        active ? "bg-accent" : ""
                      }`}
                    >
                      <Text
                        className={`text-[15px] font-medium ${
                          active
                            ? "text-white"
                            : disabled
                              ? "text-zinc-300 dark:text-zinc-700"
                              : "text-zinc-900 dark:text-zinc-50"
                        }`}
                      >
                        {name}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View className="mt-4 flex-row items-center justify-center">
          <Ionicons name="calendar-outline" size={16} color={c.accent} />
          <Text className="ml-2 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
            {formatYMD(selected)}
          </Text>
        </View>
      </ScrollView>

      <View className="flex-row gap-3 px-5 pt-3">
        <Pressable
          onPress={onCancel}
          className="flex-1 items-center rounded-xl border border-paper-line bg-paper-soft py-3.5 active:opacity-80 dark:border-ink-line dark:bg-ink-soft"
        >
          <Text className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          onPress={() =>
            onDone(toTimestamp(selected, { existing: request.initial }))
          }
          className="flex-[1.6] items-center rounded-xl bg-accent py-3.5 active:opacity-80"
        >
          <Text className="text-[15px] font-semibold text-white">
            {request.confirmLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
