<?php
require_once __DIR__ . '/src/Database.php';

$database = new Database();
$db = $database->getConnection();

if ($db === null) {
    die("Database connection failed.\n");
}

$sql = "CREATE TABLE IF NOT EXISTS `app_versions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `platform` enum('android','ios') NOT NULL,
  `version` varchar(20) NOT NULL,
  `version_code` int(11) NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `release_notes` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;";

try {
    $db->exec($sql);
    echo "Table 'app_versions' created successfully (or already exists).\n";
} catch (PDOException $e) {
    echo "Error creating table: " . $e->getMessage() . "\n";
}
