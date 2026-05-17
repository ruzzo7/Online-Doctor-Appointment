<?php
// Configuration for the login system backend (MySQL)
$host    = 'localhost';
$db      = 'online_doctor_appointment';
$user    = 'root';
$pass    = ''; // Standard XAMPP password is empty
$charset = 'utf8mb4';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

function ensureColumnExists(PDO $pdo, string $table, string $column, string $definition): void
{
    $stmt = $pdo->query("SHOW COLUMNS FROM `{$table}` LIKE '{$column}'");
    if (!$stmt->fetch()) {
        $pdo->exec("ALTER TABLE `{$table}` ADD COLUMN `{$column}` {$definition}");
    }
}

function ensureTableIsHealthy(PDO $pdo, string $table, string $createSql): void
{
    try {
        $pdo->query("SELECT 1 FROM `{$table}` LIMIT 1");
    } catch (PDOException $e) {
        $message = $e->getMessage();
        $isBrokenMetadata = strpos($message, "doesn't exist in engine") !== false
            || strpos($message, 'Base table or view not found') !== false;

        if (!$isBrokenMetadata) {
            throw $e;
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $pdo->exec("DROP TABLE IF EXISTS `{$table}`");
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
        $pdo->exec($createSql);
    }
}

function bootstrapDatabase(PDO $pdo, string $dbName): void
{
    $pdo->exec("CREATE DATABASE IF NOT EXISTS {$dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $pdo->exec("USE {$dbName}");

    $usersTableSql = "CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'doctor', 'patient') NOT NULL,
        status ENUM('pending', 'active', 'rejected') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($usersTableSql);
    ensureTableIsHealthy($pdo, 'users', $usersTableSql);

    $doctorProfilesTableSql = "CREATE TABLE IF NOT EXISTS doctor_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        license_number VARCHAR(100) NOT NULL,
        experience INT NOT NULL,
        consultation_fee DECIMAL(10,2),
        hospital VARCHAR(255),
        available_from TIME,
        available_to TIME,
        bio TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($doctorProfilesTableSql);
    ensureTableIsHealthy($pdo, 'doctor_profiles', $doctorProfilesTableSql);

    ensureColumnExists($pdo, 'doctor_profiles', 'consultation_fee', 'DECIMAL(10,2) NULL');
    ensureColumnExists($pdo, 'doctor_profiles', 'available_from', 'TIME NULL');
    ensureColumnExists($pdo, 'doctor_profiles', 'available_to', 'TIME NULL');

    $patientProfilesTableSql = "CREATE TABLE IF NOT EXISTS patient_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($patientProfilesTableSql);
    ensureTableIsHealthy($pdo, 'patient_profiles', $patientProfilesTableSql);

    $appointmentsTableSql = "CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT NOT NULL,
        patient_id INT NOT NULL,
        appointment_date DATETIME NOT NULL,
        reason TEXT,
        status ENUM('pending', 'upcoming', 'completed', 'cancelled') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($appointmentsTableSql);
    ensureTableIsHealthy($pdo, 'appointments', $appointmentsTableSql);
    $pdo->exec("ALTER TABLE appointments MODIFY status ENUM('pending', 'upcoming', 'completed', 'cancelled') DEFAULT 'pending'");

    $prescriptionsTableSql = "CREATE TABLE IF NOT EXISTS prescriptions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        appointment_id INT NOT NULL,
        doctor_id INT NOT NULL,
        patient_id INT NOT NULL,
        diagnosis TEXT NOT NULL,
        medicines TEXT NOT NULL,
        instructions TEXT,
        follow_up_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($prescriptionsTableSql);
    ensureTableIsHealthy($pdo, 'prescriptions', $prescriptionsTableSql);

    $medicalRecordsTableSql = "CREATE TABLE IF NOT EXISTS medical_records (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

    $pdo->exec($medicalRecordsTableSql);
    ensureTableIsHealthy($pdo, 'medical_records', $medicalRecordsTableSql);

    $pdo->exec("CREATE TABLE IF NOT EXISTS specialties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Seed defaults only when they do not exist.
    $seedUsers = [
        ['email' => 'admin@gmail.com',   'password' => 'admin123',   'role' => 'admin',   'status' => 'active'],
        ['email' => 'doctor@gmail.com',  'password' => 'doctor123',  'role' => 'doctor',  'status' => 'active'],
        ['email' => 'patient@gmail.com', 'password' => 'patient123', 'role' => 'patient', 'status' => 'active'],
    ];

    $findUser = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $insertUser = $pdo->prepare("INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)");

    foreach ($seedUsers as $userData) {
        $findUser->execute([$userData['email']]);
        if (!$findUser->fetch()) {
            $insertUser->execute([
                $userData['email'],
                password_hash($userData['password'], PASSWORD_DEFAULT),
                $userData['role'],
                $userData['status'],
            ]);
        }
    }

    $findUserByEmail = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $findDoctorProfile = $pdo->prepare("SELECT id FROM doctor_profiles WHERE user_id = ? LIMIT 1");
    $insertDoctorProfile = $pdo->prepare("INSERT INTO doctor_profiles (user_id, full_name, specialization, license_number, experience, hospital, bio) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $findPatientProfile = $pdo->prepare("SELECT id FROM patient_profiles WHERE user_id = ? LIMIT 1");
    $insertPatientProfile = $pdo->prepare("INSERT INTO patient_profiles (user_id, full_name, phone, age) VALUES (?, ?, ?, ?)");

    $findUserByEmail->execute(['doctor@gmail.com']);
    $doctorUser = $findUserByEmail->fetch();
    if ($doctorUser) {
        $findDoctorProfile->execute([$doctorUser['id']]);
        if (!$findDoctorProfile->fetch()) {
            $insertDoctorProfile->execute([
                $doctorUser['id'],
                'Dr. John Smith',
                'Cardiology',
                'MED-123456',
                10,
                'City General Hospital',
                'Experienced cardiologist with over 10 years in patient care.'
            ]);
        }
    }

    $findUserByEmail->execute(['patient@gmail.com']);
    $patientUser = $findUserByEmail->fetch();
    if ($patientUser) {
        $findPatientProfile->execute([$patientUser['id']]);
        if (!$findPatientProfile->fetch()) {
            $insertPatientProfile->execute([
                $patientUser['id'],
                'Jane Doe',
                '9876543210',
                25
            ]);
        }
    }
}

function bootstrapDatabaseWithRecovery(PDO $pdo, string $dbName): void
{
    try {
        bootstrapDatabase($pdo, $dbName);
    } catch (PDOException $e) {
        $message = $e->getMessage();
        $canRebuild = strpos($message, 'Tablespace for table') !== false
            || strpos($message, "doesn't exist in engine") !== false
            || strpos($message, 'Base table or view not found') !== false;

        if (!$canRebuild) {
            throw $e;
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        $pdo->exec("DROP DATABASE IF EXISTS `{$dbName}`");
        $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');

        // Recreate everything from a clean slate for local/dev reliability.
        bootstrapDatabase($pdo, $dbName);
    }
}

try {
    $serverDsn = "mysql:host=$host;charset=$charset";
    $pdo = new PDO($serverDsn, $user, $pass, $options);

    $activeDb = $db;
    try {
        bootstrapDatabaseWithRecovery($pdo, $activeDb);
    } catch (PDOException $e) {
        $message = $e->getMessage();
        $cannotDropBrokenDb = strpos($message, 'Error dropping database') !== false
            || strpos($message, "can't rmdir") !== false;

        if (!$cannotDropBrokenDb) {
            throw $e;
        }

        // Use a clean fallback DB name when the old database folder is unrecoverable.
        $activeDb = $db . '_recovered';
        bootstrapDatabaseWithRecovery($pdo, $activeDb);
    }

    $db = $activeDb;
    $pdo->exec("USE `{$db}`");
} catch (PDOException $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Database bootstrap failed: ' . $e->getMessage(),
    ]);
    exit;
}
?>