<?php
require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

try {
    // Add is_read to messages
    $check = $db->query("SHOW COLUMNS FROM messages LIKE 'is_read'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE messages ADD COLUMN is_read BOOLEAN DEFAULT FALSE");
        echo "Added is_read column to messages table.\n";
    } else {
        echo "is_read column already exists in messages table.\n";
    }

    // Create user_ratings table
    $sql = "CREATE TABLE IF NOT EXISTS user_ratings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        rater_id INT NOT NULL,
        rated_id INT NOT NULL,
        rating INT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (rater_id) REFERENCES users(id),
        FOREIGN KEY (rated_id) REFERENCES users(id)
    )";
    $db->exec($sql);
    echo "Created user_ratings table (if not exists).\n";

    // Add gender to users table
    $check = $db->query("SHOW COLUMNS FROM users LIKE 'gender'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN gender VARCHAR(50) DEFAULT NULL");
        echo "Added gender column to users table.\n";
    } else {
        echo "gender column already exists in users table.\n";
    }

    // Add location to users table
    $check = $db->query("SHOW COLUMNS FROM users LIKE 'location'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN location VARCHAR(100) DEFAULT NULL");
        echo "Added location column to users table.\n";
    } else {
        echo "location column already exists in users table.\n";
    }

    // Ensure messages table has proper structure for conversation history
    $check = $db->query("SHOW COLUMNS FROM messages LIKE 'room_id'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE messages ADD COLUMN room_id VARCHAR(255) DEFAULT NULL");
        echo "Added room_id column to messages table.\n";
    } else {
        echo "room_id column already exists in messages table.\n";
    }

    // Add receiver_id to messages table (nullable foreign key)
    $check = $db->query("SHOW COLUMNS FROM messages LIKE 'receiver_id'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE messages ADD COLUMN receiver_id INT DEFAULT NULL");
        echo "Added receiver_id column to messages table.\n";
        // Drop existing foreign key if exists
        $fkCheck = $db->query("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'messages' AND COLUMN_NAME = 'receiver_id' AND REFERENCED_TABLE_NAME IS NOT NULL");
        if ($fkCheck->rowCount() > 0) {
            $fkName = $fkCheck->fetchColumn();
            $db->exec("ALTER TABLE messages DROP FOREIGN KEY `$fkName`");
            echo "Dropped existing foreign key $fkName.\n";
        }
        // Add foreign key with ON DELETE SET NULL
        $db->exec("ALTER TABLE messages ADD CONSTRAINT fk_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL");
        echo "Added foreign key constraint for receiver_id with ON DELETE SET NULL.\n";
    } else {
        echo "receiver_id column already exists in messages table.\n";
    }

    // Create chat_requests table
    $sql = "CREATE TABLE IF NOT EXISTS chat_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        from_user_id INT NOT NULL,
        to_user_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        room_id VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    $db->exec($sql);
    echo "Created chat_requests table (if not exists).\n";

    // Add created_at to messages table if not exists
    $check = $db->query("SHOW COLUMNS FROM messages LIKE 'created_at'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE messages ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        echo "Added created_at column to messages table.\n";
    } else {
        echo "created_at column already exists in messages table.\n";
    }


    // Add last_active to users table
    $check = $db->query("SHOW COLUMNS FROM users LIKE 'last_active'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN last_active TIMESTAMP NULL DEFAULT NULL");
        echo "Added last_active column to users table.\n";
        // Initialize last_active for existing users based on their created_at
        $db->exec("UPDATE users SET last_active = created_at WHERE last_active IS NULL");
        echo "Initialized last_active for existing users.\n";
    } else {
        echo "last_active column already exists in users table.\n";
    }

    // Create blocked_users table
    $sql = "CREATE TABLE IF NOT EXISTS blocked_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        blocker_id INT NOT NULL,
        blocked_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_block (blocker_id, blocked_id),
        FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
    )";
    $db->exec($sql);
    echo "Created blocked_users table (if not exists).\n";

    echo "\nSchema update completed successfully!\n";
} catch (PDOException $e) {
    echo "Error updating schema: " . $e->getMessage() . "\n";
}
?>
