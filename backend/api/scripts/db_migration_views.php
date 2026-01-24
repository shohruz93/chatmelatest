<?php
require_once __DIR__ . '/../src/Database.php';

$db = Database::getInstance()->getConnection();

echo "Checking for 'views_count' column in 'community_posts' table...\n";

try {
    // Check if column exists
    $stmt = $db->prepare("SHOW COLUMNS FROM community_posts LIKE 'views_count'");
    $stmt->execute();
    $exists = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$exists) {
        echo "Adding 'views_count' column...\n";
        $sql = "ALTER TABLE community_posts ADD COLUMN views_count INT DEFAULT 0 AFTER comments_count";
        $db->exec($sql);
        echo "Column 'views_count' added successfully.\n";
    } else {
        echo "Column 'views_count' already exists.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
