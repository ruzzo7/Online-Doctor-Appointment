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
$doctorId = isset($input['doctor_id']) ? (int)$input['doctor_id'] : 0;
$action = isset($input['action']) ? strtolower(trim($input['action'])) : '';

if ($appointmentId <= 0 || $doctorId <= 0 || !in_array($action, ['accept', 'reject'], true)) {
	http_response_code(400);
	echo json_encode(["success" => false, "message" => "Invalid appointment_id, doctor_id, or action"]);
	exit;
}

$newStatus = $action === 'accept' ? 'upcoming' : 'cancelled';

try {
	$apptStmt = $pdo->prepare("SELECT id, status, patient_id, appointment_date FROM appointments WHERE id = ? AND doctor_id = ? LIMIT 1");
	$apptStmt->execute([$appointmentId, $doctorId]);
	$appointment = $apptStmt->fetch(PDO::FETCH_ASSOC);

	if (!$appointment) {
		http_response_code(404);
		echo json_encode(["success" => false, "message" => "Appointment not found for this doctor"]);
		exit;
	}

	if ($appointment['status'] === 'completed') {
		http_response_code(409);
		echo json_encode(["success" => false, "message" => "Completed appointments cannot be changed"]);
		exit;
	}

	$updateStmt = $pdo->prepare("UPDATE appointments SET status = ? WHERE id = ? AND doctor_id = ?");
	$updateStmt->execute([$newStatus, $appointmentId, $doctorId]);
	
	// If no rows were affected it may be because the status was already the same.
	if ($updateStmt->rowCount() === 0) {
		if ($appointment['status'] === $newStatus) {
			echo json_encode([
				"success" => true,
				"message" => $action === 'accept' ? "Appointment already accepted" : "Appointment already rejected",
				"appointment_id" => $appointmentId,
				"status" => $newStatus,
				"refresh_token" => time()
			]);
			exit;
		} else {
			http_response_code(409);
			echo json_encode(["success" => false, "message" => "Failed to update appointment status"]);
			exit;
		}
	}

	// Create notification for patient
	if ($action === 'accept') {
		$notificationType = 'appointment_approved';
		$title = 'Appointment Approved! ✓';
		$message = 'Your appointment has been approved by the doctor. Please note the appointment details.';
	} else {
		$notificationType = 'appointment_cancelled';
		$title = 'Appointment Cancelled';
		$message = 'Your appointment has been cancelled by the doctor. Please book another appointment if needed.';
	}

	// Calculate days until appointment
	$apptDate = new DateTime($appointment['appointment_date']);
	$now = new DateTime();
	$daysDiff = $apptDate->diff($now)->days;

	$notifStmt = $pdo->prepare("
		INSERT INTO notifications (patient_id, appointment_id, type, title, message, days_until_appointment)
		VALUES (?, ?, ?, ?, ?, ?)
	");
	$notifStmt->execute([
		$appointment['patient_id'],
		$appointmentId,
		$notificationType,
		$title,
		$message,
		$daysDiff
	]);

	echo json_encode([
		"success" => true,
		"message" => $action === 'accept'
			? "Appointment accepted successfully"
			: "Appointment rejected successfully",
		"appointment_id" => $appointmentId,
		"status" => $newStatus,
		// Used by patient and doctor dashboards to refresh cross-tab state.
		"refresh_token" => time()
	]);
} catch (PDOException $e) {
	http_response_code(500);
	echo json_encode(["success" => false, "message" => "Database Error: " . $e->getMessage()]);
}

?>
