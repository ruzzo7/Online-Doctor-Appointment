-- ═══════════════════════════════════════════════════════════
-- Appointments & Prescriptions Tables
-- Run this after database.sql to add appointment system
-- ═══════════════════════════════════════════════════════════

USE `online_doctor_appointment`;

-- Table: appointments
CREATE TABLE IF NOT EXISTS `appointments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `appointment_date` datetime NOT NULL,
  `reason` text,
  `status` enum('pending','upcoming','completed','cancelled') DEFAULT 'pending',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: prescriptions
CREATE TABLE IF NOT EXISTS `prescriptions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `appointment_id` int(11) NOT NULL,
  `doctor_id` int(11) NOT NULL,
  `patient_id` int(11) NOT NULL,
  `diagnosis` text NOT NULL,
  `medicines` text NOT NULL,
  `instructions` text,
  `follow_up_date` date DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: specialties
CREATE TABLE IF NOT EXISTS `specialties` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Table: notifications (for patient alerts)
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `patient_id` int(11) NOT NULL,
  `appointment_id` int(11),
  `type` enum('appointment_approved','appointment_cancelled','appointment_reminder') DEFAULT 'appointment_reminder',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `days_until_appointment` int(11),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`patient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON DELETE CASCADE,
  KEY `patient_id_index` (`patient_id`),
  KEY `created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ═══════════════════════════════════════════════════════════
-- Mock Patient Data (if not already present)
-- ═══════════════════════════════════════════════════════════

-- Insert mock patients
INSERT INTO `users` (`email`, `password`, `role`, `status`) VALUES
('rahul.sharma@gmail.com', '$2y$10$xN0wW5cF1xQ7gK3rP5sM6eYh2bD4vF8jL0nR2tU4wA6yC8eG0iK2m', 'patient', 'active'),
('priya.patel@gmail.com', '$2y$10$xN0wW5cF1xQ7gK3rP5sM6eYh2bD4vF8jL0nR2tU4wA6yC8eG0iK2m', 'patient', 'active'),
('amit.kumar@gmail.com', '$2y$10$xN0wW5cF1xQ7gK3rP5sM6eYh2bD4vF8jL0nR2tU4wA6yC8eG0iK2m', 'patient', 'active'),
('sneha.gupta@gmail.com', '$2y$10$xN0wW5cF1xQ7gK3rP5sM6eYh2bD4vF8jL0nR2tU4wA6yC8eG0iK2m', 'patient', 'active'),
('ravi.thapa@gmail.com', '$2y$10$xN0wW5cF1xQ7gK3rP5sM6eYh2bD4vF8jL0nR2tU4wA6yC8eG0iK2m', 'patient', 'active')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- Insert patient profiles (using subquery to get user IDs)
INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `age`)
SELECT id, 'Rahul Sharma', '9801234567', 28 FROM `users` WHERE email='rahul.sharma@gmail.com'
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `age`)
SELECT id, 'Priya Patel', '9812345678', 34 FROM `users` WHERE email='priya.patel@gmail.com'
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `age`)
SELECT id, 'Amit Kumar', '9823456789', 45 FROM `users` WHERE email='amit.kumar@gmail.com'
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `age`)
SELECT id, 'Sneha Gupta', '9834567890', 22 FROM `users` WHERE email='sneha.gupta@gmail.com'
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

INSERT INTO `patient_profiles` (`user_id`, `full_name`, `phone`, `age`)
SELECT id, 'Ravi Thapa', '9845678901', 55 FROM `users` WHERE email='ravi.thapa@gmail.com'
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

-- ═══════════════════════════════════════════════════════════
-- Mock Appointments (linked to doctor@gmail.com)
-- ═══════════════════════════════════════════════════════════

INSERT INTO `appointments` (`doctor_id`, `patient_id`, `appointment_date`, `reason`, `status`)
SELECT
  (SELECT id FROM users WHERE email = 'doctor@gmail.com'),
  (SELECT id FROM users WHERE email = 'rahul.sharma@gmail.com'),
  DATE_ADD(CURDATE(), INTERVAL 1 DAY),
  'Chest pain and shortness of breath during exercise',
  'pending';

INSERT INTO `appointments` (`doctor_id`, `patient_id`, `appointment_date`, `reason`, `status`)
SELECT
  (SELECT id FROM users WHERE email = 'doctor@gmail.com'),
  (SELECT id FROM users WHERE email = 'priya.patel@gmail.com'),
  DATE_ADD(CURDATE(), INTERVAL 2 DAY),
  'Routine cardiac checkup and ECG review',
  'pending';

INSERT INTO `appointments` (`doctor_id`, `patient_id`, `appointment_date`, `reason`, `status`)
SELECT
  (SELECT id FROM users WHERE email = 'doctor@gmail.com'),
  (SELECT id FROM users WHERE email = 'amit.kumar@gmail.com'),
  CURDATE(),
  'High blood pressure follow-up',
  'pending';

INSERT INTO `appointments` (`doctor_id`, `patient_id`, `appointment_date`, `reason`, `status`)
SELECT
  (SELECT id FROM users WHERE email = 'doctor@gmail.com'),
  (SELECT id FROM users WHERE email = 'sneha.gupta@gmail.com'),
  DATE_SUB(CURDATE(), INTERVAL 3 DAY),
  'Dizziness and irregular heartbeat',
  'completed';

INSERT INTO `appointments` (`doctor_id`, `patient_id`, `appointment_date`, `reason`, `status`)
SELECT
  (SELECT id FROM users WHERE email = 'doctor@gmail.com'),
  (SELECT id FROM users WHERE email = 'ravi.thapa@gmail.com'),
  DATE_ADD(CURDATE(), INTERVAL 5 DAY),
  'Pre-surgery cardiac evaluation',
  'pending';
