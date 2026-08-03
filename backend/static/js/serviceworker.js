// Service Worker for Raste PWA
const CACHE_NAME = 'raste-cache-v1';
const OFFLINE_URL = '/offline/';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/offline/',
    '/static/icons/icon-192.png',
    '/static/icons/icon-512.png',
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Precaching assets...');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate event - clean old caches
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

// Fetch event - Cache First strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;
    
    // Skip API requests (let them go to network)
    if (event.request.url.includes('/api/')) {
        return fetch(event.request).catch(() => {
            return new Response(
                JSON.stringify({ error: 'اتصال اینترنت قطع است.' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        });
    }
    
    // For images: Cache First
    if (event.request.destination === 'image') {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                const fetchPromise = fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                    return response;
                });
                return cached || fetchPromise;
            })
        );
        return;
    }
    
    // For HTML pages: Network First, fallback to cache, then offline
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
                return response;
            })
            .catch(() => {
                return caches.match(event.request).then((cached) => {
                    return cached || caches.match(OFFLINE_URL);
                });
            })
    );
});

// Push notification
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    const options = {
        body: data.body || 'یک پیام جدید دارید',
        icon: '/static/icons/icon-192.png',
        badge: '/static/icons/icon-192.png',
        vibrate: [200, 100, 200],
        data: {
            url: data.url || '/',
        },
    };
    event.waitUntil(
        self.registration.showNotification(
            data.title || 'راسته',
            options
        )
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});
