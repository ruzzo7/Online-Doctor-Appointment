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
$userId = isset($input['user_id']) ? (int)$input['user_id'] : 0;
$fullName = trim($input['full_name'] ?? '');
$specialization = trim($input['specialization'] ?? '');
$experience = isset($input['experience']) ? (int)$input['experience'] : 0;
$consultationFee = isset($input['consultation_fee']) && $input['consultation_fee'] !== '' ? (float)$input['consultation_fee'] : null;
$hospital = trim($input['hospital'] ?? '');
$availableFrom = trim($input['available_from'] ?? '');
$availableTo = trim($input['available_to'] ?? '');
$bio = trim($input['bio'] ?? '');

if ($userId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing or invalid user_id"]);
    exit;
}

if ($fullName === '' || $specialization === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Full name and specialization are required"]);
    exit;
}

if ($experience < 0 || $experience > 60) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Experience must be between 0 and 60"]);
    exit;
}

if ($consultationFee !== null && $consultationFee < 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Consultation fee must be zero or greater"]);
    exit;
}

if ($availableFrom !== '' && $availableTo !== '' && strtotime($availableFrom) >= strtotime($availableTo)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Available From must be earlier than Available To"]);
    exit;
}

try {
    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'doctor' LIMIT 1");
    $userStmt->execute([$userId]);
    if (!$userStmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Doctor not found"]);
        exit;
    }

    $updateStmt = $pdo->prepare("UPDATE doctor_profiles
                                 SET full_name = ?, specialization = ?, experience = ?, consultation_fee = ?, hospital = ?,
                                     available_from = ?, available_to = ?, bio = ?
                                 WHERE user_id = ?");
    $updateStmt->execute([
        $fullName,
        $specialization,
        $experience,
        $consultationFee,
        $hospital,
        $availableFrom !== '' ? $availableFrom : null,
        $availableTo !== '' ? $availableTo : null,
        $bio,
        $userId
    ]);

    echo json_encode(["success" => true, "message" => "Doctor profile updated successfully"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
