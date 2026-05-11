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
$appointmentId = isset($input['appointment_id']) ? (int)$input['appointment_id'] : 0;

if ($appointmentId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid appointment_id"]);
    exit;
}

try {
    $findStmt = $pdo->prepare("SELECT id, status FROM appointments WHERE id = ? LIMIT 1");
    $findStmt->execute([$appointmentId]);
    $appointment = $findStmt->fetch(PDO::FETCH_ASSOC);

    if (!$appointment) {
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Appointment not found"]);
        exit;
    }

    if ($appointment['status'] === 'cancelled') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Appointment is already cancelled"]);
        exit;
    }

    if ($appointment['status'] === 'completed') {
        http_response_code(409);
        echo json_encode(["success" => false, "message" => "Completed appointments cannot be cancelled"]);
        exit;
    }

    $updateStmt = $pdo->prepare("UPDATE appointments SET status = 'cancelled' WHERE id = ?");
    $updateStmt->execute([$appointmentId]);

    echo json_encode([
        "success" => true,
        "message" => "Appointment cancelled successfully",
        "appointment_id" => $appointmentId,
        "status" => "cancelled",
        "refresh_token" => time()
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
