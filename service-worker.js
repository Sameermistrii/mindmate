// MindMate Service Worker for PWA and Caching
const CACHE_NAME = 'mindmate-v1.2.0';
const STATIC_CACHE_NAME = 'mindmate-static-v1.2.0';
const DYNAMIC_CACHE_NAME = 'mindmate-dynamic-v1.2.0';

// Cache static assets
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/auth.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Cache API responses that can be cached
const CACHEABLE_API_PATHS = [
    '/api/careers',
    '/api/learning/resources',
    '/api/community/forum/categories'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Service Worker: Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Error caching static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== STATIC_CACHE_NAME && 
                            cacheName !== DYNAMIC_CACHE_NAME &&
                            cacheName !== CACHE_NAME) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker: Activated successfully');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(handleFetch(request));
});

async function handleFetch(request) {
    const url = new URL(request.url);
    
    try {
        // Strategy 1: Cache First for static assets
        if (STATIC_ASSETS.some(asset => request.url.includes(asset)) || 
            request.url.includes('fonts.googleapis.com') ||
            request.url.includes('cdnjs.cloudflare.com')) {
            return await cacheFirst(request);
        }
        
        // Strategy 2: Stale While Revalidate for API calls that can be cached
        if (CACHEABLE_API_PATHS.some(path => url.pathname.startsWith(path))) {
            return await staleWhileRevalidate(request);
        }
        
        // Strategy 3: Network First for dynamic API calls
        if (url.pathname.startsWith('/api/')) {
            return await networkFirst(request);
        }
        
        // Strategy 4: Cache First for HTML pages
        if (request.headers.get('accept').includes('text/html')) {
            return await cacheFirst(request);
        }
        
        // Default: Network First
        return await networkFirst(request);
        
    } catch (error) {
        console.error('Service Worker: Fetch error:', error);
        
        // Return offline page for navigation requests
        if (request.headers.get('accept').includes('text/html')) {
            return await getOfflinePage();
        }
        
        // Return basic error response for other requests
        return new Response('Service Unavailable', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
                'Content-Type': 'text/plain'
            })
        });
    }
}

// Cache First Strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        const cache = await caches.open(STATIC_CACHE_NAME);
        cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

// Network First Strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 8000);
        
        if (networkResponse.ok && shouldCache(request)) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const networkPromise = fetchWithTimeout(request, 8000)
        .then(response => {
            if (response.ok) {
                const cache = caches.open(DYNAMIC_CACHE_NAME);
                cache.then(c => c.put(request, response.clone()));
            }
            return response;
        })
        .catch(() => {
            // Network failed, but we might have cached response
            return cachedResponse;
        });
    
    return cachedResponse || networkPromise;
}

// Fetch with timeout utility
async function fetchWithTimeout(request, timeoutMs = 6000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(request, { signal: controller.signal });
        return res;
    } finally {
        clearTimeout(id);
    }
}

// Check if request should be cached
function shouldCache(request) {
    const url = new URL(request.url);
    
    // Only allow caching of explicitly safe API paths
    const isCacheableApi = CACHEABLE_API_PATHS.some(path => url.pathname.startsWith(path));

    // Block caching for all auth or user-specific endpoints
    if (url.pathname.includes('/auth/') ||
        url.pathname.includes('/user/') ||
        url.pathname.includes('/assessment/history') ||
        url.pathname.includes('/gamification') ||
        url.pathname.startsWith('/api/') && !isCacheableApi) {
        return false;
    }
    
    // Don't cache non-GET requests
    if (request.method !== 'GET') {
        return false;
    }
    
    // Don't cache real-time data
    if (url.pathname.includes('/chat') || 
        url.pathname.includes('/activity') ||
        url.pathname.includes('/progress')) {
        return false;
    }
    
    return true;
}

// Get offline page
async function getOfflinePage() {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedIndex = await cache.match('/index.html');
    
    if (cachedIndex) {
        return cachedIndex;
    }
    
    // Return basic offline message
    return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>MindMate - Offline</title>
            <style>
                body { 
                    font-family: Inter, sans-serif; 
                    text-align: center; 
                    padding: 2rem;
                    background: #0a0a0a;
                    color: #ffffff;
                }
                .offline-content {
                    max-width: 400px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                .btn {
                    background: #25F4DF;
                    color: #0a0a0a;
                    padding: 0.75rem 1.5rem;
                    border: none;
                    border-radius: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 1rem;
                }
            </style>
        </head>
        <body>
            <div class="offline-content">
                <div class="offline-icon">🧠</div>
                <h1>MindMate</h1>
                <h2>You're Offline</h2>
                <p>Please check your internet connection and try again.</p>
                <button class="btn" onclick="window.location.reload()">Try Again</button>
            </div>
        </body>
        </html>
    `, {
        headers: {
            'Content-Type': 'text/html'
        }
    });
}

// Simple IndexedDB queue for offline actions
const DB_NAME = 'mindmate-sw-db';
const DB_VERSION = 1;
const STORES = {
    assessments: 'pendingAssessments',
    forumPosts: 'pendingForumPosts'
};

function openDb() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORES.assessments)) {
                db.createObjectStore(STORES.assessments, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORES.forumPosts)) {
                db.createObjectStore(STORES.forumPosts, { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function readAll(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function clearStore(storeName) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

// Background sync for offline actions
self.addEventListener('sync', event => {
    console.log('Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'assessment-sync') {
        event.waitUntil(syncAssessmentData());
    }
    
    if (event.tag === 'forum-post-sync') {
        event.waitUntil(syncForumPosts());
    }
});

// Sync assessment data when back online
async function syncAssessmentData() {
    try {
        const data = await readAll(STORES.assessments);
        if (data && data.length) {
            for (const assessment of data) {
                try {
                    await fetch('/api/assessment/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': assessment.token
                        },
                        body: JSON.stringify(assessment.data)
                    });
                } catch (error) {
                    console.error('Failed to sync assessment:', error);
                }
            }
            await clearStore(STORES.assessments);
        }
    } catch (error) {
        console.error('Assessment sync failed:', error);
    }
}

// Sync forum posts when back online
async function syncForumPosts() {
    try {
        const data = await readAll(STORES.forumPosts);
        if (data && data.length) {
            for (const post of data) {
                try {
                    await fetch('/api/community/forum/posts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': post.token
                        },
                        body: JSON.stringify(post.data)
                    });
                } catch (error) {
                    console.error('Failed to sync forum post:', error);
                }
            }
            await clearStore(STORES.forumPosts);
        }
    } catch (error) {
        console.error('Forum post sync failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', event => {
    console.log('Service Worker: Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New update from MindMate!',
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Explore',
                icon: '/icon-explore.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icon-close.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('MindMate', options)
    );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
    console.log('Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

console.log('Service Worker: Loaded successfully');