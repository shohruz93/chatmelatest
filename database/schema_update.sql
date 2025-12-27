-- Advanced Matchmaking System - Database Schema Updates

-- Add new columns to users table for enhanced matching
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS age INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rating_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_ratings INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS profile_completeness INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_matches INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status ENUM('active', 'banned') DEFAULT 'active';

-- Create match_history table to track all matches
CREATE TABLE IF NOT EXISTS match_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    compatibility_score DECIMAL(5,2) DEFAULT 0.00,
    match_reason TEXT,
    status ENUM('pending', 'accepted', 'rejected', 'completed', 'abandoned') DEFAULT 'pending',
    chat_duration INT DEFAULT 0,
    messages_exchanged INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user1_created (user1_id, created_at),
    INDEX idx_user2_created (user2_id, created_at),
    INDEX idx_status (status)
);

-- Create user_preferences table for detailed matching preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT PRIMARY KEY,
    preferred_gender VARCHAR(20) DEFAULT 'any',
    preferred_location VARCHAR(100) DEFAULT 'any',
    preferred_age_min INT DEFAULT 18,
    preferred_age_max INT DEFAULT 100,
    online_only BOOLEAN DEFAULT FALSE,
    min_rating DECIMAL(3,2) DEFAULT 0.00,
    avoid_recent_matches_hours INT DEFAULT 24,
    interest_weight DECIMAL(3,2) DEFAULT 0.30,
    language_weight DECIMAL(3,2) DEFAULT 0.25,
    location_weight DECIMAL(3,2) DEFAULT 0.15,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create match_feedback table for rating matches
CREATE TABLE IF NOT EXISTS match_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_history_id INT NOT NULL,
    rater_id INT NOT NULL,
    rated_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    feedback_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (match_history_id) REFERENCES match_history(id) ON DELETE CASCADE,
    FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_rated_user (rated_id),
    UNIQUE KEY unique_feedback (match_history_id, rater_id)
);

-- Create user_activity table for tracking engagement
CREATE TABLE IF NOT EXISTS user_activity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('login', 'search', 'match_found', 'chat_started', 'chat_ended', 'message_sent') NOT NULL,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_activity (user_id, created_at),
    INDEX idx_activity_type (activity_type, created_at)
);

-- Add room_id to messages table if not exists
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS room_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS `type` VARCHAR(20) NOT NULL DEFAULT 'text',
ADD INDEX IF NOT EXISTS idx_room_id (room_id),
ADD INDEX IF NOT EXISTS idx_receiver_unread (receiver_id, is_read);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);
CREATE INDEX IF NOT EXISTS idx_users_location ON users(location);
CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating_score);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active);
CREATE INDEX IF NOT EXISTS idx_users_age ON users(age);
