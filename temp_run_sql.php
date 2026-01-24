<?php
require_once __DIR__ . '/backend/api/src/Database.php';

$db = Database::getInstance()->getConnection();
$sql = file_get_contents(__DIR__ . '/database/schema_views.sql');

try {
    $db->exec($sql);
    echo "SQL executed successfully.\n";
} catch (PDOException $e) {
    echo "Error executing SQL: " . $e->getMessage() . "\n";
}
