-- ================================================================
-- CHATME: New Language Learning Features Schema
-- Хусусиятҳои нав барои бартараф кардани камбудиҳои ҷаҳонӣ
-- ================================================================

-- ─── 1. WORD BANK (Луғати Шахсӣ) ─────────────────────────────
CREATE TABLE IF NOT EXISTS word_bank (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    word VARCHAR(255) NOT NULL,
    translation VARCHAR(255) DEFAULT NULL,
    context_sentence TEXT DEFAULT NULL COMMENT 'The sentence where the word was found',
    source_language VARCHAR(10) DEFAULT 'en',
    target_language VARCHAR(10) DEFAULT 'tg',
    room_id VARCHAR(100) DEFAULT NULL COMMENT 'Chat room where word was saved',
    times_reviewed INT DEFAULT 0,
    times_correct INT DEFAULT 0,
    next_review_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Spaced repetition next review',
    srs_level INT DEFAULT 0 COMMENT '0-6: Spaced Repetition System level',
    is_mastered TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_review (user_id, next_review_at),
    INDEX idx_user_lang (user_id, source_language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 2. STUDY BUDDY SYSTEM (Шарики Омӯзишӣ) ─────────────────
CREATE TABLE IF NOT EXISTS study_buddies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    partner_id INT NOT NULL,
    status ENUM('pending','active','paused','ended') DEFAULT 'pending',
    language_pair VARCHAR(20) NOT NULL COMMENT 'e.g., en-tg',
    requester_level VARCHAR(5) DEFAULT NULL,
    partner_level VARCHAR(5) DEFAULT NULL,
    weekly_goal_minutes INT DEFAULT 60 COMMENT 'Target practice minutes per week',
    requester_minutes_this_week INT DEFAULT 0,
    partner_minutes_this_week INT DEFAULT 0,
    last_checkin_at TIMESTAMP NULL,
    week_start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    streak_weeks INT DEFAULT 0 COMMENT 'Consecutive weeks both practiced',
    total_sessions INT DEFAULT 0,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (partner_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pair (requester_id, partner_id),
    INDEX idx_partner (partner_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Study Buddy check-ins log
CREATE TABLE IF NOT EXISTS buddy_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    buddy_id INT NOT NULL,
    user_id INT NOT NULL,
    duration_minutes INT DEFAULT 0,
    session_type ENUM('chat','voice','scenario','correction') DEFAULT 'chat',
    notes TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (buddy_id) REFERENCES study_buddies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 3. AVAILABILITY SCHEDULE (Вақти Озод) ───────────────────
CREATE TABLE IF NOT EXISTS user_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    -- Days of week availability (JSON array of hours 0-23)
    monday_hours VARCHAR(100) DEFAULT NULL COMMENT 'JSON: [9,10,11,18,19,20]',
    tuesday_hours VARCHAR(100) DEFAULT NULL,
    wednesday_hours VARCHAR(100) DEFAULT NULL,
    thursday_hours VARCHAR(100) DEFAULT NULL,
    friday_hours VARCHAR(100) DEFAULT NULL,
    saturday_hours VARCHAR(100) DEFAULT NULL,
    sunday_hours VARCHAR(100) DEFAULT NULL,
    prefer_async TINYINT(1) DEFAULT 0 COMMENT '1=prefer voice notes, 0=prefer live',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 4. SLANG OF THE WEEK (Сленги Ҳафта) ────────────────────
CREATE TABLE IF NOT EXISTS slang_of_week (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phrase VARCHAR(255) NOT NULL,
    meaning TEXT NOT NULL,
    example_sentence TEXT DEFAULT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    register ENUM('casual','slang','formal','vulgar') DEFAULT 'casual',
    region VARCHAR(100) DEFAULT 'General' COMMENT 'e.g., American, British, Australian',
    week_number INT NOT NULL COMMENT 'ISO week number',
    year INT NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_week_lang (week_number, year, language)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Track who has seen slang of the week
CREATE TABLE IF NOT EXISTS slang_seen (
    user_id INT NOT NULL,
    slang_id INT NOT NULL,
    seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    saved_to_bank TINYINT(1) DEFAULT 0,
    PRIMARY KEY (user_id, slang_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slang_id) REFERENCES slang_of_week(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 5. CHALLENGE CARDS (Асинхронии омӯзиш) ─────────────────
CREATE TABLE IF NOT EXISTS challenge_cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    room_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    challenge_type ENUM('write','speak','translate','find_word','describe_image') DEFAULT 'write',
    target_language VARCHAR(10) DEFAULT 'en',
    deadline_hours INT DEFAULT 24 COMMENT 'Hours to complete',
    status ENUM('pending','completed','expired') DEFAULT 'pending',
    response_text TEXT DEFAULT NULL,
    response_audio_url VARCHAR(500) DEFAULT NULL,
    xp_reward INT DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_receiver (receiver_id, status),
    INDEX idx_room (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 6. PRONUNCIATION FEEDBACK ────────────────────────────────
CREATE TABLE IF NOT EXISTS pronunciation_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id VARCHAR(100) NOT NULL,
    audio_message_id VARCHAR(100) NOT NULL COMMENT 'Message ID of the voice note',
    corrector_id INT NOT NULL,
    author_id INT NOT NULL,
    original_text TEXT DEFAULT NULL COMMENT 'What was said',
    feedback TEXT NOT NULL COMMENT 'What was wrong and how to fix',
    problematic_phonemes VARCHAR(255) DEFAULT NULL COMMENT 'e.g., "th" sound, "r" sound',
    xp_reward INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (corrector_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 7. WEEKLY PROGRESS SNAPSHOTS ────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_progress (
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
    fluency_delta FLOAT DEFAULT 0 COMMENT 'Change in fluency score this week',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_week (user_id, week_number, year),
    INDEX idx_user_week (user_id, year, week_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── 8. CULTURAL NOTES (to existing scenarios) ───────────────
ALTER TABLE learning_scenarios
    ADD COLUMN IF NOT EXISTS cultural_note TEXT DEFAULT NULL COMMENT 'Cultural context explanation',
    ADD COLUMN IF NOT EXISTS formality_level ENUM('formal','neutral','casual','slang') DEFAULT 'neutral',
    ADD COLUMN IF NOT EXISTS sample_phrases JSON DEFAULT NULL COMMENT 'Key phrases to use in this scenario';

-- ─── 9. USER PROFILE: add availability fields ─────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC',
    ADD COLUMN IF NOT EXISTS prefer_async TINYINT(1) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS buddy_score INT DEFAULT 50 COMMENT 'Reliability score as study buddy 0-100',
    ADD COLUMN IF NOT EXISTS fluency_score FLOAT DEFAULT 0 COMMENT 'Computed fluency score',
    ADD COLUMN IF NOT EXISTS last_weekly_report TIMESTAMP NULL;

-- ─── DEFAULT SLANG OF THE WEEK ────────────────────────────────
INSERT IGNORE INTO slang_of_week (phrase, meaning, example_sentence, language, register, region, week_number, year) VALUES
('Hit the books', 'Start studying seriously', 'I need to hit the books before the exam tomorrow.', 'en', 'casual', 'General', WEEK(NOW()), YEAR(NOW())),
('Burn the midnight oil', 'Work or study late into the night', 'She burned the midnight oil to finish her essay.', 'en', 'casual', 'General', WEEK(NOW())+1, YEAR(NOW())),
('On the tip of my tongue', 'Almost remember something', 'The word is on the tip of my tongue!', 'en', 'casual', 'General', WEEK(NOW())+2, YEAR(NOW())),
('Break a leg', 'Good luck (informal)', 'Break a leg on your presentation today!', 'en', 'casual', 'General', WEEK(NOW())+3, YEAR(NOW())),
('Touch base', 'Make contact / reconnect', 'Let\'s touch base next week about the project.', 'en', 'casual', 'Business', WEEK(NOW())+4, YEAR(NOW()));

-- ─── DEFAULT CHALLENGE CARD TEMPLATES ─────────────────────────
-- (These are stored as app content, not DB rows; skipping)

-- ─── CULTURAL NOTES for existing scenarios ────────────────────
UPDATE learning_scenarios SET
    cultural_note = 'In English-speaking airports, always say "sir" or "ma\'am" to officers. Be calm and confident — showing nervousness can cause delays. Have your documents ready before being asked.',
    formality_level = 'formal',
    sample_phrases = JSON_ARRAY('May I see your passport?','What is the purpose of your visit?','How long will you be staying?','I\'m here for tourism/business.')
WHERE title = 'Дар фурудгоҳ';

UPDATE learning_scenarios SET
    cultural_note = 'Hotel staff in Western countries expect polite but direct requests. Saying "please" and "thank you" is essential. Complaining too aggressively is considered rude.',
    formality_level = 'neutral',
    sample_phrases = JSON_ARRAY('I have a reservation under...','Could I have a room with...','Is breakfast included?','What time is check-out?')
WHERE title = 'Дар меҳмонхона';

UPDATE learning_scenarios SET
    cultural_note = 'In job interviews, firm handshakes (where applicable), eye contact, and specific examples from past experience are expected. Saying "I am a team player" without examples is weak.',
    formality_level = 'formal',
    sample_phrases = JSON_ARRAY('Tell me about yourself.','What are your strengths?','Where do you see yourself in 5 years?','Do you have any questions for us?')
WHERE title = 'Мусоҳибаи корӣ';

-- ─── NEW GAMIFICATION MISSIONS ────────────────────────────────
INSERT IGNORE INTO missions (title, description, reward_coins, xp_reward, type, condition_key, condition_value, icon) VALUES
('Луғатнавис', 'Имрӯз 5 калима нигоҳ дор', 25, 40, 'daily', 'word_saved', 5, 'bookmark'),
('Шарики вафодор', 'Бо Study Buddy-ат машқ кун', 50, 80, 'daily', 'buddy_session', 1, 'handshake'),
('Сленги рӯз', 'Сленги ҳафтаро бубин', 10, 15, 'daily', 'slang_viewed', 1, 'tag'),
('Чолишпазир', 'Як Challenge Card-ро иҷро кун', 40, 70, 'daily', 'challenge_completed', 1, 'extension'),
('Омӯзандаи ҳафта', 'Дар 7 рӯз пайдарпай фаъол бош', 100, 150, 'infinite', 'weekly_active', 7, 'emoji_events');
