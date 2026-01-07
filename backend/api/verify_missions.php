<?php
require_once __DIR__ . '/src/Database.php';
require_once __DIR__ . '/src/GamificationController.php';
require_once __DIR__ . '/src/User.php';

$db = new Database();
$conn = $db->getConnection();

// 1. Setup a test user
$userId = 1; // Assuming user 1 exists, or create a temporary one

echo "--- Verifying Daily Missions ---\n";

// Function to get current progress
function getProgress($conn, $userId, $key) {
    $query = "SELECT um.progress, um.status 
              FROM user_missions um 
              JOIN missions m ON um.mission_id = m.id 
              WHERE um.user_id = :userId AND m.condition_key = :key 
              AND DATE(um.created_at) = CURDATE()";
    $stmt = $conn->prepare($query);
    $stmt->execute([':userId' => $userId, ':key' => $key]);
    return $stmt->fetch(PDO::FETCH_ASSOC);
}

// 2. Test Login Progress
echo "Testing 'login' progress...\n";
$before = getProgress($conn, $userId, 'login');
echo "Before: Progress=" . ($before['progress'] ?? 'N/A') . ", Status=" . ($before['status'] ?? 'N/A') . "\n";

GamificationController::updateProgress($userId, 'login');

$after = getProgress($conn, $userId, 'login');
echo "After: Progress=" . ($after['progress'] ?? 'N/A') . ", Status=" . ($after['status'] ?? 'N/A') . "\n";

// 3. Test Social Butterfly (chat_unique_users)
echo "\nTesting 'chat_unique_users' progress...\n";
$before = getProgress($conn, $userId, 'chat_unique_users');
echo "Before: Progress=" . ($before['progress'] ?? 'N/A') . ", Status=" . ($before['status'] ?? 'N/A') . "\n";

GamificationController::updateProgress($userId, 'chat_unique_users');

$after = getProgress($conn, $userId, 'chat_unique_users');
echo "After: Progress=" . ($after['progress'] ?? 'N/A') . ", Status=" . ($after['status'] ?? 'N/A') . "\n";

// 4. Test Polyglot (translate_message)
echo "\nTesting 'translate_message' progress...\n";
$before = getProgress($conn, $userId, 'translate_message');
echo "Before: Progress=" . ($before['progress'] ?? 'N/A') . ", Status=" . ($before['status'] ?? 'N/A') . "\n";

GamificationController::updateProgress($userId, 'translate_message');

$after = getProgress($conn, $userId, 'translate_message');
echo "After: Progress=" . ($after['progress'] ?? 'N/A') . ", Status=" . ($after['status'] ?? 'N/A') . "\n";

echo "\n--- Verification Finished ---\n";
