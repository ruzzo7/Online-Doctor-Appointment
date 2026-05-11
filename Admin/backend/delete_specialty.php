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

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid specialty ID"]);
    exit;
}

try {
    $findStmt = $pdo->prepare("SELECT id, name FROM specialties WHERE id = ? LIMIT 1");
    $findStmt->execute([$id]);
    $specialty = $findStmt->fetch(PDO::FETCH_ASSOC);

    if (!$specialty) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Specialty not found"]);
        exit;
    }

    $usageStmt = $pdo->prepare("SELECT COUNT(*) AS total FROM doctor_profiles WHERE LOWER(TRIM(specialization)) = LOWER(TRIM(?))");
    $usageStmt->execute([$specialty['name']]);
    $usage = (int)$usageStmt->fetch(PDO::FETCH_ASSOC)['total'];

    if ($usage > 0) {
        http_response_code(409);
        echo json_encode([
            "success" => false,
            "message" => "Cannot delete this specialty because {$usage} doctor profile(s) currently use it"
        ]);
        exit;
    }

    $deleteStmt = $pdo->prepare("DELETE FROM specialties WHERE id = ?");
    $deleteStmt->execute([$id]);

    echo json_encode([
        "success" => true,
        "message" => "Specialty deleted successfully",
        "id" => $id
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
