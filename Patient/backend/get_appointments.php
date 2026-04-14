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

$patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : 0;

if ($patientId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing or invalid patient_id"]);
    exit;
}

try {
    $stmt = $pdo->prepare("SELECT 
                                a.id AS appointment_id,
                                a.doctor_id,
                                a.patient_id,
                                a.appointment_date,
                                a.reason,
                                a.status,
                                a.created_at,
                                u.email AS doctor_email,
                                dp.full_name AS doctor_name,
                                dp.specialization AS doctor_specialization,
                                dp.consultation_fee,
                                dp.hospital,
                                dp.available_from,
                                dp.available_to
                            FROM appointments a
                            JOIN users u ON a.doctor_id = u.id
                            LEFT JOIN doctor_profiles dp ON dp.user_id = u.id
                            WHERE a.patient_id = ?
                            ORDER BY a.appointment_date DESC, a.created_at DESC");
    $stmt->execute([$patientId]);
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $appointments
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>