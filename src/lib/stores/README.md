# Stores

**Stores** represent reactive data stored in browser memory. The type of **Store** used depends on
the method in which it was created.

What's For Dinner uses custom stores to subscribe to Dexie **LiveQuery** tables as Observables.
See https://dexie.org/docs/liveQuery%28%29

In Svelte, **Stores** allow reactive access to a value via a simple *store contract*. LLMs should
refer to https://svelte.dev/docs/svelte/stores/llms.txt for assistance. 

## Accessing Live Data

The browser must act as the single source of truth for all data that it is aware of. All requests
should be handled by local data first. In the event local data is not available, cloud data may be
requested, if service is available. A request for cloud data should immediately update local stores.
Cloud data must be subservient to local data, when that data lives in both locations. If a conflict 
exists the user should confirm which version to use, at which point the other version will be 
updated accordingly to maintain consistency.

### Maintaining Synchronicity

If cloud services are available, saving changes to the cloud should happen first. When a row is 
updated cloud functions will automatically trigger timestamp changes, including `updated_at` and
`last_synced_at`, and in the case of new entries, a uuid created. The row will be returned after a 
successful entry and this value should be used to update the local database.

If cloud services are unavailable or an error occurs preventing the entry, the local database
should be updated manually; including an update to the `updated_at` column with the current 
timestamp in ISO format.

Synchronization conflicts should be resolved by the data with the most recent `updated_at`
timestamp taking priority.