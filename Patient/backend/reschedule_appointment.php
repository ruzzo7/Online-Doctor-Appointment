<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit;
}

require '../../login page/backend/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$appointmentId = isset($input['appointment_id']) ? (int)$input['appointment_id'] : 0;
$patientId = isset($input['patient_id']) ? (int)$input['patient_id'] : 0;
$appointmentDate = isset($input['appointment_date']) ? trim($input['appointment_date']) : '';

if ($appointmentId <= 0 || $patientId <= 0 || $appointmentDate === '') {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing appointment id, patient id, or new appointment date"]);
    exit;
}

$dateTime = DateTime::createFromFormat('Y-m-d\TH:i', $appointmentDate) ?: DateTime::createFromFormat('Y-m-d H:i', $appointmentDate);
if (!$dateTime) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid appointment date format"]);
    exit;
}

$now = new DateTime();
if ($dateTime <= $now) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Rescheduled appointment must be in the future"]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = ? LIMIT 1");
    $stmt->execute([$appointmentId]);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$appointment || $appointment['patient_id'] !== $patientId) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Appointment not found"]);
        exit;
    }

    if (in_array($appointment['status'], ['cancelled', 'completed', 'no_show'], true)) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "This appointment cannot be rescheduled"]);
        exit;
    }

    $doctorStmt = $pdo->prepare("SELECT u.status, dp.available_from, dp.available_to FROM users u LEFT JOIN doctor_profiles dp ON dp.user_id = u.id WHERE u.id = ? LIMIT 1");
    $doctorStmt->execute([$appointment['doctor_id']]);
    $doctor = $doctorStmt->fetch(PDO::FETCH_ASSOC);

    if (!$doctor || $doctor['status'] !== 'active') {
        http_response_code(403);
        echo json_encode(["success" => false, "message" => "Doctor is not available for rescheduling"]);
        exit;
    }

    $newDateTime = $dateTime->format('Y-m-d H:i:s');
    $newTime = $dateTime->format('H:i:s');
    if (!empty($doctor['available_from']) && !empty($doctor['available_to'])) {
        if ($newTime < $doctor['available_from'] || $newTime > $doctor['available_to']) {
            http_response_code(400);
            echo json_encode(["success" => false, "message" => "Selected time is outside the doctor's availability"]);
            exit;
        }
    }

    $conflictStmt = $pdo->prepare("SELECT id FROM appointments WHERE doctor_id = ? AND appointment_date = ? AND id <> ? AND status <> 'cancelled' LIMIT 1");
    $conflictStmt->execute([$appointment['doctor_id'], $newDateTime, $appointmentId]);
    if ($conflictStmt->fetch()) {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "The doctor already has an appointment at this time"]);
        exit;
    }

    $update = $pdo->prepare("UPDATE appointments SET appointment_date = ?, status = 'upcoming' WHERE id = ?");
    $update->execute([$newDateTime, $appointmentId]);

    echo json_encode(["success" => true, "message" => "Appointment has been rescheduled successfully."]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
