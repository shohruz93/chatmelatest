CREATE TABLE IF NOT EXISTS community_post_views (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    post_id INT NOT NULL,
    created_at INT NOT NULL,
    INDEX (user_id, post_id, created_at)
);
