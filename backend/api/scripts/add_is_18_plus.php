<?php
require_once __DIR__ . '/../src/Database.php';

try {
    $db = Database::getInstance()->getConnection();
    // Add is_18_plus column if it doesn't exist
    $db->exec("ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_18_plus TINYINT(1) DEFAULT 0");
    echo "Column is_18_plus added successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
