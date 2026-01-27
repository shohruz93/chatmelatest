<?php
require_once __DIR__ . '/backend/api/src/Database.php';

$tableName = $argv[1] ?? 'messages';
$db = Database::getInstance()->getConnection();

try {
    $stmt = $db->query("DESCRIBE $tableName");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "--- Structure of $tableName ---\n";
    foreach ($columns as $col) {
        printf("%-20s %-20s %-10s %-10s %-10s\n", $col['Field'], $col['Type'], $col['Null'], $col['Key'], $col['Default']);
    }

    echo "\n--- Indexes on $tableName ---\n";
    $stmt = $db->query("SHOW INDEX FROM $tableName");
    $indexes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    foreach ($indexes as $idx) {
        printf("%-20s %-20s %-20s\n", $idx['Key_name'], $idx['Column_name'], $idx['Non_unique'] ? 'Non-unique' : 'Unique');
    }

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
