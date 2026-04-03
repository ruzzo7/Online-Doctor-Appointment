-- Database: online_doctor_appointment
CREATE DATABASE IF NOT EXISTS `online_doctor_appointment`;
USE `online_doctor_appointment`;

-- Table structure for table `users`
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','doctor','patient') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Dumping data for table `users`
-- (Passwords are hashed for admin123, doctor123, patient123)
INSERT INTO `users` (`email`, `password`, `role`) VALUES
('admin@gmail.com', '$2y$10$U2Y3Wl3Z3Y3Z3Y3Z3Y3Z3O3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3O3Z3', 'admin'),
('doctor@gmail.com', '$2y$10$U2Y3Wl3Z3Y3Z3Y3Z3Y3Z3O3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3O3Z3', 'doctor'),
('patient@gmail.com', '$2y$10$U2Y3Wl3Z3Y3Z3Y3Z3Y3Z3O3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3Z3Y3O3Z3', 'patient')
ON DUPLICATE KEY UPDATE `email`=`email`;
