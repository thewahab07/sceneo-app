import { useColorScheme } from 'nativewind';

const light = {
  bg: '#faf8f7',
  card: '#ffffff',
  line: '#e8e3e0',
  text: '#18181b',
  muted: '#71717a',
  accent: '#FF6347',
  onAccent: '#ffffff',
};

const dark = {
  bg: '#000000',
  card: '#171717',
  line: '#2a2a2a',
  text: '#fafafa',
  muted: '#a1a1aa',
  accent: '#FF6347',
  onAccent: '#ffffff',
};

export type Palette = typeof light;

/** Hex values for places where className can't be used (icons, placeholders, spinners). */
export function useTheme() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  return { isDark, c: isDark ? dark : light };
}

export const palettes = { light, dark };
