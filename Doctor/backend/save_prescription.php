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

// Validate required fields
$required = ['appointment_id', 'doctor_id', 'patient_id', 'diagnosis', 'medicines'];
foreach ($required as $field) {
    if (!isset($input[$field]) || trim($input[$field]) === '') {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "Missing required field: $field"]);
        exit;
    }
}

$appointmentId = (int)$input['appointment_id'];
$doctorId      = (int)$input['doctor_id'];
$patientId     = (int)$input['patient_id'];
$diagnosis     = trim($input['diagnosis']);
$medicines     = trim($input['medicines']);
$instructions  = isset($input['instructions']) ? trim($input['instructions']) : '';
$followUpDate  = isset($input['follow_up_date']) && $input['follow_up_date'] !== '' ? $input['follow_up_date'] : null;

try {
    $pdo->beginTransaction();

    // Insert prescription
    $stmt = $pdo->prepare("
        INSERT INTO prescriptions (appointment_id, doctor_id, patient_id, diagnosis, medicines, instructions, follow_up_date)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$appointmentId, $doctorId, $patientId, $diagnosis, $medicines, $instructions, $followUpDate]);

    // Mark appointment as completed
    $updateStmt = $pdo->prepare("UPDATE appointments SET status = 'completed' WHERE id = ? AND doctor_id = ?");
    $updateStmt->execute([$appointmentId, $doctorId]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "message" => "Prescription saved successfully. Appointment marked as completed.",
        "prescription_id" => $pdo->lastInsertId()
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
