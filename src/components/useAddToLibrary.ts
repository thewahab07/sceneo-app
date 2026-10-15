import { useCallback, useState } from "react";

import { notify } from "@/lib/dialog";
import { getMeta } from "@/lib/tmdb";
import type { MediaType, Status } from "@/lib/types";
import { itemKey } from "@/lib/types";
import { useLibrary } from "@/store/library";

/** Fetches full metadata from TMDB and adds the title to the library. */
export function useAddToLibrary() {
  const addItem = useLibrary((s) => s.addItem);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const add = useCallback(
    async (
      type: MediaType,
      id: number,
      status: Status = "planned",
      /** Movies added as completed: when it was watched (defaults to now). */
      watchedAt: number | null = null,
    ) => {
      const key = itemKey(type, id);
      setBusyKey(key);
      try {
        const meta = await getMeta(type, id);
        addItem(meta, status, watchedAt);
        return true;
      } catch (e) {
        notify({
          title: "Could not add title",
          message: e instanceof Error ? e.message : "Something went wrong.",
          tone: "danger",
        });
        return false;
      } finally {
        setBusyKey(null);
      }
    },
    [addItem],
  );

  return { add, busyKey };
}
