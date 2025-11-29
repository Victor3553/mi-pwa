const CACHE_NAME = "cryptas-cache-v1";

// Archivos estáticos reales en tu proyecto
const STATIC_ASSETS = [
  "/",               // raíz
  "/index.html",
  "/css/style.css",
  "/css/auth.css",
  "/js/app.js",
  "/js/anim.js",
  "/js/auth.js",
  "/auth.html",
  "/perfil.html",
  "/img/0.png",
  "/img/1.png",
  "/img/2.png",
  "/img/3.png",
  "/img/4.png",
  "/img/5.png",
  "/img/6.png",
  "/img/7.png"
];

// --------------------
// Instalación
// --------------------
self.addEventListener("install", event => {
  console.log("[SW] Instalando…");

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error("[SW] Error al cachear:", err))
  );
});

// --------------------
// Activación
// --------------------
self.addEventListener("activate", event => {
  console.log("[SW] Activando…");

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Eliminando caché anterior:", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// --------------------
// Fetch: Cache First + Network Fallback
// --------------------
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) return response;

          const clone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, clone));

          return response;
        })
        .catch(() => {
          if (event.request.destination === "document") {
            return caches.match("/index.html");
          }

          return new Response("Sin conexión y sin recurso en caché.", {
            status: 200,
            headers: { "Content-Type": "text/plain" }
          });
        });
    })
  );
});



// =============================================================
// SISTEMA DE COLA PARA REGISTROS OFFLINE
// =============================================================

const DB_NAME = "offline-db";
const STORE = "queue";

// ---------------------------
// Abrir IndexedDB
// ---------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { autoIncrement: true });
      }
    };

    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e);
  });
}



// =====================================================
// SINCRONIZAR CUANDO VUELVA INTERNET
// =====================================================
async function syncQueue() {
  const db = await openDB();
  const tx = db.transaction([STORE], "readonly");
  const store = tx.objectStore(STORE);

  const items = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });

  if (items.length === 0) {
    console.log("[SW] No hay registros pendientes.");
    return;
  }

  const item = items[0]; // Solo 1 registro pendiente

  console.log("[SW] Intentando sincronizar registro…");

  try {
    const res = await fetch(item.url, {
      method: item.method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item.body)
    });

    const json = await res.json();

    if (json.ok) {
      console.log("[SW] Registro sincronizado correctamente. Limpiando cola…");
      const delTx = db.transaction([STORE], "readwrite");
      delTx.objectStore(STORE).clear();
      console.log("[SW] Cola eliminada.");
    }

  } catch (err) {
    console.warn("[SW] Error al sincronizar, se intentará después.");
  }
}



// =============================================================
// EVENTOS DEL SERVICE WORKER
// =============================================================

// Background sync (si existe)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-registro") {
    console.log("[SW] Background sync activado.");
    event.waitUntil(syncQueue());
  }
});

// Mensaje desde la página cuando vuelve Internet
self.addEventListener("message", (event) => {
  if (event.data === "online") {
    console.log("[SW] Online detectado → sincronizando…");
    syncQueue();
  }
});