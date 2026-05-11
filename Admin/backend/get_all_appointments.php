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

$date = isset($_GET['date']) ? trim($_GET['date']) : '';
$doctorId = isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : 0;
$patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : 0;

if ($date !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid date format. Expected YYYY-MM-DD"]);
    exit;
}

try {
    $sql = "
        SELECT
            a.id AS appointment_id,
            a.doctor_id,
            a.patient_id,
            a.appointment_date,
            a.reason,
            a.status,
            a.created_at,
            COALESCE(dp.full_name, du.email) AS doctor_name,
            du.email AS doctor_email,
            COALESCE(pp.full_name, pu.email) AS patient_name,
            pu.email AS patient_email
        FROM appointments a
        JOIN users du ON du.id = a.doctor_id
        JOIN users pu ON pu.id = a.patient_id
        LEFT JOIN doctor_profiles dp ON dp.user_id = a.doctor_id
        LEFT JOIN patient_profiles pp ON pp.user_id = a.patient_id
        WHERE 1 = 1
    ";

    $params = [];

    if ($date !== '') {
        $sql .= " AND DATE(a.appointment_date) = ?";
        $params[] = $date;
    }

    if ($doctorId > 0) {
        $sql .= " AND a.doctor_id = ?";
        $params[] = $doctorId;
    }

    if ($patientId > 0) {
        $sql .= " AND a.patient_id = ?";
        $params[] = $patientId;
    }

    $sql .= " ORDER BY a.appointment_date DESC, a.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$appointments) {
        $appointments = [];
    }

    echo json_encode(["success" => true, "data" => $appointments]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
