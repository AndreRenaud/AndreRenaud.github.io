var cacheName = 'solitaire-pwa';
var filesToCache = [
    'index.html',
    'solitaire.html',
    'solitaire.js',
    'card.js',
    'cardTable.js',
    'sw.js',
    'favicon.ico',
    'firework.js',
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
    // Just cache everything on the site.
    // We don't do dynamic content, so this isn't a problem.

    event.respondWith(cacheFirstWithRefresh(event.request));
});
