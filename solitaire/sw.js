var cacheName = 'solitaire-pwa';
var filesToCache = [
    '/',
    '/index.html',
    '/solitaire.html',
    '/solitaire.js',
    '/card.js',
    '/cardTable.js',
    '/sw.js',
];
self.addEventListener('install', function (e) {
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            return cache.addAll(filesToCache);
        })
    );
});
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

async function cacheFirstWithRefresh(request) {
    const fetchResponsePromise = fetch(request).then(async (networkResponse) => {
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    });

    return (await caches.match(request)) || (await fetchResponsePromise);
}
self.addEventListener('fetch', (event) => {
    if (filesToCache.includes(event.pathname)) {
        event.respondWith(cacheFirstWithRefresh(event.request));
    }
});
