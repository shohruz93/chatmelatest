<?php
require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    die("Connection failed\n");
}

$schemaFiles = [
    'd:\ChatmeLast\database\schema.sql',
    'd:\ChatmeLast\database\schema_update.sql',
    'd:\ChatmeLast\database\schema_gamification.sql'
];

foreach ($schemaFiles as $file) {
    if (!file_exists($file)) {
        echo "File not found: $file\n";
        continue;
    }
    
    echo "Running $file...\n";
    $sql = file_get_contents($file);
    try {
        $db->exec($sql);
        echo "Successfully ran $file\n";
    } catch (PDOException $e) {
        echo "Error running $file: " . $e->getMessage() . "\n";
    }
}

echo "Database initialization complete.\n";
