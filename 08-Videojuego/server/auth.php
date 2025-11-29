<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header("Content-Type: application/json");

require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(["ok" => false, "error" => "No se recibieron datos"]);
    exit;
}

$tipo  = $data["tipo"]  ?? null;
$datos = $data["datos"] ?? [];

switch ($tipo) {

    // ----------------------------------------------------
    // REGISTRO DE JUGADOR
    // ----------------------------------------------------
    case "registro":
        $username = $datos["username"];
        $email    = $datos["email"];
        $pass     = $datos["contraseña"];

        // Validar si existe
        $check = $conn->prepare("SELECT id FROM jugadores WHERE username = ?");
        $check->bind_param("s", $username);
        $check->execute();
        $check->store_result();

        if ($check->num_rows > 0) {
            echo json_encode(["ok" => false, "error" => "El usuario ya existe"]);
            exit;
        }

        // Registrar usuario
        $stmt = $conn->prepare("
            INSERT INTO jugadores (username, email, contraseña)
            VALUES (?, ?, ?)
        ");
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        $stmt->bind_param("sss", $username, $email, $hash);

        if ($stmt->execute()) {
            // Crear progreso inicial automáticamente
            $newID = $stmt->insert_id;

            $conn->query("
                INSERT INTO progreso (id, nivel, experiencia, vida, mana)
                VALUES ($newID, 1, 0, 100, 50)
            ");

            echo json_encode(["ok" => true]);
        } else {
            echo json_encode(["ok" => false, "error" => "Error al registrar"]);
        }
        break;


    // ----------------------------------------------------
    // LOGIN
    // ----------------------------------------------------
    case "login":
        $username = $datos["username"];
        $pass     = $datos["contraseña"];

        $stmt = $conn->prepare("SELECT id, contraseña FROM jugadores WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $stmt->store_result();

        if ($stmt->num_rows == 0) {
            echo json_encode(["ok" => false, "error" => "Usuario no encontrado"]);
            exit;
        }

        $stmt->bind_result($id, $hash);
        $stmt->fetch();

        if (!password_verify($pass, $hash)) {
            echo json_encode(["ok" => false, "error" => "Contraseña incorrecta"]);
            exit;
        }

        echo json_encode([
            "ok" => true,
            "jugador_id" => $id
        ]);
        break;


    // ----------------------------------------------------
    // PERFIL
    // ----------------------------------------------------
    case "perfil":
        $id = intval($datos["id"]);

        // Jugador
        $jug = $conn->query("SELECT id, username, email, creado FROM jugadores WHERE id = $id")->fetch_assoc();

        // Progreso
        $prog = $conn->query("SELECT * FROM progreso WHERE id = $id")->fetch_assoc();

        // Inventario
        $inv = $conn->query("SELECT * FROM inventario WHERE jugador_id = $id")
                    ->fetch_all(MYSQLI_ASSOC);

        echo json_encode([
            "ok" => true,
            "perfil" => [
                "jugador"   => $jug,
                "progreso"  => $prog,
                "inventario"=> $inv
            ]
        ]);
        break;


    // ----------------------------------------------------
    default:
        echo json_encode(["ok" => false, "error" => "Acción no válida"]);
}

$conn->close();
?>