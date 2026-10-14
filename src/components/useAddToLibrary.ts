import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { getMeta } from '@/lib/tmdb';
import type { MediaType, Status } from '@/lib/types';
import { itemKey } from '@/lib/types';
import { useLibrary } from '@/store/library';

/** Fetches full metadata from TMDB and adds the title to the library. */
export function useAddToLibrary() {
  const addItem = useLibrary((s) => s.addItem);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const add = useCallback(
    async (type: MediaType, id: number, status: Status = 'planned') => {
      const key = itemKey(type, id);
      setBusyKey(key);
      try {
        const meta = await getMeta(type, id);
        addItem(meta, status);
        return true;
      } catch (e) {
        Alert.alert('Could not add title', e instanceof Error ? e.message : 'Something went wrong.');
        return false;
      } finally {
        setBusyKey(null);
      }
    },
    [addItem],
  );

  return { add, busyKey };
}
