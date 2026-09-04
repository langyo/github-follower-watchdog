import { ref } from "vue";

import { loadWatchData, type WatchData } from "./load";

export type WatchStatus = "loading" | "ready" | "nodata" | "error";

export const status = ref<WatchStatus>("loading");
export const watch = ref<WatchData | null>(null);

/** Fetch the watch records once for the whole shell — App calls it on
 * setup and the error state's retry button calls it again. */
export async function initWatch(): Promise<void> {
  status.value = "loading";
  try {
    watch.value = await loadWatchData();
    status.value = "ready";
  } catch (err) {
    status.value = err instanceof Error && err.message === "no watch records yet" ? "nodata" : "error";
  }
}
