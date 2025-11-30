<?php
require_once __DIR__ . '/src/Database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Check if columns exist first to avoid error on re-run
    $check = $db->query("SHOW COLUMNS FROM users LIKE 'native_language'");
    if ($check->rowCount() == 0) {
        $sql = "ALTER TABLE users ADD COLUMN native_language TEXT DEFAULT NULL";
        $db->exec($sql);
        echo "Column native_language added.\n";
    } else {
        echo "Column native_language already exists.\n";
    }

    $check = $db->query("SHOW COLUMNS FROM users LIKE 'learning_language'");
    if ($check->rowCount() == 0) {
        $sql = "ALTER TABLE users ADD COLUMN learning_language TEXT DEFAULT NULL";
        $db->exec($sql);
        echo "Column learning_language added.\n";
    } else {
        echo "Column learning_language already exists.\n";
    }
    
    echo "Migration completed successfully.\n";
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
