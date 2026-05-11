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
    $stmt = $pdo->prepare("SELECT id, name, description, created_at, updated_at FROM specialties ORDER BY name ASC");
    $stmt->execute();
    $specialties = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$specialties) {
        $specialties = [];
    }

    echo json_encode(["success" => true, "data" => $specialties]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
