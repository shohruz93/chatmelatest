<?php
require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Modify receiver_id to allow NULL values
    echo "Modifying receiver_id column to allow NULL values...\n";
    $db->exec("ALTER TABLE messages MODIFY COLUMN receiver_id INT DEFAULT NULL");
    echo "Successfully modified receiver_id column.\n";
    
    echo "\nFix completed successfully!\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
