<?php
require_once __DIR__ . '/src/Database.php';

try {
    $database = new Database();
    $db = $database->getConnection();
    
    $query = "CREATE TABLE IF NOT EXISTS flashcards (
        id VARCHAR(100) PRIMARY KEY,
        user_id INT NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        interval_days INT DEFAULT 0,
        repetition INT DEFAULT 0,
        efactor FLOAT DEFAULT 2.5,
        next_review_at BIGINT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_flash (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    
    $db->exec($query);
    echo "Flashcards table created successfully.\n";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
