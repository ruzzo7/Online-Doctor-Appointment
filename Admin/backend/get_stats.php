<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

require '../../login page/backend/config.php';

try {
    // Total Doctors (Verified)
    $stmtDoc = $pdo->prepare("SELECT COUNT(*) as total FROM users WHERE role = 'doctor' AND status = 'active'");
    $stmtDoc->execute();
    $totalDoctors = $stmtDoc->fetch(PDO::FETCH_ASSOC)['total'];

    // Total Patients
    $stmtPat = $pdo->prepare("SELECT COUNT(*) as total FROM users WHERE role = 'patient'");
    $stmtPat->execute();
    $totalPatients = $stmtPat->fetch(PDO::FETCH_ASSOC)['total'];

    // Pending Requests
    $stmtPen = $pdo->prepare("SELECT COUNT(*) as total FROM users WHERE role = 'doctor' AND status = 'pending'");
    $stmtPen->execute();
    $pendingRequests = $stmtPen->fetch(PDO::FETCH_ASSOC)['total'];

    // Inactive/Rejected Doctors
    $stmtIna = $pdo->prepare("SELECT COUNT(*) as total FROM users WHERE role = 'doctor' AND status = 'rejected'");
    $stmtIna->execute();
    $inactiveDoctors = $stmtIna->fetch(PDO::FETCH_ASSOC)['total'];

    echo json_encode([
        "success" => true,
        "data" => [
            "totalDoctors" => (int)$totalDoctors,
            "totalPatients" => (int)$totalPatients,
            "pendingRequests" => (int)$pendingRequests,
            "inactiveDoctors" => (int)$inactiveDoctors
        ]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
