<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../../login page/backend/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
$name = isset($input['name']) ? trim($input['name']) : '';
$description = isset($input['description']) ? trim($input['description']) : null;

if ($name === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Specialty name is required"]);
    exit;
}

if (mb_strlen($name) > 100) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Specialty name must be 100 characters or fewer"]);
    exit;
}

if ($description !== null && mb_strlen($description) > 255) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Description must be 255 characters or fewer"]);
    exit;
}

try {
    $existsStmt = $pdo->prepare("SELECT id FROM specialties WHERE name = ? LIMIT 1");
    $existsStmt->execute([$name]);
    if ($existsStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Specialty already exists"]);
        exit;
    }

    $insertStmt = $pdo->prepare("INSERT INTO specialties (name, description) VALUES (?, ?)");
    $insertStmt->execute([$name, $description !== '' ? $description : null]);

    echo json_encode([
        "success" => true,
        "message" => "Specialty added successfully",
        "id" => (int)$pdo->lastInsertId()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
