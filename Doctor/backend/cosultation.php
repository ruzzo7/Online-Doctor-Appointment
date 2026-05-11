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

$rawInput = file_get_contents('php://input');
$jsonInput = json_decode($rawInput, true);
if (!is_array($jsonInput)) {
    $jsonInput = [];
}

$action = $_GET['action'] ?? $_POST['action'] ?? ($jsonInput['action'] ?? '');
$action = strtolower(trim((string)$action));

$doctorId = (int)($_SESSION['doctor_id'] ?? $_GET['doctor_id'] ?? $_POST['doctor_id'] ?? ($jsonInput['doctor_id'] ?? 0));
if ($doctorId <= 0) {
    // Backward-compatible fallback for local setups where session auth is not wired.
    $doctorId = 2;
}

function consultationError(int $statusCode, string $message): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $message,
    ]);
    exit;
}

function ensureConsultationTable(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS consultations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        doctor_id INT NOT NULL,
        patient_id INT NOT NULL,
        consultation_type ENUM('online', 'offline') DEFAULT 'online',
        symptoms TEXT NULL,
        observations TEXT NULL,
        consultation_notes TEXT NOT NULL,
        status ENUM('in_progress', 'completed') DEFAULT 'completed',
        started_at DATETIME NULL,
        completed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_appointment_consultation (appointment_id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function findAppointment(PDO $pdo, int $appointmentId, int $doctorId): array
{
    $stmt = $pdo->prepare("SELECT id, patient_id, status, appointment_date, reason FROM appointments WHERE id = ? AND doctor_id = ? LIMIT 1");
    $stmt->execute([$appointmentId, $doctorId]);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$appointment) {
        consultationError(404, 'Appointment not found or access denied');
    }

    return $appointment;
}

if ($action === 'get_patient_details') {
    $appointmentId = (int)($_GET['appointment_id'] ?? $_POST['appointment_id'] ?? ($jsonInput['appointment_id'] ?? 0));
    if ($appointmentId <= 0) {
        consultationError(400, 'Invalid appointment ID');
    }

    try {
        ensureConsultationTable($pdo);

        $stmt = $pdo->prepare("SELECT
                a.id AS appointment_id,
                a.reason AS appointment_reason,
                a.appointment_date,
                a.status AS appointment_status,
                u.id AS patient_id,
                u.email,
                pp.full_name,
                pp.phone,
                pp.age,
                c.id AS consultation_id,
                c.consultation_type,
                c.symptoms,
                c.observations,
                c.consultation_notes,
                c.status AS consultation_status,
                c.started_at,
                c.completed_at
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            LEFT JOIN patient_profiles pp ON u.id = pp.user_id
            LEFT JOIN consultations c ON c.appointment_id = a.id
            WHERE a.id = ? AND a.doctor_id = ?
            LIMIT 1");

        $stmt->execute([$appointmentId, $doctorId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$result) {
            consultationError(404, 'Appointment not found');
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'appointment_id' => (int)$result['appointment_id'],
                'patient_id' => (int)$result['patient_id'],
                'patient_name' => $result['full_name'],
                'patient_email' => $result['email'],
                'patient_phone' => $result['phone'],
                'patient_age' => isset($result['age']) ? (int)$result['age'] : null,
                'appointment_date' => $result['appointment_date'],
                'appointment_reason' => $result['appointment_reason'],
                'appointment_status' => $result['appointment_status'],
                'consultation' => [
                    'consultation_id' => $result['consultation_id'] ? (int)$result['consultation_id'] : null,
                    'consultation_type' => $result['consultation_type'],
                    'symptoms' => $result['symptoms'],
                    'observations' => $result['observations'],
                    'consultation_notes' => $result['consultation_notes'],
                    'status' => $result['consultation_status'],
                    'started_at' => $result['started_at'],
                    'completed_at' => $result['completed_at'],
                ],
            ],
        ]);
    } catch (PDOException $e) {
        consultationError(500, 'Database error: ' . $e->getMessage());
    }
    exit;
}

if ($action === 'conduct_consultation') {
    $appointmentId = (int)($jsonInput['appointment_id'] ?? $_POST['appointment_id'] ?? 0);
    $consultationType = strtolower(trim((string)($jsonInput['consultation_type'] ?? $_POST['consultation_type'] ?? '')));
    $consultationNotes = trim((string)($jsonInput['consultation_notes'] ?? $_POST['consultation_notes'] ?? ''));
    $symptoms = trim((string)($jsonInput['symptoms'] ?? $_POST['symptoms'] ?? ''));
    $observations = trim((string)($jsonInput['observations'] ?? $_POST['observations'] ?? ''));

    if ($appointmentId <= 0) {
        consultationError(400, 'Invalid appointment ID');
    }

    if (!in_array($consultationType, ['online', 'offline'], true)) {
        consultationError(400, 'Invalid consultation type. Must be online or offline');
    }

    if ($consultationNotes === '') {
        consultationError(400, 'Consultation notes are required');
    }

    try {
        ensureConsultationTable($pdo);
        $appointment = findAppointment($pdo, $appointmentId, $doctorId);

        if ($appointment['status'] === 'cancelled') {
            consultationError(409, 'Cancelled appointments cannot be consulted');
        }

        $pdo->beginTransaction();

        $upsert = $pdo->prepare("INSERT INTO consultations
                (appointment_id, doctor_id, patient_id, consultation_type, symptoms, observations, consultation_notes, status, started_at, completed_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, 'completed', NOW(), NOW())
            ON DUPLICATE KEY UPDATE
                consultation_type = VALUES(consultation_type),
                symptoms = VALUES(symptoms),
                observations = VALUES(observations),
                consultation_notes = VALUES(consultation_notes),
                status = 'completed',
                completed_at = NOW()");
        $upsert->execute([
            $appointmentId,
            $doctorId,
            (int)$appointment['patient_id'],
            $consultationType,
            $symptoms !== '' ? $symptoms : null,
            $observations !== '' ? $observations : null,
            $consultationNotes,
        ]);

        $updateAppointment = $pdo->prepare("UPDATE appointments SET status = 'completed' WHERE id = ? AND doctor_id = ?");
        $updateAppointment->execute([$appointmentId, $doctorId]);

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Consultation conducted successfully',
            'data' => [
                'appointment_id' => $appointmentId,
                'consultation_type' => $consultationType,
                'consultation_notes' => $consultationNotes,
                'symptoms' => $symptoms,
                'observations' => $observations,
                'status' => 'completed',
                'completed_at' => date('Y-m-d H:i:s'),
            ],
        ]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        consultationError(500, 'Database error: ' . $e->getMessage());
    }
    exit;
}

if ($action === 'save_consultation_notes') {
    $appointmentId = (int)($jsonInput['appointment_id'] ?? $_POST['appointment_id'] ?? 0);
    $consultationType = strtolower(trim((string)($jsonInput['consultation_type'] ?? $_POST['consultation_type'] ?? 'online')));
    $consultationNotes = trim((string)($jsonInput['consultation_notes'] ?? $_POST['consultation_notes'] ?? ''));
    $symptoms = trim((string)($jsonInput['symptoms'] ?? $_POST['symptoms'] ?? ''));
    $observations = trim((string)($jsonInput['observations'] ?? $_POST['observations'] ?? ''));

    if ($appointmentId <= 0) {
        consultationError(400, 'Invalid appointment ID');
    }

    if (!in_array($consultationType, ['online', 'offline'], true)) {
        consultationError(400, 'Invalid consultation type. Must be online or offline');
    }

    if ($consultationNotes === '' && $symptoms === '' && $observations === '') {
        consultationError(400, 'At least one consultation note field is required');
    }

    try {
        ensureConsultationTable($pdo);
        $appointment = findAppointment($pdo, $appointmentId, $doctorId);

        $existingStmt = $pdo->prepare("SELECT id, consultation_notes, symptoms, observations FROM consultations WHERE appointment_id = ? LIMIT 1");
        $existingStmt->execute([$appointmentId]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        $finalNotes = $consultationNotes;
        if ($finalNotes === '') {
            $finalNotes = $existing['consultation_notes'] ?? '';
        }

        $finalSymptoms = $symptoms !== '' ? $symptoms : ($existing['symptoms'] ?? null);
        $finalObservations = $observations !== '' ? $observations : ($existing['observations'] ?? null);

        $upsert = $pdo->prepare("INSERT INTO consultations
                (appointment_id, doctor_id, patient_id, consultation_type, symptoms, observations, consultation_notes, status, started_at)
            VALUES
                (?, ?, ?, ?, ?, ?, ?, 'in_progress', NOW())
            ON DUPLICATE KEY UPDATE
                consultation_type = VALUES(consultation_type),
                symptoms = VALUES(symptoms),
                observations = VALUES(observations),
                consultation_notes = VALUES(consultation_notes),
                status = IF(status = 'completed', 'completed', 'in_progress')");
        $upsert->execute([
            $appointmentId,
            $doctorId,
            (int)$appointment['patient_id'],
            $consultationType,
            $finalSymptoms,
            $finalObservations,
            $finalNotes,
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Consultation notes saved successfully',
            'data' => [
                'appointment_id' => $appointmentId,
                'consultation_type' => $consultationType,
                'consultation_notes' => $finalNotes,
                'symptoms' => $finalSymptoms,
                'observations' => $finalObservations,
                'saved_at' => date('Y-m-d H:i:s'),
            ],
        ]);
    } catch (PDOException $e) {
        consultationError(500, 'Database error: ' . $e->getMessage());
    }
    exit;
}

consultationError(400, 'Invalid action. Available actions: get_patient_details, conduct_consultation, save_consultation_notes');
?>