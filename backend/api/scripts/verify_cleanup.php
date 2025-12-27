<?php
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Profile.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed\n");
}

$profile = new Profile($db);

// 1. Find two users
$stmt = $db->query("SELECT id FROM users LIMIT 2");
$users = $stmt->fetchAll();

if (count($users) < 2) {
    die("Need at least 2 users in the database to test\n");
}

$user1 = $users[0]['id'];
$user2 = $users[1]['id'];

echo "Testing guest cleanup for user $user1 (viewer) and $user2 (viewed)\n";

// 2. Insert an old record (2 months ago)
$oldDate = date('Y-m-d H:i:s', strtotime('-2 months'));
$stmt = $db->prepare("INSERT INTO profile_views (viewer_id, viewed_id, viewed_at, seen) VALUES (:viewer, :viewed, :at, 0) ON DUPLICATE KEY UPDATE viewed_at = :at2, seen = 0");
$stmt->bindParam(':viewer', $user1);
$stmt->bindParam(':viewed', $user2);
$stmt->bindParam(':at', $oldDate);
$stmt->bindParam(':at2', $oldDate);
$stmt->execute();

echo "Inserted old record at $oldDate\n";

// 3. Verify it exists
$stmt = $db->prepare("SELECT COUNT(*) FROM profile_views WHERE viewer_id = :viewer AND viewed_id = :viewed AND viewed_at = :at");
$stmt->bindParam(':viewer', $user1);
$stmt->bindParam(':viewed', $user2);
$stmt->bindParam(':at', $oldDate);
$stmt->execute();
if ($stmt->fetchColumn() == 0) {
    die("FAILED: Old record was not inserted or found\n");
}
echo "Confirmed old record exists in DB\n";

// 4. Call getGuests (which should trigger cleanup)
echo "Calling getGuests($user2)...\n";
try {
    ob_start();
    $profile->getGuests($user2);
    $output = ob_get_clean();
    echo "Called getGuests successfully.\n";
} catch (Exception $e) {
    echo "Error calling getGuests: " . $e->getMessage() . "\n";
}

// 5. Verify it's gone
echo "Verifying if record is gone...\n";
$stmt = $db->prepare("SELECT COUNT(*) FROM profile_views WHERE viewer_id = :viewer AND viewed_id = :viewed");
$stmt->bindParam(':viewer', $user1);
$stmt->bindParam(':viewed', $user2);
$stmt->execute();

$count = $stmt->fetchColumn();
echo "Record count: $count\n";

if ($count == 0) {
    echo "SUCCESS: Old record was removed by cleanup logic!\n";
} else {
    echo "FAILED: Old record still exists in DB\n";
}
