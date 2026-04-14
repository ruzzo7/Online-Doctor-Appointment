<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require '../../login page/backend/config.php';

try {
    $stmt = $pdo->prepare("
        SELECT u.id, u.email, u.status, u.created_at,
               pp.full_name, pp.phone, pp.age
        FROM users u
        JOIN patient_profiles pp ON u.id = pp.user_id
        WHERE u.role = 'patient'
        ORDER BY u.created_at DESC
    ");
    $stmt->execute();
    $patients = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if (!$patients) {
        $patients = [];
    }

    echo json_encode(["success" => true, "data" => $patients]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>