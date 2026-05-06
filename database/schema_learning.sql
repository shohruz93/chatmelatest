-- ================================================================
-- CHATME: Learning Features Schema
-- Барои бартараф кардани камбудиҳои барномаҳои омӯзиши забон
-- ================================================================

-- 1. Сатҳи забони корбар (A1, A2, B1, B2, C1, C2)
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS language_level VARCHAR(5) DEFAULT 'A1' COMMENT 'CEFR level: A1,A2,B1,B2,C1,C2',
    ADD COLUMN IF NOT EXISTS learning_goal VARCHAR(50) DEFAULT NULL COMMENT 'ielts,travel,business,casual,academic',
    ADD COLUMN IF NOT EXISTS streak_days INT DEFAULT 0 COMMENT 'Consecutive active days',
    ADD COLUMN IF NOT EXISTS streak_last_date DATE DEFAULT NULL COMMENT 'Last date streak was updated',
    ADD COLUMN IF NOT EXISTS words_learned INT DEFAULT 0 COMMENT 'Total vocabulary learned',
    ADD COLUMN IF NOT EXISTS corrections_given INT DEFAULT 0 COMMENT 'How many corrections given to others',
    ADD COLUMN IF NOT EXISTS corrections_received INT DEFAULT 0 COMMENT 'How many corrections received',
    ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 50 COMMENT 'Reputation score 0-100 (anti-spam/dating)',
    ADD COLUMN IF NOT EXISTS profile_blur TINYINT(1) DEFAULT 0 COMMENT 'Blur profile photo until X messages';

-- 2. Мақсадҳои омӯзишӣ (Learning Goals)
CREATE TABLE IF NOT EXISTS learning_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    goal_type VARCHAR(50) NOT NULL COMMENT 'ielts, travel, business, casual, academic, immigration',
    target_language VARCHAR(10) NOT NULL COMMENT 'e.g., en, ru, zh',
    target_level VARCHAR(5) DEFAULT 'B2' COMMENT 'Target CEFR level',
    current_level VARCHAR(5) DEFAULT 'A1' COMMENT 'Current CEFR level',
    deadline_date DATE DEFAULT NULL COMMENT 'Target completion date',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_active_goal (user_id, target_language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Сенарияҳои омӯзишӣ (Scenario-based Learning)
CREATE TABLE IF NOT EXISTS learning_scenarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_en VARCHAR(255) DEFAULT NULL,
    description TEXT NOT NULL,
    situation TEXT NOT NULL COMMENT 'Full scenario context for users',
    role_a VARCHAR(100) NOT NULL COMMENT 'e.g., Airport Officer',
    role_b VARCHAR(100) NOT NULL COMMENT 'e.g., Tourist',
    language VARCHAR(10) NOT NULL DEFAULT 'en' COMMENT 'Target language for practice',
    level VARCHAR(5) DEFAULT 'A2' COMMENT 'CEFR level',
    goal_type VARCHAR(50) DEFAULT 'all' COMMENT 'travel,business,casual,etc.',
    icon VARCHAR(50) DEFAULT 'travel_explore',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Сессияи сенарио дар чат
CREATE TABLE IF NOT EXISTS chat_scenarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    scenario_id INT NOT NULL,
    user_a_id INT NOT NULL COMMENT 'User playing role A',
    user_b_id INT NOT NULL COMMENT 'User playing role B',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    status ENUM('active','completed','abandoned') DEFAULT 'active',
    FOREIGN KEY (scenario_id) REFERENCES learning_scenarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Рекорди ислоҳи хатогиҳо (Correction History)
CREATE TABLE IF NOT EXISTS message_corrections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    original_message_id VARCHAR(100) NOT NULL COMMENT 'Socket message ID',
    room_id VARCHAR(100) NOT NULL,
    corrector_id INT NOT NULL COMMENT 'Who corrected',
    author_id INT NOT NULL COMMENT 'Whose message was corrected',
    original_text TEXT NOT NULL,
    corrected_text TEXT NOT NULL,
    explanation TEXT DEFAULT NULL COMMENT 'Why the correction was made',
    was_accepted TINYINT(1) DEFAULT NULL COMMENT '1=accepted, 0=ignored',
    xp_rewarded INT DEFAULT 5 COMMENT 'XP given to corrector',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corrector_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_room (room_id),
    INDEX idx_corrector (corrector_id),
    INDEX idx_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Статистикаи омӯзиш (Learning Progress)
CREATE TABLE IF NOT EXISTS learning_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    total_messages_sent INT DEFAULT 0,
    total_corrections_made INT DEFAULT 0,
    total_corrections_received INT DEFAULT 0,
    total_scenarios_completed INT DEFAULT 0,
    total_streak_days INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_active_date DATE DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Anti-spam/Dating: Trust events log
CREATE TABLE IF NOT EXISTS trust_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    event_type VARCHAR(50) NOT NULL COMMENT 'correction_given, reported_spam, helpful_rating, etc.',
    delta INT NOT NULL COMMENT 'Change to trust score (+/-)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================================
-- Сценарияҳои пешфарз (Default Scenarios)
-- ================================================================
INSERT IGNORE INTO learning_scenarios 
    (title, title_en, description, situation, role_a, role_b, language, level, goal_type, icon) 
VALUES
-- Travel scenarios
('Дар фурудгоҳ', 'At the Airport',
 'Машқи гузаштани назорати гумрук', 
 'Шумо ба сафар меравед. Корманди гумрук ҳуҷҷатҳоятонро тафтиш мекунад. Ба саволҳои ӯ ҷавоб диҳед.',
 'Airport Officer 🛂', 'Traveler 🧳', 'en', 'A2', 'travel', 'flight'),

('Дар меҳмонхона', 'At the Hotel',
 'Машқи гирифтани хона дар меҳмонхона',
 'Шумо ба меҳмонхона расидед. Рецепционист ба шумо кӯмак мекунад. Хонаро гиред ва саволҳоро диҳед.',
 'Hotel Receptionist 🏨', 'Guest 🧳', 'en', 'A2', 'travel', 'hotel'),

('Дар тарабхона', 'At the Restaurant',
 'Машқи фармоиш додан дар тарабхона',
 'Шумо дар тарабхона нишастаед. Гарсон меояд. Хӯрокро фармоиш диҳед.',
 'Waiter 🍽️', 'Customer 😋', 'en', 'A1', 'travel', 'restaurant'),

-- Business scenarios
('Мусоҳибаи корӣ', 'Job Interview',
 'Машқи мусоҳибаи кор ба забони англисӣ',
 'Шумо барои кор ариза кардед. Мусоҳибаи кор ин аст. Ба саволҳои менеҷер ҷавоб диҳед.',
 'HR Manager 👔', 'Job Applicant 📄', 'en', 'B1', 'business', 'work'),

('Вохӯрии тиҷоратӣ', 'Business Meeting',
 'Машқи вохӯрии расмии тиҷоратӣ',
 'Ду ширкат мехоҳанд ҳамкорӣ кунанд. Шароитҳоро муҳокима кунед.',
 'Company Representative A 🏢', 'Company Representative B 🤝', 'en', 'B2', 'business', 'briefcase'),

-- Casual scenarios
('Дӯсти нав', 'Making a New Friend',
 'Машқи шиносоии ғайрирасмӣ',
 'Шумо дар партия ҳастед. Як нафари нав омад. Бо ӯ шинос шавед ва сӯҳбат кунед.',
 'Party Host 🎉', 'New Guest 👋', 'en', 'A1', 'casual', 'emoji_people'),

('Дар мағоза', 'Shopping',
 'Машқи харид кардан',
 'Шумо дар мағоза ҳастед. Фурӯшанда ба шумо кӯмак мекунад. Ба он чизе, ки мехоҳед, ёрдам гиред.',
 'Shop Assistant 🛍️', 'Customer 🛒', 'en', 'A1', 'casual', 'shopping_bag'),

-- Academic scenarios
('Назди духтур', 'Doctor Visit',
 'Машқи ташриф ба духтур',
 'Шумо бемор ҳастед ва ба духтур рафтед. Аломатҳоятонро тавсиф кунед.',
 'Doctor 👨‍⚕️', 'Patient 🤒', 'en', 'B1', 'academic', 'medical_services'),

('Дар банк', 'At the Bank',
 'Машқи хизматрасонии бонкӣ',
 'Шумо ба банк омадед. Корманди банк ба шумо кӯмак мекунад. Хизматро гиред.',
 'Bank Teller 🏦', 'Customer 💳', 'en', 'A2', 'business', 'account_balance');

-- ================================================================
-- Миссияҳои нав барои омӯзиш
-- ================================================================
INSERT IGNORE INTO missions (title, description, reward_coins, xp_reward, type, condition_key, condition_value, icon) VALUES 
('Муаллими хуб', 'Ба ҳамсӯҳбатат 3 ислоҳ дод', 30, 50, 'daily', 'correction_given', 3, 'school'),
('Донишҷӯи хуб', 'Ислоҳи хатогиятро қабул кар', 20, 30, 'daily', 'correction_accepted', 1, 'menu_book'),
('Сценариист', 'Як сенарияро пурра кун', 50, 100, 'daily', 'scenario_completed', 1, 'theater_comedy'),
('Сатҳ боло', 'Ба сессияи омӯзишӣ ширкат кун', 15, 25, 'daily', 'learning_session', 1, 'trending_up');
