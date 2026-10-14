import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IMG } from '@/lib/tmdb';
import { useTheme } from '@/lib/theme';

export type IconName = keyof typeof Ionicons.glyphMap;

/* ---------- Layout ---------- */

/** Full-height screen with safe-area top padding and a centered, max-width column. */
export function Screen({
  children,
  className = '',
  topInset = true,
}: {
  children: ReactNode;
  className?: string;
  topInset?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-paper dark:bg-ink"
      style={{ paddingTop: topInset ? insets.top : 0 }}>
      <View className={`w-full max-w-3xl flex-1 self-center ${className}`}>{children}</View>
    </View>
  );
}

export function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View className="flex-row items-end justify-between px-5 pb-3 pt-4">
      <View className="flex-1 pr-3">
        <Text className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Card({ className = '', ...props }: ViewProps) {
  return (
    <View
      className={`rounded-2xl border border-paper-line bg-paper-card dark:border-ink-line dark:bg-ink-card ${className}`}
      {...props}
    />
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text className="px-5 pb-2 pt-5 text-xs font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
      {children}
    </Text>
  );
}

/* ---------- Controls ---------- */

export function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mr-2 rounded-full border px-3.5 py-1.5 ${
        active
          ? 'border-accent bg-accent'
          : 'border-paper-line bg-paper-card dark:border-ink-line dark:bg-ink-card'
      }`}>
      <Text
        className={`text-sm font-medium ${
          active ? 'text-white' : 'text-zinc-700 dark:text-zinc-300'
        }`}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled,
  className = '',
}: {
  label: string;
  onPress?: () => void;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
}) {
  const { c } = useTheme();
  const styles = {
    primary: 'bg-accent',
    secondary: 'border border-paper-line bg-paper-card dark:border-ink-line dark:bg-ink-card',
    danger: 'border border-red-500/30 bg-red-500/10',
  }[variant];
  const textColor = {
    primary: 'text-white',
    secondary: 'text-zinc-900 dark:text-zinc-50',
    danger: 'text-red-500',
  }[variant];
  const iconColor = variant === 'primary' ? '#ffffff' : variant === 'danger' ? '#ef4444' : c.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`flex-row items-center justify-center rounded-xl px-4 py-3 active:opacity-80 ${styles} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}>
      {icon ? <Ionicons name={icon} size={18} color={iconColor} style={{ marginRight: 8 }} /> : null}
      <Text className={`text-[15px] font-semibold ${textColor}`}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  size = 22,
  filled,
  label,
}: {
  name: IconName;
  onPress?: () => void;
  size?: number;
  filled?: boolean;
  label?: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${
        filled ? 'bg-accent' : 'border border-paper-line bg-paper-card dark:border-ink-line dark:bg-ink-card'
      }`}>
      <Ionicons name={name} size={size} color={filled ? '#ffffff' : c.text} />
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-xl border border-paper-line bg-paper-soft p-1 dark:border-ink-line dark:bg-ink-soft">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            className={`flex-1 items-center rounded-lg py-2 ${
              active ? 'bg-paper-card dark:bg-ink-card' : ''
            }`}>
            <Text
              className={`text-sm font-medium ${
                active ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-500 dark:text-zinc-400'
              }`}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Display ---------- */

export function ProgressBar({ value }: { value: number }) {
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
      <View
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }}
      />
    </View>
  );
}

export function Poster({
  path,
  width,
  size = 'w185',
  radius = 10,
}: {
  path: string | null;
  width: number;
  size?: 'w185' | 'w342' | 'w500';
  radius?: number;
}) {
  const { c } = useTheme();
  const uri = IMG.poster(path, size);
  const height = Math.round(width * 1.5);
  return (
    <View
      style={{ width, height, borderRadius: radius, backgroundColor: c.line, overflow: 'hidden' }}
      className="items-center justify-center">
      {uri ? (
        <Image source={{ uri }} style={{ width, height }} contentFit="cover" transition={150} />
      ) : (
        <Ionicons name="film-outline" size={Math.max(18, width / 3)} color={c.muted} />
      )}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View className="items-center px-8 py-16">
      <Ionicons name={icon} size={40} color={c.muted} />
      <Text className="mt-4 text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
      </Text>
      {body ? (
        <Text className="mt-1 text-center text-sm text-zinc-500 dark:text-zinc-400">{body}</Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}

/** Fades whatever is behind it into the screen background (a gradient without a native dependency). */
export function FadeToBg({ height = 120 }: { height?: number }) {
  const { c } = useTheme();
  const steps = 16;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height }}>
      {Array.from({ length: steps }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: c.bg, opacity: Math.pow((i + 1) / steps, 1.6) }} />
      ))}
    </View>
  );
}

export function Muted({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <Text className={`text-sm text-zinc-500 dark:text-zinc-400 ${className}`}>{children}</Text>;
}

/* ---------- Formatting ---------- */

export function formatMinutes(total: number): string {
  if (total <= 0) return '0h';
  const days = Math.floor(total / (60 * 24));
  const hours = Math.floor((total % (60 * 24)) / 60);
  const mins = Math.round(total % 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

export function formatDate(date: string | null): string {
  if (!date) return 'TBA';
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "Today", "Tomorrow", "In 5 days", or a formatted date. */
export function relativeDay(date: string | null): string {
  if (!date) return 'TBA';
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 1 && diff < 14) return `In ${diff} days`;
  return formatDate(date);
}
