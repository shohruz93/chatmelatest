<?php
require_once __DIR__ . '/src/config/database.php';

try {
    $db = Database::getInstance()->getConnection();
    
    $queries = [
        "CREATE TABLE IF NOT EXISTS word_bank (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            word VARCHAR(255) NOT NULL,
            translation VARCHAR(255),
            context_sentence TEXT,
            source_language VARCHAR(10),
            target_language VARCHAR(10),
            srs_level INT DEFAULT 0,
            times_reviewed INT DEFAULT 0,
            times_correct INT DEFAULT 0,
            is_mastered TINYINT(1) DEFAULT 0,
            next_review_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            room_id VARCHAR(100) NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",

        "CREATE TABLE IF NOT EXISTS study_buddies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            buddy_user_id INT NOT NULL,
            status VARCHAR(50) DEFAULT 'active',
            language_pair VARCHAR(50),
            weekly_goal_minutes INT DEFAULT 0,
            my_minutes INT DEFAULT 0,
            partner_minutes INT DEFAULT 0,
            streak_weeks INT DEFAULT 0,
            total_sessions INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (buddy_user_id) REFERENCES users(id) ON DELETE CASCADE
        )",

        "CREATE TABLE IF NOT EXISTS buddy_requests (
            id INT AUTO_INCREMENT PRIMARY KEY,
            requester_id INT NOT NULL,
            receiver_id INT NOT NULL,
            language_pair VARCHAR(50),
            language_level VARCHAR(20),
            weekly_goal_minutes INT DEFAULT 0,
            status VARCHAR(50) DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )",

        "CREATE TABLE IF NOT EXISTS user_availability (
            user_id INT PRIMARY KEY,
            timezone VARCHAR(100) DEFAULT 'UTC',
            prefer_async TINYINT(1) DEFAULT 0,
            monday_hours JSON,
            tuesday_hours JSON,
            wednesday_hours JSON,
            thursday_hours JSON,
            friday_hours JSON,
            saturday_hours JSON,
            sunday_hours JSON,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",

        "CREATE TABLE IF NOT EXISTS weekly_reports (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            week_number INT NOT NULL,
            year INT NOT NULL,
            messages_sent INT DEFAULT 0,
            corrections_given INT DEFAULT 0,
            corrections_received INT DEFAULT 0,
            scenarios_completed INT DEFAULT 0,
            words_saved INT DEFAULT 0,
            words_reviewed INT DEFAULT 0,
            buddy_sessions INT DEFAULT 0,
            xp_earned INT DEFAULT 0,
            streak_days INT DEFAULT 0,
            fluency_score INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )",

        "CREATE TABLE IF NOT EXISTS slang_of_week (
            id INT AUTO_INCREMENT PRIMARY KEY,
            phrase VARCHAR(255) NOT NULL,
            meaning TEXT NOT NULL,
            example_sentence TEXT,
            language VARCHAR(10),
            register VARCHAR(50),
            region VARCHAR(100),
            active_week INT,
            active_year INT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",

        "CREATE TABLE IF NOT EXISTS user_slang (
            user_id INT NOT NULL,
            slang_id INT NOT NULL,
            already_seen TINYINT(1) DEFAULT 0,
            saved_to_bank TINYINT(1) DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(user_id, slang_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (slang_id) REFERENCES slang_of_week(id) ON DELETE CASCADE
        )",

        "CREATE TABLE IF NOT EXISTS challenge_cards (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sender_id INT NOT NULL,
            receiver_id INT NOT NULL,
            room_id VARCHAR(100),
            title VARCHAR(255) NOT NULL,
            description TEXT,
            challenge_type VARCHAR(50),
            target_language VARCHAR(10),
            deadline_hours INT DEFAULT 24,
            status VARCHAR(50) DEFAULT 'pending',
            response_text TEXT,
            xp_reward INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )"
    ];

    foreach ($queries as $query) {
        $db->exec($query);
    }
    
    echo "Migration completed successfully.\n";
} catch (Exception $e) {
    echo "Error running migration: " . $e->getMessage() . "\n";
}
