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

    $feeColumn = $pdo->query("SHOW COLUMNS FROM doctor_profiles LIKE 'consultation_fee'")->fetch();
    if (!$feeColumn) {
        $pdo->exec("ALTER TABLE doctor_profiles ADD COLUMN consultation_fee DECIMAL(10,2) NULL");
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
$fullName = trim($input['full_name'] ?? '');
$specialization = trim($input['specialization'] ?? '');
$experience = isset($input['experience']) ? (int)$input['experience'] : 0;
$consultationFee = isset($input['consultation_fee']) && $input['consultation_fee'] !== '' ? (float)$input['consultation_fee'] : null;
$hospital = trim($input['hospital'] ?? '');
$availableFrom = trim($input['available_from'] ?? '');
$availableTo = trim($input['available_to'] ?? '');
$bio = trim($input['bio'] ?? '');

if ($fullName === '' || $specialization === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Full name and specialization are required"]);
    exit;
}

if ($availableFrom !== '' && $availableTo !== '' && strtotime($availableFrom) >= strtotime($availableTo)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Available From must be earlier than Available To"]);
    exit;
}

if ($consultationFee !== null && $consultationFee < 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Consultation fee must be zero or greater"]);
    exit;
}

try {
    ensureAvailabilityColumns($pdo);

    $userStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'doctor' LIMIT 1");
    $userStmt->execute([$userId]);
    if (!$userStmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Doctor account not found"]);
        exit;
    }

    // Email and license_number are intentionally not updated here.
    $stmt = $pdo->prepare("UPDATE doctor_profiles
                           SET full_name = ?, specialization = ?, experience = ?, consultation_fee = ?, hospital = ?, available_from = ?, available_to = ?, bio = ?
                           WHERE user_id = ?");
    $stmt->execute([$fullName, $specialization, $experience, $consultationFee, $hospital, $availableFrom ?: null, $availableTo ?: null, $bio, $userId]);

    echo json_encode(["success" => true, "message" => "Profile updated successfully"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal Server Error: " . $e->getMessage()]);
}
?>