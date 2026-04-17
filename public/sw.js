// ============================================================
// Sivas İtfaiye — Service Worker (PWA Offline)
// Cache-first strategy + Background Sync Queue
// ============================================================

const CACHE_NAME = 'sivas-itfaiye-v2';
const OFFLINE_URL = '/login';

// Static assets to pre-cache
const PRECACHE_URLS = [
  '/',
  '/login',
  '/manifest.json',
  '/logo-belediye.png',
  '/logo-itfaiye.png',
];

// ---- INSTALL ----
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ---- ACTIVATE ----
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// ---- FETCH (Cache-first with network fallback) ----
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and Supabase API calls
  if (request.method !== 'GET') return;
  if (url.hostname.includes('supabase')) return;
  if (url.pathname.startsWith('/api/')) return;

  // For navigation requests: network-first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // For static assets: cache-first
  if (url.pathname.startsWith('/_next/static/') || 
      url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        });
      })
    );
    return;
  }
});

// ---- BACKGROUND SYNC ----
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    const db = await openDB();
    const tx = db.transaction('offlineQueue', 'readonly');
    const store = tx.objectStore('offlineQueue');
    const allItems = await getAllFromStore(store);
    
    for (const item of allItems) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body,
        });
        
        if (response.ok) {
          // Remove from queue on success
          const deleteTx = db.transaction('offlineQueue', 'readwrite');
          deleteTx.objectStore('offlineQueue').delete(item.id);
        }
      } catch {
        // Will retry on next sync
        console.log('[SW] Sync failed for item, will retry:', item.id);
      }
    }
  } catch (err) {
    console.error('[SW] Sync error:', err);
  }
}

// IndexedDB helpers for Service Worker context
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SivasItfaiyeOffline', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        db.createObjectStore('offlineQueue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---- MESSAGE HANDLER (receive queue items from main thread) ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'QUEUE_SYNC') {
    self.registration.sync.register('sync-offline-queue').catch(() => {
      // Background Sync not supported, try immediate sync
      syncOfflineQueue();
    });
  }
});
