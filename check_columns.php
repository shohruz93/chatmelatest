<?php
require_once 'backend/api/src/Database.php';

$database = new Database();
$db = $database->getConnection();

if ($db) {
    echo "Connected to database.\n";
    $query = "DESCRIBE messages";
    $stmt = $db->prepare($query);
    $stmt->execute();
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $col) {
        echo $col['Field'] . " (" . $col['Type'] . ")\n";
    }
} else {
    echo "Database connection failed.\n";
}
?>
