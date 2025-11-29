// Abrir IndexedDB
function idbOpen() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("cryptas-db", 1);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("sync-queue")) {
        db.createObjectStore("sync-queue", { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

// Guardar petición en la cola
function saveToQueue(data) {
  idbOpen().then(db => {
    const tx = db.transaction("sync-queue", "readwrite");
    tx.objectStore("sync-queue").add(data);
    console.log("[OFFLINE] Registro guardado en caché. Esperando conexión...");
  });
}

// Sincronizar cuando regrese internet
async function syncQueue() {
  const db = await idbOpen();
  const tx = db.transaction("sync-queue", "readonly");
  const store = tx.objectStore("sync-queue");

  const getAll = store.getAll();

  getAll.onsuccess = async (e) => {
    const items = e.target.result;

    for (const item of items) {
      try {
        const res = await fetch(item.url, {
          method: item.method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.body)
        });

        const json = await res.json();

        if (json.ok) {
          // borrar usando id REAL
          const delTx = db.transaction("sync-queue", "readwrite");
          delTx.objectStore("sync-queue").delete(item.id);

          console.log("[SYNC] Registro enviado a BD y eliminado de la cola");
        }

      } catch (error) {
        console.log("[SYNC] Aún sin conexión...");
        return; // no seguir intentando
      }
    }
  };
}

// Detectar cuando vuelve Internet
window.addEventListener("online", () => {
  console.log("[ONLINE] Conexión restablecida. Sincronizando registros...");
  syncQueue();
});