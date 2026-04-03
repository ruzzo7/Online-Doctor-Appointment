<?php
// Configuration for the login system backend (MySQL)
$host     = 'localhost';
$db       = 'online_doctor_appointment';
$user     = 'root';
$pass     = ''; // Standard XAMPP password is empty
$charset  = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    // If the database doesn't exist yet, we might still want to connect to the server
    // (e.g. for init_db.php to create the database)
    if ($e->getCode() == 1049) {
        $temp_dsn = "mysql:host=$host;charset=$charset";
        $pdo = new PDO($temp_dsn, $user, $pass, $options);
    } else {
        header('Content-Type: application/json');
        echo json_encode([
            "success" => false, 
            "message" => "Database connection failed: " . $e->getMessage()
        ]);
        exit;
    }
}
?>
