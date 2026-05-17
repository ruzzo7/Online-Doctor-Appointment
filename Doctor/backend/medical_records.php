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

$action = $_GET['action'] ?? $_POST['action'] ?? ($jsonInput['action'] ?? 'list');
$action = strtolower(trim((string)$action));
$doctorId = (int)($_SESSION['doctor_id'] ?? $_GET['doctor_id'] ?? $_POST['doctor_id'] ?? ($jsonInput['doctor_id'] ?? 0));
if ($doctorId <= 0) {
    $doctorId = 2;
}

function medicalRecordError(int $statusCode, string $message): void
{
    http_response_code($statusCode);
    echo json_encode([
        'success' => false,
        'message' => $message,
    ]);
    exit;
}

function ensureMedicalRecordsTable(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS medical_records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        doctor_id INT NOT NULL,
        patient_id INT NOT NULL,
        record_title VARCHAR(255) NOT NULL,
        diagnosis TEXT NOT NULL,
        treatment_plan TEXT,
        medications TEXT,
        consultation_notes TEXT,
        follow_up_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_medical_record_appointment (appointment_id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

function fetchAppointmentForDoctor(PDO $pdo, int $appointmentId, int $doctorId): array
{
    $stmt = $pdo->prepare("SELECT a.id, a.doctor_id, a.patient_id, a.appointment_date, a.reason, a.status, pp.full_name AS patient_name, pp.phone, pp.age, u.email AS patient_email
        FROM appointments a
        JOIN users u ON a.patient_id = u.id
        LEFT JOIN patient_profiles pp ON pp.user_id = u.id
        WHERE a.id = ? AND a.doctor_id = ? LIMIT 1");
    $stmt->execute([$appointmentId, $doctorId]);
    $appointment = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$appointment) {
        medicalRecordError(404, 'Appointment not found or access denied');
    }

    return $appointment;
}

if ($action === 'list' || $action === 'get_records') {
    $patientId = (int)($_GET['patient_id'] ?? $_POST['patient_id'] ?? ($jsonInput['patient_id'] ?? 0));

    try {
        ensureMedicalRecordsTable($pdo);

        $sql = "SELECT
                mr.id,
                mr.appointment_id,
                mr.doctor_id,
                mr.patient_id,
                mr.record_title,
                mr.diagnosis,
                mr.treatment_plan,
                mr.medications,
                mr.consultation_notes,
                mr.follow_up_date,
                mr.created_at,
                mr.updated_at,
                a.appointment_date,
                a.reason AS appointment_reason,
                a.status AS appointment_status,
                pp.full_name AS patient_name,
                pp.phone AS patient_phone,
                pp.age AS patient_age,
                u.email AS patient_email
            FROM medical_records mr
            JOIN appointments a ON a.id = mr.appointment_id
            JOIN users u ON u.id = mr.patient_id
            LEFT JOIN patient_profiles pp ON pp.user_id = u.id
            WHERE mr.doctor_id = ?";
        $params = [$doctorId];

        if ($patientId > 0) {
            $sql .= " AND mr.patient_id = ?";
            $params[] = $patientId;
        }

        $sql .= " ORDER BY mr.created_at DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'data' => $records,
        ]);
    } catch (PDOException $e) {
        medicalRecordError(500, 'Database error: ' . $e->getMessage());
    }
    exit;
}

if ($action === 'save' || $action === 'save_record') {
    $appointmentId = (int)($jsonInput['appointment_id'] ?? $_POST['appointment_id'] ?? 0);
    $recordTitle = trim((string)($jsonInput['record_title'] ?? $_POST['record_title'] ?? ''));
    $diagnosis = trim((string)($jsonInput['diagnosis'] ?? $_POST['diagnosis'] ?? ''));
    $treatmentPlan = trim((string)($jsonInput['treatment_plan'] ?? $_POST['treatment_plan'] ?? ''));
    $medications = trim((string)($jsonInput['medications'] ?? $_POST['medications'] ?? ''));
    $consultationNotes = trim((string)($jsonInput['consultation_notes'] ?? $_POST['consultation_notes'] ?? ''));
    $followUpDate = trim((string)($jsonInput['follow_up_date'] ?? $_POST['follow_up_date'] ?? ''));

    if ($appointmentId <= 0) {
        medicalRecordError(400, 'Invalid appointment ID');
    }

    if ($recordTitle === '' || $diagnosis === '') {
        medicalRecordError(400, 'Record title and diagnosis are required');
    }

    try {
        ensureMedicalRecordsTable($pdo);
        $appointment = fetchAppointmentForDoctor($pdo, $appointmentId, $doctorId);

        $existingStmt = $pdo->prepare("SELECT id FROM medical_records WHERE appointment_id = ? LIMIT 1");
        $existingStmt->execute([$appointmentId]);
        $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
            $stmt = $pdo->prepare("UPDATE medical_records
                SET record_title = ?, diagnosis = ?, treatment_plan = ?, medications = ?, consultation_notes = ?, follow_up_date = ?
                WHERE appointment_id = ? AND doctor_id = ?");
            $stmt->execute([
                $recordTitle,
                $diagnosis,
                $treatmentPlan !== '' ? $treatmentPlan : null,
                $medications !== '' ? $medications : null,
                $consultationNotes !== '' ? $consultationNotes : null,
                $followUpDate !== '' ? $followUpDate : null,
                $appointmentId,
                $doctorId,
            ]);
            $recordId = (int)$existing['id'];
            $message = 'Medical record updated successfully';
        } else {
            $stmt = $pdo->prepare("INSERT INTO medical_records
                (appointment_id, doctor_id, patient_id, record_title, diagnosis, treatment_plan, medications, consultation_notes, follow_up_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $appointmentId,
                $doctorId,
                (int)$appointment['patient_id'],
                $recordTitle,
                $diagnosis,
                $treatmentPlan !== '' ? $treatmentPlan : null,
                $medications !== '' ? $medications : null,
                $consultationNotes !== '' ? $consultationNotes : null,
                $followUpDate !== '' ? $followUpDate : null,
            ]);
            $recordId = (int)$pdo->lastInsertId();
            $message = 'Medical record saved successfully';
        }

        echo json_encode([
            'success' => true,
            'message' => $message,
            'data' => [
                'record_id' => $recordId,
                'appointment_id' => $appointmentId,
                'patient_id' => (int)$appointment['patient_id'],
                'patient_name' => $appointment['patient_name'],
                'record_title' => $recordTitle,
            ],
        ]);
    } catch (PDOException $e) {
        medicalRecordError(500, 'Database error: ' . $e->getMessage());
    }
    exit;
}

medicalRecordError(400, 'Invalid action. Available actions: list, save');
?>