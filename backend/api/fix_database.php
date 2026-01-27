<?php
require_once __DIR__ . '/src/Database.php';

$db = Database::getInstance()->getConnection();

try {
    // 1. Allow google_id to be NULL
    $db->exec("ALTER TABLE users MODIFY COLUMN google_id VARCHAR(255) NULL");
    echo "1. Altered users table to allow NULL for google_id.\n";

    // 2. Set all empty string google_id values to NULL to avoid duplicate '' unique constraint
    $db->exec("UPDATE users SET google_id = NULL WHERE google_id = ''");
    echo "2. Updated existing empty google_id values to NULL.\n";

    // 3. Add composite index for room messaging performance
    try {
        $db->exec("ALTER TABLE messages ADD INDEX IF NOT EXISTS idx_room_created (room_id, created_at DESC)");
        echo "3. Added composite index idx_room_created on messages table.\n";
    } catch (PDOException $e) {
        // If IF NOT EXISTS is not supported by their MySQL version
        if (strpos($e->getMessage(), 'Duplicate key name') === false) {
             throw $e;
        }
        echo "3. Index idx_room_created already exists.\n";
    }

    // 4. Add unread count index
    try {
        $db->exec("ALTER TABLE messages ADD INDEX IF NOT EXISTS idx_receiver_unread (receiver_id, is_read)");
        echo "4. Added index idx_receiver_unread on messages table.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate key name') === false) {
             throw $e;
        }
        echo "4. Index idx_receiver_unread already exists.\n";
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
