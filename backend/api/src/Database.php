<?php

require_once __DIR__ . '/Config.php';

class Database {
    public $conn;

    public function getConnection() {
        $this->conn = null;

        $host = Config::get('DB_HOST', 'localhost');
        $db_name = Config::get('DB_NAME', 'chatme_db');
        $username = Config::get('DB_USER', 'root');
        $password = Config::get('DB_PASS', '');

        try {
            $this->conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
            $this->conn->exec("set names utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
        }

        return $this->conn;
    }
}
