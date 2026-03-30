<?php
require 'config.php';

try {
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS online_doctor_appointment");
    $pdo->exec("USE online_doctor_appointment");

    // Create users table
    $pdo->exec("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'doctor', 'patient') NOT NULL
    )");

    // Sample users with hashed passwords
    $users = [
        ['email' => 'admin@gmail.com',  'password' => 'admin123',  'role' => 'admin'],
        ['email' => 'doctor@gmail.com', 'password' => 'doctor123', 'role' => 'doctor'],
        ['email' => 'patient@gmail.com','password' => 'patient123','role' => 'patient']
    ];

    // Clear existing users for fresh start
    $pdo->exec("TRUNCATE TABLE users");

    $stmt = $pdo->prepare("INSERT INTO users (email, password, role) VALUES (?, ?, ?)");
    
    foreach ($users as $user) {
        $hashed = password_hash($user['password'], PASSWORD_DEFAULT);
        $stmt->execute([$user['email'], $hashed, $user['role']]);
    }

    echo "✅ MySQL Database initialized successfully!\n";
    echo "Summary of users added:\n";
    foreach ($users as $u) {
        echo "- {$u['role']}: {$u['email']}\n";
    }

} catch (PDOException $e) {
    die("❌ Error initializing database: " . $e->getMessage());
}
?>
