<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

if (!isset($input['email']) || !isset($input['password']) || !isset($input['role'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$email    = trim($input['email']);
$password = password_hash($input['password'], PASSWORD_DEFAULT);
$role     = $input['role'];
$fullName = isset($input['fullName']) ? trim($input['fullName']) : '';

try {
    // Check if email already exists
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Email already registered"]);
        exit;
    }

    $pdo->beginTransaction();

    // Default status: patients are 'active' immediately, doctors are 'pending'
    $status = ($role === 'doctor') ? 'pending' : 'active';

    $stmt = $pdo->prepare("INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)");
    $stmt->execute([$email, $password, $role, $status]);
    $userId = $pdo->lastInsertId();

    if ($role === 'doctor') {
        $stmtProf = $pdo->prepare("INSERT INTO doctor_profiles (user_id, full_name, specialization, license_number, experience, hospital, bio) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmtProf->execute([
            $userId,
            $fullName,
            isset($input['specialization']) ? $input['specialization'] : '',
            isset($input['licenseNumber']) ? $input['licenseNumber'] : '',
            isset($input['experience']) ? (int)$input['experience'] : 0,
            isset($input['hospital']) ? $input['hospital'] : '',
            isset($input['bio']) ? $input['bio'] : ''
        ]);
    } else if ($role === 'patient') {
        $stmtProf = $pdo->prepare("INSERT INTO patient_profiles (user_id, full_name, phone, age) VALUES (?, ?, ?, ?)");
        $stmtProf->execute([
            $userId,
            $fullName,
            isset($input['phone']) ? $input['phone'] : '',
            isset($input['age']) ? (int)$input['age'] : 0
        ]);
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => ($role === 'doctor') 
            ? "Registration successful! Your account is pending admin approval." 
            : "Registration successful! You can now login.",
        "role" => $role
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal Server Error: " . $e->getMessage()]);
}
?>
