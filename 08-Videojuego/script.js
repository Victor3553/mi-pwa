function registrar() {
  const user = document.getElementById("regUser").value;
  const email = document.getElementById("regEmail").value;
  const pass = document.getElementById("regPass").value;

  fetch("server/sync.php", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      tipo: "crear_jugador",
      datos: { username: user, email: email, contraseña: pass }
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      alert("Cuenta creada correctamente.");
    } else {
      alert("Error al registrarse.");
    }
  });
}

function login() {
  const user = document.getElementById("logUser").value;
  const pass = document.getElementById("logPass").value;

  fetch("server/sync.php", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      tipo: "login",
      datos: { username: user, contraseña: pass }
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      localStorage.setItem("id_jugador", data.jugador_id);
      alert("Sesión iniciada");

      mostrarPerfil();
    } else {
      alert("Usuario o contraseña incorrectos");
    }
  });
}

function mostrarPerfil() {
  const id = localStorage.getItem("id_jugador");
  if (!id) return;

  fetch("server/sync.php", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      tipo: "perfil",
      datos: { id }
    })
  })
  .then(r => r.json())
  .then(data => {
    if (data.ok) {
      document.getElementById("perfilBox").style.display = "block";
      document.getElementById("perfilData").textContent =
        JSON.stringify(data.perfil, null, 2);
    }
  });
}