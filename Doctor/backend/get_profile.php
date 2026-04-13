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

function ensureAvailabilityColumns(PDO $pdo): void
{
    $fromColumn = $pdo->query("SHOW COLUMNS FROM doctor_profiles LIKE 'available_from'")->fetch();
    if (!$fromColumn) {
        $pdo->exec("ALTER TABLE doctor_profiles ADD COLUMN available_from TIME NULL");
    }

    $toColumn = $pdo->query("SHOW COLUMNS FROM doctor_profiles LIKE 'available_to'")->fetch();
    if (!$toColumn) {
        $pdo->exec("ALTER TABLE doctor_profiles ADD COLUMN available_to TIME NULL");
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);
if (!isset($input['user_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing user_id"]);
    exit;
}

$userId = (int)$input['user_id'];

try {
    ensureAvailabilityColumns($pdo);

    $stmt = $pdo->prepare("SELECT u.id, u.email, u.role, u.status, dp.full_name, dp.specialization, dp.license_number, dp.experience, dp.hospital, dp.available_from, dp.available_to, dp.bio
                           FROM users u
                           LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
                           WHERE u.id = ? LIMIT 1");
    $stmt->execute([$userId]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$profile || $profile['role'] !== 'doctor') {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Doctor account not found"]);
        exit;
    }

    echo json_encode([
        "success" => true,
        "profile" => [
            "email" => $profile['email'] ?? '',
            "status" => $profile['status'] ?? '',
            "full_name" => $profile['full_name'] ?? '',
            "specialization" => $profile['specialization'] ?? '',
            "license_number" => $profile['license_number'] ?? '',
            "experience" => (int)($profile['experience'] ?? 0),
            "hospital" => $profile['hospital'] ?? '',
            "available_from" => $profile['available_from'] ?? '',
            "available_to" => $profile['available_to'] ?? '',
            "bio" => $profile['bio'] ?? ''
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal Server Error: " . $e->getMessage()]);
}
?>