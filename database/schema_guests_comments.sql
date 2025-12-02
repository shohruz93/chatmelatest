-- Guests / Profile Views
CREATE TABLE IF NOT EXISTS profile_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    viewer_id INT NOT NULL,
    viewed_id INT NOT NULL,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (viewer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (viewed_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_view (viewer_id, viewed_id) -- Prevent duplicate entries for the same pair? Or maybe just update timestamp?
    -- Let's use ON DUPLICATE KEY UPDATE logic in the query, but for schema, a unique key helps.
    -- Actually, if we want a history, we shouldn't have unique key. But for "Guests" list, usually we just show the latest visit.
    -- Let's keep it unique for now to save space and just update the time.
);

-- Ensure user_ratings has created_at
-- ALTER TABLE user_ratings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
-- Check if user_ratings exists first. It was used in Profile.php but not in schema.sql (maybe it was in schema_update.sql? No, it wasn't).
-- Wait, Profile.php uses `user_ratings`. Let's check if it exists in the DB.
-- I'll add the CREATE TABLE for user_ratings just in case, or ALTER it.

CREATE TABLE IF NOT EXISTS user_ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rater_id INT NOT NULL,
    rated_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comment Replies
CREATE TABLE IF NOT EXISTS comment_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rating_id INT NOT NULL, -- The comment being replied to (from user_ratings)
    user_id INT NOT NULL, -- The replier
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rating_id) REFERENCES user_ratings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Comment Likes
CREATE TABLE IF NOT EXISTS comment_likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rating_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('like', 'dislike') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rating_id) REFERENCES user_ratings(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_like (rating_id, user_id)
);
