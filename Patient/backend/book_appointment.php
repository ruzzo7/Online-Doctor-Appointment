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

$requiredFields = ['patient_id', 'doctor_id', 'appointment_date', 'reason'];
foreach ($requiredFields as $field) {
    if (!isset($input[$field]) || trim((string)$input[$field]) === '') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required fields"]);
        exit;
    }
}

$patientId = (int)$input['patient_id'];
$doctorId = (int)$input['doctor_id'];
$appointmentDate = trim($input['appointment_date']);
$reason = trim($input['reason']);

try {
    $doctorStmt = $pdo->prepare("SELECT u.id, u.role, u.status, dp.available_from, dp.available_to
                                 FROM users u
                                 LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
                                 WHERE u.id = ? LIMIT 1");
    $doctorStmt->execute([$doctorId]);
    $doctor = $doctorStmt->fetch(PDO::FETCH_ASSOC);

    if (!$doctor || $doctor['role'] !== 'doctor') {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Doctor not found"]);
        exit;
    }

    if ($doctor['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "This doctor is not available for booking right now"]);
        exit;
    }

    $patientStmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ? AND role = 'patient' LIMIT 1");
    $patientStmt->execute([$patientId]);
    if (!$patientStmt->fetch()) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Patient not found"]);
        exit;
    }

    $dateTime = DateTime::createFromFormat('Y-m-d\TH:i', $appointmentDate) ?: DateTime::createFromFormat('Y-m-d H:i', $appointmentDate);
    if (!$dateTime) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Invalid appointment date/time"]);
        exit;
    }

    $now = new DateTime();
    if ($dateTime <= $now) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Appointment must be in the future"]);
        exit;
    }

    $appointmentTime = $dateTime->format('H:i:s');
    if (!empty($doctor['available_from']) && !empty($doctor['available_to'])) {
        if ($appointmentTime < $doctor['available_from'] || $appointmentTime > $doctor['available_to']) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Selected time is outside the doctor's availability"]);
            exit;
        }
    }

    $duplicateStmt = $pdo->prepare("SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND status <> 'cancelled' LIMIT 1");
    $duplicateStmt->execute([$doctorId, $dateTime->format('Y-m-d H:i:s')]);
    if ($duplicateStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "This time slot is already booked"]);
        exit;
    }

    $insertStmt = $pdo->prepare("INSERT INTO appointments (doctor_id, patient_id, appointment_date, reason, status) VALUES (?, ?, ?, ?, 'upcoming')");
    $insertStmt->execute([
        $doctorId,
        $patientId,
        $dateTime->format('Y-m-d H:i:s'),
        $reason
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Appointment booked successfully",
        "refresh_token" => time()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>