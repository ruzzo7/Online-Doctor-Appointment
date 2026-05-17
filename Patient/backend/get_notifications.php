<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require '../../login page/backend/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$input = $method === 'POST' ? json_decode(file_get_contents("php://input"), true) : $_GET;

if (!isset($input['patient_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing patient_id"]);
    exit;
}

$patientId = (int)$input['patient_id'];

try {
    // Fetch all notifications for this patient, with appointment details
    $stmt = $pdo->prepare("
        SELECT 
            n.id,
            n.patient_id,
            n.appointment_id,
            n.type,
            n.title,
            n.message,
            n.is_read,
            n.days_until_appointment,
            n.created_at,
            n.updated_at,
            a.appointment_date,
            a.reason,
            a.status as appointment_status,
            dp.full_name as doctor_name,
            dp.specialization
        FROM notifications n
        LEFT JOIN appointments a ON n.appointment_id = a.id
        LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.user_id
        WHERE n.patient_id = ?
        ORDER BY n.created_at DESC
        LIMIT 50
    ");
    $stmt->execute([$patientId]);
    $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Get unread count
    $countStmt = $pdo->prepare("SELECT COUNT(*) as unread_count FROM notifications WHERE patient_id = ? AND is_read = 0");
    $countStmt->execute([$patientId]);
    $countResult = $countStmt->fetch(PDO::FETCH_ASSOC);
    $unreadCount = $countResult['unread_count'] ?? 0;

    echo json_encode([
        "success" => true,
        "data" => $notifications,
        "unread_count" => $unreadCount
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
