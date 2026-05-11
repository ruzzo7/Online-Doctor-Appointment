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
$id = isset($input['id']) ? (int)$input['id'] : 0;
$name = isset($input['name']) ? trim($input['name']) : '';
$description = isset($input['description']) ? trim($input['description']) : null;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid specialty ID"]);
    exit;
}

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
    $findStmt = $pdo->prepare("SELECT id FROM specialties WHERE id = ? LIMIT 1");
    $findStmt->execute([$id]);
    if (!$findStmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Specialty not found"]);
        exit;
    }

    $existsStmt = $pdo->prepare("SELECT id FROM specialties WHERE name = ? AND id <> ? LIMIT 1");
    $existsStmt->execute([$name, $id]);
    if ($existsStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Another specialty with this name already exists"]);
        exit;
    }

    $updateStmt = $pdo->prepare("UPDATE specialties SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $updateStmt->execute([$name, $description !== '' ? $description : null, $id]);

    echo json_encode([
        "success" => true,
        "message" => "Specialty updated successfully",
        "id" => $id
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
