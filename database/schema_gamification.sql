-- Add gamification columns to users table
-- We use a stored procedure to handle the "IF NOT EXISTS" logic for columns cleanly in MySQL < 8.0, 
-- or just use simple ALTER statements if we assume the columns don't exist yet. 
-- Since this is a schema file, we'll write the direct ALTERs. 
-- Users running this should handle "Duplicate column name" errors if they re-run it, 
-- or we can use a safe block.
-- Here is a safe implementation for adding columns:

SET @dbname = DATABASE();
SET @tablename = "users";
SET @columnname = "coins";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 1",
  "ALTER TABLE users ADD COLUMN coins INT DEFAULT 0 AFTER location, ADD COLUMN xp INT DEFAULT 0 AFTER coins"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create missions table
CREATE TABLE IF NOT EXISTS missions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    reward_coins INT DEFAULT 0,
    xp_reward INT DEFAULT 0,
    type VARCHAR(50) NOT NULL COMMENT 'daily, one_time, infinite',
    condition_key VARCHAR(100) NOT NULL COMMENT 'e.g., send_message, translate_text',
    condition_value INT DEFAULT 1 COMMENT 'Required count to complete',
    icon VARCHAR(100) DEFAULT 'star'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create user_missions table
CREATE TABLE IF NOT EXISTS user_missions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    mission_id INT NOT NULL,
    status ENUM('active', 'completed', 'claimed') DEFAULT 'active',
    progress INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert Default Missions (Use INSERT IGNORE to prevent duplicates on re-run)
INSERT IGNORE INTO missions (title, description, reward_coins, xp_reward, type, condition_key, condition_value, icon) VALUES 
('Daily Login', 'Log in to the app once a day.', 10, 5, 'daily', 'login', 1, 'login'),
('Say Hello', 'Send your first message today.', 20, 10, 'daily', 'send_message', 1, 'chat'),
('Polyglot', 'Use the translation feature 5 times.', 50, 25, 'daily', 'translate_message', 5, 'translate'),
('Social Butterfly', 'Chat with 3 different people.', 100, 50, 'daily', 'chat_unique_users', 3, 'group');
