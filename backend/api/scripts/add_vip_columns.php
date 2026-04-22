<?php
require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Check if columns exist
    $check = $db->query("SHOW COLUMNS FROM users LIKE 'is_vip'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE users 
                   ADD COLUMN is_vip TINYINT(1) DEFAULT 0,
                   ADD COLUMN vip_until INT DEFAULT NULL,
                   ADD COLUMN hide_from_connect TINYINT(1) DEFAULT 0");
        echo "Added VIP columns to users table successfully.\n";
    } else {
        echo "VIP columns already exist.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
