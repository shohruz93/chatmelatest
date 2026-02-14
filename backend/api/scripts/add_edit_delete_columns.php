<?php
require_once __DIR__ . '/../src/Database.php';

$db = Database::getInstance()->getConnection();
if (!$db) {
    throw new Exception("Could not connect to the database. Check your Config.php settings.");
}

try {
    echo "Starting database migration...\n";

    // Add is_edited column
    try {
        $db->exec("ALTER TABLE messages ADD COLUMN is_edited TINYINT(1) DEFAULT 0 AFTER is_correction");
        echo "Added 'is_edited' column to messages table.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "'is_edited' column already exists.\n";
        } else {
            throw $e;
        }
    }

    // Add is_deleted column
    try {
        $db->exec("ALTER TABLE messages ADD COLUMN is_deleted TINYINT(1) DEFAULT 0 AFTER is_edited");
        echo "Added 'is_deleted' column to messages table.\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
            echo "'is_deleted' column already exists.\n";
        } else {
            throw $e;
        }
    }

    echo "Migration completed successfully.\n";

} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}
