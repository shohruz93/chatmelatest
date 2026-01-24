<?php
require_once __DIR__ . '/api/src/Database.php';

$db = Database::getInstance()->getConnection();
try {
    $stmt = $db->query("SELECT 1 FROM community_post_views LIMIT 1");
    echo "Table exists";
} catch (PDOException $e) {
    echo "Table missing";
}
