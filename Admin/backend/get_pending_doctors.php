<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require '../../login page/backend/config.php';

try {
    $stmt = $pdo->prepare("
        SELECT u.id, u.email, u.created_at, dp.full_name, dp.specialization, dp.license_number, dp.experience, dp.hospital
        FROM users u
        JOIN doctor_profiles dp ON u.id = dp.user_id
        WHERE u.role = 'doctor' AND u.status = 'pending'
        ORDER BY u.created_at DESC
    ");
    $stmt->execute();
    $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode(["success" => true, "data" => $doctors]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
