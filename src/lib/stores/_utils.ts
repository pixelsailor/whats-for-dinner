import { liveQuery } from 'dexie';
import { readable } from 'svelte/store';

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
