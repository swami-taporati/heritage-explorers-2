const CACHE_NAME = 'heritage-v5-cache'; 
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  // Local Team Icons
  './images/Indian Roller.png',
  './images/Asian Elephant.png',
  './images/Lotus.png',
  './images/Sandalwood.png',
  './images/Mango.png',
  // Fonts
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Fauna+One&display=swap'
];

// Install Service Worker
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('SW: Pre-caching assets');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate - Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Clearing Old Cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Network-First Strategy (Try network, then cache)
// This ensures they get live Leaderboard scores if online, but the app works if offline.
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
