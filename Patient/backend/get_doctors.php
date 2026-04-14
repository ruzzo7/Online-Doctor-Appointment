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

function ensureDoctorColumns(PDO $pdo): void
{
    $columns = [
        'available_from' => 'TIME NULL',
        'available_to' => 'TIME NULL',
        'consultation_fee' => 'DECIMAL(10,2) NULL'
    ];

    foreach ($columns as $column => $definition) {
        $stmt = $pdo->query("SHOW COLUMNS FROM doctor_profiles LIKE '{$column}'");
        if (!$stmt->fetch()) {
            $pdo->exec("ALTER TABLE doctor_profiles ADD COLUMN {$column} {$definition}");
        }
    }
}

try {
    ensureDoctorColumns($pdo);

    $stmt = $pdo->prepare("SELECT u.id, u.email, u.status, dp.full_name, dp.specialization, dp.license_number, dp.experience, dp.consultation_fee, dp.hospital, dp.available_from, dp.available_to, dp.bio
                           FROM users u
                           JOIN doctor_profiles dp ON dp.user_id = u.id
                           WHERE u.role = 'doctor' AND u.status = 'active'
                           ORDER BY u.created_at DESC");
    $stmt->execute();
    $doctors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "data" => $doctors
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database Error: " . $e->getMessage()
    ]);
}
?>