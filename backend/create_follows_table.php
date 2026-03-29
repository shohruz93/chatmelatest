<?php
require_once __DIR__ . '/api/src/Database.php';

try {
    $db = (new Database())->getConnection();
    if (!$db) {
        die("Database connection failed.\n");
    }

    $sql = "CREATE TABLE IF NOT EXISTS follows (
        id INT AUTO_INCREMENT PRIMARY KEY,
        follower_id INT NOT NULL,
        followed_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_follow (follower_id, followed_id),
        INDEX idx_follower (follower_id),
        INDEX idx_followed (followed_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

    $db->exec($sql);
    echo "Follows table created or already exists.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
