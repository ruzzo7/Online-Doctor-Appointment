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

if (!isset($input['user_id']) || !isset($input['full_name']) || !isset($input['phone']) || !isset($input['age'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$user_id = (int)$input['user_id'];
$full_name = trim($input['full_name']);
$phone = trim($input['phone']);
$age = (int)$input['age'];

try {
    $stmt = $pdo->prepare("UPDATE patient_profiles SET full_name = ?, phone = ?, age = ? WHERE user_id = ?");
    $stmt->execute([$full_name, $phone, $age, $user_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Profile updated successfully!"
        ]);
    } else {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Profile not found or no changes made"]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal Server Error: " . $e->getMessage()]);
}
?>
