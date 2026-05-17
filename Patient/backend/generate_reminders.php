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

if (!isset($input['patient_id'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing patient_id"]);
    exit;
}

$patientId = (int)$input['patient_id'];

try {
    // Get upcoming appointments that don't have reminders yet
    $stmt = $pdo->prepare("
        SELECT 
            a.id,
            a.patient_id,
            a.appointment_date,
            a.status,
            dp.full_name as doctor_name,
            dp.specialization,
            DATEDIFF(a.appointment_date, CURDATE()) as days_until
        FROM appointments a
        LEFT JOIN doctor_profiles dp ON a.doctor_id = dp.user_id
        WHERE a.patient_id = ? 
            AND a.status = 'upcoming'
            AND a.appointment_date > NOW()
            AND NOT EXISTS (
                SELECT 1 FROM notifications n 
                WHERE n.appointment_id = a.id 
                AND n.type = 'appointment_reminder'
            )
    ");
    $stmt->execute([$patientId]);
    $upcomingAppointments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $remindersCreated = 0;

    // Create reminders for upcoming appointments (within next 30 days)
    foreach ($upcomingAppointments as $appt) {
        $daysUntil = (int)$appt['days_until'];
        
        // Create reminder if appointment is within 30 days from now
        if ($daysUntil >= 0 && $daysUntil <= 30) {
            $reminderMsg = '';
            if ($daysUntil === 0) {
                $reminderMsg = 'Your appointment with ' . $appt['doctor_name'] . ' is TODAY! Please arrive on time.';
            } elseif ($daysUntil === 1) {
                $reminderMsg = 'Your appointment with ' . $appt['doctor_name'] . ' (' . $appt['specialization'] . ') is TOMORROW!';
            } else {
                $reminderMsg = 'Reminder: Your appointment with ' . $appt['doctor_name'] . ' is in ' . $daysUntil . ' days.';
            }

            $title = $daysUntil === 0 ? '⏰ Appointment Today!' : '📅 Appointment Reminder';

            $insStmt = $pdo->prepare("
                INSERT IGNORE INTO notifications (patient_id, appointment_id, type, title, message, days_until_appointment)
                VALUES (?, ?, 'appointment_reminder', ?, ?, ?)
            ");
            $insStmt->execute([
                $patientId,
                $appt['id'],
                $title,
                $reminderMsg,
                $daysUntil
            ]);

            if ($insStmt->rowCount() > 0) {
                $remindersCreated++;
            }
        }
    }

    echo json_encode([
        "success" => true,
        "message" => "Reminders generated successfully",
        "reminders_created" => $remindersCreated
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}
?>
