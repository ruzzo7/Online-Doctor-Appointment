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

// Get doctor_id from query string
$doctorId = isset($_GET['doctor_id']) ? (int)$_GET['doctor_id'] : 0;
$filter   = isset($_GET['filter']) ? $_GET['filter'] : 'all';

if ($doctorId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing or invalid doctor_id"]);
    exit;
}

try {
    $sql = "
        SELECT 
            a.id AS appointment_id,
            a.appointment_date,
            a.reason,
            a.status,
            a.created_at,
            pp.full_name AS patient_name,
            pp.age AS patient_age,
            pp.phone AS patient_phone,
            u.email AS patient_email,
            a.patient_id
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        LEFT JOIN patient_profiles pp ON u.id = pp.user_id
        WHERE a.doctor_id = ?
    ";

    $params = [$doctorId];

    if ($filter === 'upcoming') {
        $sql .= " AND a.status = 'upcoming'";
    } else if ($filter === 'completed') {
        $sql .= " AND a.status = 'completed'";
    } else if ($filter === 'cancelled') {
        $sql .= " AND a.status = 'cancelled'";
    }

    $sql .= " ORDER BY a.appointment_date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $appointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "data" => $appointments]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
