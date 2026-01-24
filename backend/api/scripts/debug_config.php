<?php
require_once __DIR__ . '/../src/Config.php';

echo "DB_HOST: " . Config::get('DB_HOST', 'default:localhost') . "\n";
echo "DB_NAME: " . Config::get('DB_NAME', 'default:chatme_db') . "\n";
echo "DB_USER: " . Config::get('DB_USER', 'default:root') . "\n";
// Don't print password for security, just check if it's set
echo "DB_PASS is set: " . (Config::get('DB_PASS') !== null ? 'Yes' : 'No') . "\n";

$dsn = "mysql:host=" . Config::get('DB_HOST', 'localhost') . ";dbname=" . Config::get('DB_NAME', 'chatme_db');
echo "DSN: " . $dsn . "\n";
