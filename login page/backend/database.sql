-- Database: online_doctor_appointment
CREATE DATABASE IF NOT EXISTS `online_doctor_appointment`;
USE `online_doctor_appointment`;

-- Table structure for table `users`
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','doctor','patient') NOT NULL,
  `status` enum('pending','active','rejected') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `doctor_profiles`
CREATE TABLE IF NOT EXISTS `doctor_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `specialization` varchar(255) NOT NULL,
  `license_number` varchar(100) NOT NULL,
  `experience` int(11) NOT NULL,
  `hospital` varchar(255),
  `bio` text,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table structure for table `patient_profiles`
CREATE TABLE IF NOT EXISTS `patient_profiles` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `phone` varchar(20),
  `age` int(11),
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `users`
INSERT INTO `users` (`email`, `password`, `role`, `status`) VALUES
('admin@gmail.com', '$2y$10$U2Y3Wl3Z3Y3Z3Y3Z3Y3Z3O3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3O3Z3', 'admin', 'active'),
('doctor@gmail.com', '$2y$10$U2Y3Wl3Z3Y3Z3Y3Z3Y3Z3O3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3O3Z3', 'doctor', 'active'),
('patient@gmail.com', '$2y$10$U2Y3Wl3Z3Y3Z3Y3Z3Y3Z3O3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3O3Z3', 'patient', 'active')
ON DUPLICATE KEY UPDATE `email`=`email`;
