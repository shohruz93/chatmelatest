<?php

require_once __DIR__ . '/Config.php';

class Database {
    private static $instance = null;
    public $conn;

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        if ($this->conn !== null) {
            return $this->conn;
        }

        $host = Config::get('DB_HOST', 'localhost');
        $db_name = Config::get('DB_NAME', 'chatme_db');
        $username = Config::get('DB_USER', 'root');
        $password = Config::get('DB_PASS', '');

        try {
            $this->conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
            $this->conn->exec("set names utf8mb4");
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
        }

        return $this->conn;
    }
}
