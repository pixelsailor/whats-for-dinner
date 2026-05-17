import { browser } from '$app/environment';
import { readable } from 'svelte/store';

type NetworkStatus = {
  online: boolean;
};

const initial: NetworkStatus = {
  online: browser ? navigator.onLine : true
};

export const networkStore = readable<NetworkStatus>(initial, (set) => {
  if (!browser) {
    return undefined;
  }

  const update = () => {
    set({ online: navigator.onLine });
  };

  window.addEventListener('online', update);
  window.addEventListener('offline', update);

  return () => {
    window.removeEventListener('online', update);
    window.removeEventListener('offline', update);
  };
});
