// =======================================================
// INDEXEDDB (cola offline para un solo registro pendiente)
// =======================================================
let db;
const DB_NAME = "offline-db";
const STORE = "queue";

function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);

        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) {
                db.createObjectStore(STORE, { autoIncrement: true });
            }
        };

        req.onsuccess = (e) => {
            db = e.target.result;
            resolve();
        };

        req.onerror = (e) => reject(e);
    });
}

openDB();


// -----------------------------------------------------------------
// ✔ Guarda SOLO UN registro pendiente (no permite duplicados)
// -----------------------------------------------------------------
function saveToQueue(data) {
    return new Promise((resolve) => {
        const tx = db.transaction([STORE], "readonly");
        const store = tx.objectStore(STORE);

        const countReq = store.count();
        countReq.onsuccess = () => {
            if (countReq.result >= 1) {
                console.warn("[IndexedDB] Ya hay un registro pendiente. No se guarda otro.");
                resolve(false);
                return;
            }

            const tx2 = db.transaction([STORE], "readwrite");
            tx2.objectStore(STORE).add(data);

            console.log("[IndexedDB] Registro guardado en cola offline.");
            resolve(true);
        };
    });
}



// =======================================================
// REGISTRO
// =======================================================
function registrar() {
    let username = document.getElementById("regUser").value.trim();
    let email    = document.getElementById("regEmail").value.trim();
    let pass     = document.getElementById("regPass").value.trim();

    if (!username || !email || !pass) {
        alert("Por favor completa todos los campos.");
        return;
    }

    const payload = {
        tipo: "registro",
        datos: {
            username,
            email,
            contraseña: pass
        }
    };

    // --------------------------------------------------------
    // ✔ SIN INTERNET → GUARDAR EN INDEXEDDB
    // --------------------------------------------------------
    if (!navigator.onLine) {
        console.warn("[OFFLINE] Registrando SIN conexión…");

        saveToQueue({
            url: "server/auth.php",
            method: "POST",
            body: payload
        }).then(saved => {
            if (saved) {
                alert("Tu registro se guardó offline. Se enviará cuando vuelva Internet.");
            } else {
                alert("Ya tienes un registro pendiente. No se guardó otro.");
            }
        });

        return;
    }

    // --------------------------------------------------------
    // ✔ CON INTERNET → ENVIAR NORMAL
    // --------------------------------------------------------
    fetch("server/auth.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
        if (res.ok) {
            alert("Registro exitoso. Ahora inicia sesión.");
            window.location.href = "auth.html?login";
        } else {
            alert("Error: " + res.error);
        }
    })
    .catch(err => {
        console.error("Error en fetch:", err);

        // Guardar offline si el fetch falló
        saveToQueue({
            url: "server/auth.php",
            method: "POST",
            body: payload
        }).then(saved => {
            if (saved) {
                alert("Sin conexión. Tu registro quedó en caché.");
            }
        });
    });
}



// =======================================================
// LOGIN
// =======================================================
function login() {
    let username = document.getElementById("logUser").value.trim();
    let pass     = document.getElementById("logPass").value.trim();

    if (!username || !pass) {
        alert("Completa todos los campos.");
        return;
    }

    // ---------------------------------------------------------
    // ✔ Si hay registro pendiente → NO permitir login
    // ---------------------------------------------------------
    const tx = db.transaction([STORE], "readonly");
    const store = tx.objectStore(STORE);
    const countReq = store.count();

    countReq.onsuccess = () => {

        if (countReq.result > 0) {
            alert("Tu registro aún no se envía al servidor. Espera conexión.");
            return;
        }

        // -------------------------------------------------
        // ✔ Proceder con login
        // -------------------------------------------------
        fetch("server/auth.php", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                tipo: "login",
                datos: {
                    username,
                    contraseña: pass
                }
            })
        })
        .then(r => r.json())
        .then(res => {
            if (res.ok) {
                localStorage.setItem("id_jugador", res.jugador_id);
                window.location.href = "index.html";
            } else {
                alert("Error: " + res.error);
            }
        })
        .catch(err => {
            console.error("Error:", err);
            alert("Error en el servidor.");
        });
    };
}



// =======================================================
// PERFIL
// =======================================================
function cargarPerfil() {
    const id = localStorage.getItem("id_jugador");
    if (!id) return;

    fetch("server/auth.php", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            tipo: "perfil",
            datos: { id }
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.ok) {
            document.getElementById("perfilData").innerText =
                JSON.stringify(res.perfil, null, 2);
        }
    })
    .catch(err => console.error(err));
}



// =======================================================
// CAMBIAR ENTRE LOGIN Y REGISTRO
// =======================================================
function mostrarLogin() {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("registroBox").style.display = "none";
}

function mostrarRegistro() {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("registroBox").style.display = "block";
}



// =======================================================
// PROCESAR COLA OFFLINE AUTOMÁTICAMENTE
// =======================================================
window.addEventListener("online", () => {
    console.log("[ONLINE] Conexión restaurada. Revisando cola offline…");
    procesarCola();
});


function procesarCola() {
    const tx = db.transaction([STORE], "readonly");
    const store = tx.objectStore(STORE);

    const getReq = store.getAll();

    getReq.onsuccess = () => {
        const registros = getReq.result;

        if (registros.length === 0) {
            console.log("[IndexedDB] No hay registros pendientes.");
            return;
        }

        const registro = registros[0]; // siempre uno
        console.log("[IndexedDB] Enviando registro pendiente…", registro);

        fetch(registro.url, {
            method: registro.method,
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(registro.body)
        })
        .then(r => r.json())
        .then(res => {
            if (res.ok) {
                console.log("[IndexedDB] Registro enviado correctamente. Borrando cola…");

                const txDel = db.transaction([STORE], "readwrite");
                txDel.objectStore(STORE).clear();

                alert("Tu registro offline ha sido enviado. Ahora puedes iniciar sesión.");
            } else {
                console.error("[IndexedDB] Error del servidor:", res.error);
            }
        })
        .catch(err => {
            console.error("[IndexedDB] Error enviando registro offline:", err);
        });
    };
}