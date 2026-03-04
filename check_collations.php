<?php
require_once __DIR__ . '/backend/api/src/Database.php';
$db = (new Database())->getConnection();

$tables = ['users', 'messages', 'community_posts', 'gallery_images', 'friendships'];

foreach ($tables as $table) {
    echo "Table: $table\n";
    try {
        $stmt = $db->prepare("SHOW FULL COLUMNS FROM $table");
        $stmt->execute();
        $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach ($columns as $column) {
            if ($column['Collation']) {
                echo "  Column: {$column['Field']} - Collation: {$column['Collation']}\n";
            }
        }
    } catch (Exception $e) {
        echo "  Error: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
