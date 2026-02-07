<?php
// migrate_correction.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit();
}

try {
    // 1. Check if column exists
    $checkQuery = "SHOW COLUMNS FROM messages LIKE 'is_correction'";
    $stmt = $db->query($checkQuery);
    $exists = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($exists) {
        echo json_encode(["status" => "success", "message" => "Column 'is_correction' already exists."]);
    } else {
        // 2. Add column
        $alterQuery = "ALTER TABLE messages ADD COLUMN is_correction TINYINT(1) DEFAULT 0 AFTER type";
        $db->exec($alterQuery);
        echo json_encode(["status" => "success", "message" => "Column 'is_correction' added successfully."]);
    }
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Migration failed: " . $e->getMessage()]);
}
?>
