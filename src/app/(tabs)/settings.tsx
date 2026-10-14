import { useState } from 'react';
import { Alert, Linking, ScrollView, Text, View } from 'react-native';

import { Button, Card, Header, Muted, Screen, Segmented, SectionTitle } from '@/components/ui';
import { exportBackup, pickBackup } from '@/lib/backup';
import type { ThemePreference } from '@/lib/types';
import { useLibrary } from '@/store/library';

export default function SettingsScreen() {
  const theme = useLibrary((s) => s.settings.theme);
  const setTheme = useLibrary((s) => s.setTheme);
  const importItems = useLibrary((s) => s.importItems);
  const clearAll = useLibrary((s) => s.clearAll);
  const count = useLibrary((s) => Object.keys(s.items).length);
  const [busy, setBusy] = useState(false);

  const onExport = async () => {
    setBusy(true);
    try {
      await exportBackup();
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const onImport = async () => {
    setBusy(true);
    try {
      const parsed = await pickBackup();
      if (!parsed) return;
      const summary = `${parsed.items.length} ${parsed.items.length === 1 ? 'title' : 'titles'} found${
        parsed.skipped ? ` (${parsed.skipped} skipped as invalid)` : ''
      }.`;
      Alert.alert('Import backup', `${summary}\n\nMerge keeps your current library and adds or updates titles from the file. Replace wipes the current library first.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Merge', onPress: () => importItems(parsed.items, parsed.settings, 'merge') },
        {
          text: 'Replace',
          style: 'destructive',
          onPress: () => importItems(parsed.items, parsed.settings, 'replace'),
        },
      ]);
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const onClear = () =>
    Alert.alert('Delete all data?', 'This removes every title and all progress from this device. Export a backup first if you might want it back.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete everything', style: 'destructive', onPress: clearAll },
    ]);

  return (
    <Screen>
      <Header title="Settings" />
      <ScrollView contentContainerClassName="pb-10">
        <SectionTitle>Appearance</SectionTitle>
        <View className="px-4">
          <Segmented<ThemePreference>
            value={theme}
            onChange={setTheme}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </View>

        <SectionTitle>Backup</SectionTitle>
        <Card className="mx-4 p-4">
          <Muted>
            Your library is stored only on this device. Export a JSON backup to move it elsewhere or keep it safe.
          </Muted>
          <View className="mt-4 gap-3">
            <Button label="Export backup (.json)" icon="download-outline" onPress={onExport} disabled={busy || count === 0} />
            <Button label="Import backup" icon="push-outline" variant="secondary" onPress={onImport} disabled={busy} />
          </View>
        </Card>

        <SectionTitle>Data</SectionTitle>
        <Card className="mx-4 p-4">
          <Muted>{count} {count === 1 ? 'title' : 'titles'} stored on this device.</Muted>
          <Button className="mt-4" label="Delete all data" icon="trash-outline" variant="danger" onPress={onClear} disabled={count === 0} />
        </Card>

        <View className="mt-8 px-6">
          <Text
            onPress={() => Linking.openURL('https://www.themoviedb.org')}
            className="text-center text-xs text-zinc-500 dark:text-zinc-400">
            This product uses the TMDB API but is not endorsed or certified by TMDB.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
