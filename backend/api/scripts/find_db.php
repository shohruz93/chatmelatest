<?php
require_once __DIR__ . '/../src/Config.php';

$host = getenv('DB_HOST') ?: 'localhost';
$username = getenv('DB_USER') ?: 's1028897_randomchatFo';
$password = getenv('DB_PASS') ?: 's1028897_randomchatFo';

try {
    $conn = new PDO("mysql:host=$host", $username, $password);
    $dbs = $conn->query("SHOW DATABASES")->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($dbs as $db) {
        if (in_array($db, ['information_schema', 'mysql', 'performance_schema', 'phpmyadmin'])) continue;
        
        echo "Checking DB: $db\n";
        try {
            $conn->exec("USE `$db`");
            $tables = $conn->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
            if (in_array('users', $tables)) {
                echo "FOUND 'users' table in database: $db\n";
            }
        } catch (Exception $e) {
            echo "Could not check $db: " . $e->getMessage() . "\n";
        }
    }
} catch (Exception $e) {
    echo "Connection error: " . $e->getMessage() . "\n";
}
