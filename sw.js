/**
 * 家庭银行 PWA Service Worker
 * 离线缓存，支持网络优先策略更新
 * Version: family-bank-v1
 */

var CACHE_NAME = 'family-bank-v1';
var CACHE_URLS = [
  './',
  './index.html',
  './manifest.json'
];

// Install: 缓存所有资源
self.addEventListener('install', function(event) {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('[SW] Caching app resources');
      return cache.addAll(CACHE_URLS);
    }).then(function() {
      console.log('[SW] Skip waiting');
      return self.skipWaiting();
    }).catch(function(err) {
      console.log('[SW] Install failed:', err);
    })
  );
});

// Activate: 清理旧缓存
self.addEventListener('activate', function(event) {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(name) {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(function() {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch: 网络优先，失败时使用缓存
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // 仅处理同源请求
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request).then(function(response) {
      // 如果是成功的响应，克隆并更新缓存
      if (response && response.status === 200 && response.type === 'basic') {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          // 只缓存同一域名的资源
          if (event.request.url.startsWith(self.location.origin)) {
            cache.put(event.request, responseClone);
          }
        });
      }
      return response;
    }).catch(function() {
      // 网络失败，从缓存读取
      return caches.match(event.request).then(function(response) {
        if (response) {
          console.log('[SW] Serving from cache:', url);
          return response;
        }
        // 如果连缓存都没有，返回离线页面
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// 监听来自页面的消息（如推送通知等）
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
