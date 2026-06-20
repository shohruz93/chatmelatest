<?php
require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Database connection failed.");
}

try {
    echo "Adding missing indexes to improve performance...\n";

    // Indexes for messages table
    $queries = [
        "ALTER TABLE messages ADD INDEX idx_room_created (room_id, created_at)" => "Added index on messages (room_id, created_at)",
        "ALTER TABLE messages ADD INDEX idx_sender_receiver (sender_id, receiver_id)" => "Added index on messages (sender_id, receiver_id)",
        "ALTER TABLE community_posts ADD INDEX idx_user_created (user_id, created_at)" => "Added index on community_posts (user_id, created_at)",
        "ALTER TABLE community_posts ADD INDEX idx_created_at (created_at)" => "Added index on community_posts (created_at)",
        "ALTER TABLE user_missions ADD INDEX idx_user_mission (user_id, mission_id, created_at)" => "Added index on user_missions (user_id, mission_id, created_at)",
    ];

    foreach ($queries as $query => $successMsg) {
        try {
            $db->exec($query);
            echo "[SUCCESS] $successMsg\n";
        } catch (PDOException $e) {
            // Error 1061 is "Duplicate key name" which means index already exists
            if ($e->getCode() == '42000' && strpos($e->getMessage(), '1061') !== false) {
                echo "[SKIPPED] Index already exists for: $successMsg\n";
            } else {
                echo "[ERROR] Failed to run query: $query. Error: " . $e->getMessage() . "\n";
            }
        }
    }

    echo "\nDatabase indexing completed.\n";

} catch (Exception $e) {
    echo "Fatal Error: " . $e->getMessage() . "\n";
}
?>
