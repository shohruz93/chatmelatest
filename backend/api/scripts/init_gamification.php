<?php
require_once __DIR__ . '/../src/Config.php';
require_once __DIR__ . '/../src/Database.php';

$database = new Database();
$db = $database->getConnection();

if (!$db) {
    echo "Config values:\n";
    echo "DB_HOST: " . Config::get('DB_HOST') . "\n";
    echo "DB_NAME: " . Config::get('DB_NAME') . "\n";
    echo "DB_USER: " . Config::get('DB_USER') . "\n";
    die("Could not establish database connection using Database class.\n");
}

try {
    echo "Connected to database: " . Config::get('DB_NAME') . "\n";
    
    // 1. Add coins and xp to users table
    $check = $db->query("SHOW COLUMNS FROM users LIKE 'coins'");
    if ($check->rowCount() == 0) {
        $db->exec("ALTER TABLE users ADD COLUMN coins INT DEFAULT 0, ADD COLUMN xp INT DEFAULT 0");
        echo "Added coins and xp columns to users table.\n";
    } else {
        echo "Currency columns already exist.\n";
    }

    // 2. Create missions table
    echo "Creating missions table...\n";
    $sql = "CREATE TABLE IF NOT EXISTS missions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        reward_coins INT DEFAULT 0,
        xp_reward INT DEFAULT 0,
        type ENUM('daily', 'one_time', 'infinite') DEFAULT 'daily',
        condition_key VARCHAR(100) NOT NULL,
        condition_value INT NOT NULL,
        icon VARCHAR(50) DEFAULT 'star',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $db->exec($sql);

    // 3. Create user_missions table
    echo "Creating user_missions table...\n";
    $sql = "CREATE TABLE IF NOT EXISTS user_missions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        mission_id INT NOT NULL,
        progress INT DEFAULT 0,
        status ENUM('active', 'completed', 'claimed') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL DEFAULT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    $db->exec($sql);

    // 4. Seed default missions
    $missions = [
        [
            'title' => 'Social Butterfly',
            'description' => 'Send 5 messages to other users',
            'reward_coins' => 50,
            'xp_reward' => 100,
            'type' => 'daily',
            'condition_key' => 'send_message',
            'condition_value' => 5,
            'icon' => 'message'
        ],
        [
            'title' => 'Profile Explorer',
            'description' => 'Visit 3 different profiles',
            'reward_coins' => 30,
            'xp_reward' => 60,
            'type' => 'daily',
            'condition_key' => 'view_profile',
            'condition_value' => 3,
            'icon' => 'visibility'
        ],
        [
            'title' => 'Active Commenter',
            'description' => 'Post 2 comments on profiles',
            'reward_coins' => 40,
            'xp_reward' => 80,
            'type' => 'daily',
            'condition_key' => 'add_comment',
            'condition_value' => 2,
            'icon' => 'comment'
        ],
        [
            'title' => 'Top Rated',
            'description' => 'Rate 3 users on their profiles',
            'reward_coins' => 30,
            'xp_reward' => 60,
            'type' => 'daily',
            'condition_key' => 'add_rating',
            'condition_value' => 3,
            'icon' => 'star'
        ],
        [
            'title' => 'The Appreciator',
            'description' => 'Like 5 comments',
            'reward_coins' => 20,
            'xp_reward' => 40,
            'type' => 'daily',
            'condition_key' => 'like_comment',
            'condition_value' => 5,
            'icon' => 'thumb_up'
        ]
    ];

    foreach ($missions as $m) {
        $check = $db->prepare("SELECT id FROM missions WHERE condition_key = ? AND title = ?");
        $check->execute([$m['condition_key'], $m['title']]);
        if ($check->rowCount() == 0) {
            $stmt = $db->prepare("INSERT INTO missions (title, description, reward_coins, xp_reward, type, condition_key, condition_value, icon) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $m['title'],
                $m['description'],
                $m['reward_coins'],
                $m['xp_reward'],
                $m['type'],
                $m['condition_key'],
                $m['condition_value'],
                $m['icon']
            ]);
            echo "Seeded mission: {$m['title']}\n";
        }
    }

    echo "Gamification initialization completed successfully!\n";
} catch (PDOException $e) {
    echo "Error execution: " . $e->getMessage() . "\n";
}
