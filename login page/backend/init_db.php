<?php
require 'config.php';

try {
    // Create database if not exists
    $pdo->exec("CREATE DATABASE IF NOT EXISTS online_doctor_appointment");
    $pdo->exec("USE online_doctor_appointment");

    // Drop existing tables for fresh start (be careful in production!)
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
    $pdo->exec("DROP TABLE IF EXISTS doctor_profiles");
    $pdo->exec("DROP TABLE IF EXISTS patient_profiles");
    $pdo->exec("DROP TABLE IF EXISTS users");
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    // Create users table
    $pdo->exec("CREATE TABLE users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'doctor', 'patient') NOT NULL,
        status ENUM('pending', 'active', 'rejected') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Create doctor_profiles table
    $pdo->exec("CREATE TABLE doctor_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        specialization VARCHAR(255) NOT NULL,
        license_number VARCHAR(100) NOT NULL,
        experience INT NOT NULL,
        hospital VARCHAR(255),
        bio TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // Create patient_profiles table
    $pdo->exec("CREATE TABLE patient_profiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        age INT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    // Sample users
    $users = [
        ['email' => 'admin@gmail.com',  'password' => 'admin123',  'role' => 'admin',   'status' => 'active'],
        ['email' => 'doctor@gmail.com', 'password' => 'doctor123', 'role' => 'doctor',  'status' => 'active'],
        ['email' => 'patient@gmail.com','password' => 'patient123','role' => 'patient', 'status' => 'active']
    ];

    $stmt = $pdo->prepare("INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)");
    
    foreach ($users as $user) {
        $hashed = password_hash($user['password'], PASSWORD_DEFAULT);
        $stmt->execute([$user['email'], $hashed, $user['role'], $user['status']]);
    }

    echo "✅ Database initialized with status column and profiles!\n";

} catch (PDOException $e) {
    die("❌ Error initializing database: " . $e->getMessage());
}
?>
