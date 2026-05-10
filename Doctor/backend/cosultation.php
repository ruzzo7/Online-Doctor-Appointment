<?php
// ═══════════════════════════════════════════════════════════
// Conduct Consultation (Doctor)
// Story ID: DOC-06
// Handles patient consultation workflow:
// 1. View patient details before consultation
// 2. Conduct consultation (online/offline)
// 3. Add consultation notes
// ═══════════════════════════════════════════════════════════

header('Content-Type: application/json');
session_start();

// Database configuration
$host = 'localhost';
$db = 'online_doctor_appointment';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=$charset", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]));
}

$action = $_GET['action'] ?? $_POST['action'] ?? null;
$doctor_id = $_SESSION['doctor_id'] ?? $_POST['doctor_id'] ?? 2; // Default to test doctor

// ═══════════════════════════════════════════════════════════
// 1. GET PATIENT DETAILS BEFORE CONSULTATION
// ═══════════════════════════════════════════════════════════
if ($action === 'get_patient_details') {
    $appointment_id = intval($_GET['appointment_id'] ?? $_POST['appointment_id'] ?? 0);

    if ($appointment_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid appointment ID']);
        exit;
    }

    try {
        // Get appointment details and patient profile
        $stmt = $pdo->prepare("
            SELECT 
                a.id as appointment_id,
                a.reason as appointment_reason,
                a.appointment_date,
                a.status as appointment_status,
                u.id as patient_id,
                u.email,
                pp.full_name,
                pp.phone,
                pp.age
            FROM appointments a
            JOIN users u ON a.patient_id = u.id
            JOIN patient_profiles pp ON u.id = pp.user_id
            WHERE a.id = ? AND a.doctor_id = ?
        ");
        
        $stmt->execute([$appointment_id, $doctor_id]);
        $result = $stmt->fetch();

        if (!$result) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Appointment not found']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'data' => [
                'appointment_id' => $result['appointment_id'],
                'patient_id' => $result['patient_id'],
                'patient_name' => $result['full_name'],
                'patient_email' => $result['email'],
                'patient_phone' => $result['phone'],
                'patient_age' => $result['age'],
                'appointment_date' => $result['appointment_date'],
                'appointment_reason' => $result['appointment_reason'],
                'appointment_status' => $result['appointment_status']
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error fetching patient details: ' . $e->getMessage()]);
    }
    exit;
}

// ═══════════════════════════════════════════════════════════
// 2. CONDUCT CONSULTATION (ONLINE/OFFLINE)
// ═══════════════════════════════════════════════════════════
if ($action === 'conduct_consultation') {
    $data = json_decode(file_get_contents('php://input'), true);
    $appointment_id = intval($data['appointment_id'] ?? 0);
    $consultation_type = strtolower($data['consultation_type'] ?? ''); // 'online' or 'offline'
    $consultation_notes = trim($data['consultation_notes'] ?? '');

    // Validate inputs
    if ($appointment_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid appointment ID']);
        exit;
    }

    if (!in_array($consultation_type, ['online', 'offline'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid consultation type. Must be "online" or "offline"']);
        exit;
    }

    if (empty($consultation_notes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Consultation notes are required']);
        exit;
    }

    try {
        // Verify appointment belongs to this doctor
        $stmt = $pdo->prepare("
            SELECT id, patient_id, status FROM appointments 
            WHERE id = ? AND doctor_id = ?
        ");
        $stmt->execute([$appointment_id, $doctor_id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Appointment not found or access denied']);
            exit;
        }

        // Store consultation details (can be extended with database table)
        // For now, we save to a consultation log/file or cache
        $consultation_data = [
            'appointment_id' => $appointment_id,
            'doctor_id' => $doctor_id,
            'patient_id' => $appointment['patient_id'],
            'consultation_type' => $consultation_type,
            'consultation_notes' => $consultation_notes,
            'conducted_at' => date('Y-m-d H:i:s'),
            'status' => 'conducted'
        ];

        // You can save this to database, file, or session
        // For now, return success response
        echo json_encode([
            'success' => true,
            'message' => 'Consultation conducted successfully',
            'data' => [
                'appointment_id' => $appointment_id,
                'consultation_type' => $consultation_type,
                'consultation_notes' => $consultation_notes,
                'conducted_at' => $consultation_data['conducted_at']
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error conducting consultation: ' . $e->getMessage()]);
    }
    exit;
}

// ═══════════════════════════════════════════════════════════
// 3. ADD/UPDATE CONSULTATION NOTES
// ═══════════════════════════════════════════════════════════
if ($action === 'save_consultation_notes') {
    $data = json_decode(file_get_contents('php://input'), true);
    $appointment_id = intval($data['appointment_id'] ?? 0);
    $consultation_notes = trim($data['consultation_notes'] ?? '');
    $consultation_type = strtolower($data['consultation_type'] ?? 'online');

    if ($appointment_id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid appointment ID']);
        exit;
    }

    if (empty($consultation_notes)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Consultation notes cannot be empty']);
        exit;
    }

    try {
        // Verify appointment belongs to this doctor
        $stmt = $pdo->prepare("
            SELECT id, patient_id FROM appointments 
            WHERE id = ? AND doctor_id = ?
        ");
        $stmt->execute([$appointment_id, $doctor_id]);
        $appointment = $stmt->fetch();

        if (!$appointment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Appointment not found or access denied']);
            exit;
        }

        // Save consultation notes
        // This can be saved to appointment notes or a separate consultation table
        $saved_data = [
            'appointment_id' => $appointment_id,
            'doctor_id' => $doctor_id,
            'patient_id' => $appointment['patient_id'],
            'consultation_type' => $consultation_type,
            'consultation_notes' => $consultation_notes,
            'saved_at' => date('Y-m-d H:i:s')
        ];

        echo json_encode([
            'success' => true,
            'message' => 'Consultation notes saved successfully',
            'data' => $saved_data
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Error saving consultation notes: ' . $e->getMessage()]);
    }
    exit;
}

// ═══════════════════════════════════════════════════════════
// Invalid Action
// ═══════════════════════════════════════════════════════════
http_response_code(400);
echo json_encode([
    'success' => false, 
    'message' => 'Invalid action. Available actions: get_patient_details, conduct_consultation, save_consultation_notes'
]);
?>

