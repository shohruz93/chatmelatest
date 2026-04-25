<?php
require_once __DIR__ . '/src/Database.php';

$db = Database::getInstance()->getConnection();

try {
    echo "Starting database updates for Monetag rewards...\n";

    // 1. Add last_ad_reward column to users table
    try {
        $db->exec("ALTER TABLE users ADD COLUMN last_ad_reward TIMESTAMP NULL DEFAULT NULL AFTER coins");
        echo "1. Added 'last_ad_reward' column to users table.\n";
    } catch (Exception $e) {
        echo "1. 'last_ad_reward' column already exists or table issue.\n";
    }

    // 2. Ensure coins column exists (just in case)
    try {
        $db->exec("ALTER TABLE users ADD COLUMN coins INT DEFAULT 0 AFTER email");
        echo "2. Added 'coins' column (if it was missing).\n";
    } catch (Exception $e) {
        echo "2. 'coins' column already exists.\n";
    }

    echo "\nDatabase fix completed successfully! No new tables were created.\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
