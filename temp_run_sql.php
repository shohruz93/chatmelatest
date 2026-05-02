<?php
require_once __DIR__ . '/backend/api/src/Database.php';

$db = Database::getInstance()->getConnection();

$sql = file_get_contents(__DIR__ . '/database/schema_coins.sql');

try {
    $db->exec($sql);
    echo "SUCCESS: coin_transactions table created or already exists.\n";
} catch (Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
