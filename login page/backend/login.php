<?php
ini_set('display_errors', 0);
ini_set('display_startup_errors', 0);
error_reporting(0);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require 'config.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "message" => "Method Not Allowed"]);
    exit;
}

// Get raw POST body
$input = json_decode(file_get_contents("php://input"), true);

if (!isset($input['email']) || !isset($input['password']) || !isset($input['role'])) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Missing required fields"]);
    exit;
}

$email    = trim($input['email']);
$password = $input['password'];
$role     = trim($input['role']);

try {
    // Check if user exists with the requested role
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND role = ?");
    $stmt->execute([$email, $role]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password'])) {
        // Check account status
        if ($user['status'] === 'pending') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Your account is pending admin approval. Please check back later."]);
            exit;
        }

        if ($user['status'] === 'rejected') {
            http_response_code(403);
            echo json_encode(["success" => false, "message" => "Your account registration has been rejected. Contact support for details."]);
            exit;
        }

        echo json_encode([
            "success" => true,
            "message" => "Login successful! Redirecting to {$role} dashboard...",
            "user" => [
                "id"    => $user['id'],
                "email" => $user['email'],
                "role"  => $user['role'],
                "status" => $user['status']
            ]
        ]);
    } else {
        http_response_code(401);
        echo json_encode(["success" => false, "message" => "Invalid credentials or incorrect role selected."]);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Internal Server Error: " . $e->getMessage()]);
}
?>
