import '../global.css';

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palettes } from '@/lib/theme';
import { useLibrary } from '@/store/library';

export default function RootLayout() {
  const theme = useLibrary((s) => s.settings.theme);
  const { colorScheme, setColorScheme } = useColorScheme();

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  const isDark = colorScheme === 'dark';
  const p = isDark ? palettes.dark : palettes.light;
  const base = isDark ? DarkTheme : DefaultTheme;

  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={{
          ...base,
          colors: {
            ...base.colors,
            background: p.bg,
            card: p.card,
            border: p.line,
            text: p.text,
            primary: p.accent,
          },
        }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="title/[type]/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
