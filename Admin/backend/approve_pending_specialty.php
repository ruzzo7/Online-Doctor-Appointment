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

$input = json_decode(file_get_contents('php://input'), true);
$id = isset($input['id']) ? (int)$input['id'] : 0;

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid pending specialty id"]);
    exit;
}

try {
    // find pending
    $stmt = $pdo->prepare("SELECT id, name, requested_by_user_id, note FROM pending_specialties WHERE id = ? LIMIT 1");
    $stmt->execute([$id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Pending specialty not found"]);
        exit;
    }

    // check if already exists in specialties (case-insensitive)
    $exists = $pdo->prepare("SELECT id FROM specialties WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1");
    $exists->execute([$row['name']]);
    if ($exists->fetch()) {
        // Already exists; just delete pending
        $pdo->prepare("DELETE FROM pending_specialties WHERE id = ?")->execute([$id]);
        echo json_encode(["success" => true, "message" => "Specialty already exists; pending entry removed"]);
        exit;
    }

    // insert into specialties
    $ins = $pdo->prepare("INSERT INTO specialties (name, description) VALUES (?, NULL)");
    $ins->execute([$row['name']]);

    // remove pending
    $pdo->prepare("DELETE FROM pending_specialties WHERE id = ?")->execute([$id]);

    echo json_encode(["success" => true, "message" => "Specialty approved and added"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}

?>
