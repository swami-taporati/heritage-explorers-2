const CACHE_NAME = 'heritage-v4-cache'; // Incremented version
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  // Updated to match the Cinzel and Fauna One fonts used in your HTML
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Fauna+One&display=swap'
];

// Install Service Worker
self.addEventListener('install', event => {
  self.skipWaiting(); // Forces the new service worker to take over immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Network falling back to Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
