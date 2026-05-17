import { liveQuery } from 'dexie';
import { readable } from 'svelte/store';

/**
 * Create a live query store that can be used to subscribe to changes in the database.
 * @param queryFn - The function to execute to get the data.
 * @returns A readable store formatted as { data: T | null, loading: boolean, error: Error | null }.
 */
export function createLiveQueryStore<T>(queryFn: () => Promise<T>) {
  return readable<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>(
    {
      data: null,
      loading: true,
      error: null
    },
    (set) => {
      const subscription = liveQuery(queryFn).subscribe({
        next: (data) => set({ data, loading: false, error: null }),
        error: (error) => set({ data: null, loading: false, error })
      });

      return () => subscription.unsubscribe();
    }
  );
}
