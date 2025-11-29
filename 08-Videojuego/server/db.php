<?php
$host = "localhost";
$user = "root";      // tu usuario
$pass = "";          // tu contraseña
$db   = "cryptas_db";

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die(json_encode(["ok"=>false, "error"=>"Error de conexión a la BD"]));
}

$conn->set_charset("utf8");
?>