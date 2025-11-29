<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

require_once 'db.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    echo json_encode(['ok' => false, 'msg' => 'No se recibieron datos']);
    exit;
}

$tipo = $data["tipo"] ?? null;
$datos = $data["datos"] ?? [];

switch ($tipo) {

    // ----------------------------------------------
    // Login del jugador
    // ----------------------------------------------
    case "login":
        $username = $datos["username"] ?? "";
        $password = $datos["contraseña"] ?? "";

        // Buscar jugador por username
        $stmt = $conn->prepare("SELECT * FROM jugadores WHERE username = ?");
        $stmt->bind_param("s", $username);
        $stmt->execute();
        $result = $stmt->get_result();
        $jug = $result->fetch_assoc();

        if (!$jug) {
            echo json_encode(["ok" => false, "msg" => "Usuario no existe"]);
            break;
        }

        // Validar contraseña
        if (!password_verify($password, $jug["contraseña"])) {
            echo json_encode(["ok" => false, "msg" => "Contraseña incorrecta"]);
            break;
        }

        echo json_encode([
            "ok" => true,
            "accion" => "login_exitoso",
            "jugador_id" => $jug["id"]
        ]);
        break;


    default:
        echo json_encode(["ok" => false, "msg" => "Tipo de acción no válido"]);
}

$conn->close();