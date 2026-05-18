<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../../login page/backend/config.php';

try {
    $stmt = $pdo->prepare("SELECT id, name, requested_by_user_id, note, created_at FROM pending_specialties ORDER BY created_at DESC");
    $stmt->execute();
    $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$pending) $pending = [];

    echo json_encode(["success" => true, "data" => $pending]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}

?>
