<?php
require_once __DIR__ . '/../src/Database.php';
$db = (new Database())->getConnection();

// Let's use user 1 and 3 as found before
$user1 = 1;
$user2 = 3;

echo "Cleaning up user $user2...\n";

// Insert old record
$oldDate = '2025-10-01 12:00:00'; // Definitely older than 1 month
$stmt = $db->prepare("INSERT INTO profile_views (viewer_id, viewed_id, viewed_at, seen) VALUES (:v1, :v2, :at, 0) ON DUPLICATE KEY UPDATE viewed_at = :at2");
$stmt->execute(['v1' => $user1, 'v2' => $user2, 'at' => $oldDate, 'at2' => $oldDate]);

echo "Inserted record for 2025-10-01\n";

// Count before
$stmt = $db->prepare("SELECT COUNT(*) FROM profile_views WHERE viewed_id = :v2 AND viewed_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)");
$stmt->execute(['v2' => $user2]);
echo "Old records before cleanup: " . $stmt->fetchColumn() . "\n";

// Trigger cleanup (copy-pasted from Profile.php)
$cleanupQuery = "DELETE FROM profile_views WHERE viewed_id = :user_id AND viewed_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)";
$cleanupStmt = $db->prepare($cleanupQuery);
$cleanupStmt->bindParam(":user_id", $user2);
$cleanupStmt->execute();

echo "Cleanup executed.\n";

// Count after
$stmt = $db->prepare("SELECT COUNT(*) FROM profile_views WHERE viewed_id = :v2 AND viewed_at < DATE_SUB(NOW(), INTERVAL 1 MONTH)");
$stmt->execute(['v2' => $user2]);
echo "Old records after cleanup: " . $stmt->fetchColumn() . "\n";
