/// <reference types="@sveltejs/kit" />

import { build, files, version } from '$service-worker';

const CACHE_NAME = `app-cache-${version}`;
const DATA_CACHE = `data-cache-${version}`;

// All static assets: compiled JS/CSS, app icons, etc.
const staticAssets = [...build, ...files];
const staticAssetSet = new Set(staticAssets);
const dataRoutePrefixes = [
  '/recipes',
  '/recommendations',
  '/suggestions',
  '/preferences'
];

// Install: preload all static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(staticAssets))
  );
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME && key !== DATA_CACHE)
            .map((key) => caches.delete(key))
        )
      )
  );
});

// Fetch handler
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin) return;

  // ---------- 1. STATIC FILES (cache-first) ----------
  if (staticAssetSet.has(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || !response.ok) return response;
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // ---------- 2. DYNAMIC DATA (network-first) ----------
  if (shouldCacheData(url.pathname)) {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  if (url.pathname === '/') {
    event.respondWith(networkFirst(event.request, DATA_CACHE));
    return;
  }

  // Default same-origin GET requests still benefit from offline cache.
  event.respondWith(networkFirst(event.request, DATA_CACHE));
});

const shouldCacheData = (pathname) => {
  if (!pathname) return false;
  return dataRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
};

// Helper: network-first with cache fallback
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      cache.put(request, fresh.clone());
    }
    return fresh;
  } catch (err) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw err;
  }
}
