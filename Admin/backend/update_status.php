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

if (!isset($input['user_id']) || !isset($input['status'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$userId = $input['user_id'];
$status = $input['status']; // 'active' or 'rejected'

if (!in_array($status, ['active', 'rejected'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid status"]);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE users SET status = ? WHERE id = ? AND role = 'doctor'");
    $stmt->execute([$status, $userId]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => true, "message" => "Doctor status updated to {$status}"]);
    } else {
        echo json_encode(["success" => false, "message" => "No changes made or user not found"]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
