-- Finalize: Switch from TIMESTAMP columns to INT Unix Timestamp columns
-- Run this after all data has been migrated and verified

-- STEP 1: Drop old TIMESTAMP columns that are no longer needed
-- We keep them initially for safety, but these queries remove them

-- ALTER TABLE users DROP COLUMN created_at;
-- ALTER TABLE users DROP COLUMN last_active;

-- ALTER TABLE friendships DROP COLUMN created_at;

-- ALTER TABLE messages DROP COLUMN created_at;

-- ALTER TABLE profile_views DROP COLUMN viewed_at;

-- ALTER TABLE user_ratings DROP COLUMN created_at;

-- ALTER TABLE comment_replies DROP COLUMN created_at;

-- ALTER TABLE comment_likes DROP COLUMN created_at;

-- ALTER TABLE match_history DROP COLUMN created_at;
-- ALTER TABLE match_history DROP COLUMN ended_at;

-- ALTER TABLE match_feedback DROP COLUMN created_at;

-- ALTER TABLE user_preferences DROP COLUMN updated_at;

-- ALTER TABLE user_activity DROP COLUMN created_at;


-- STEP 2: Rename the new Unix timestamp columns to replace the old ones
-- These operations will make the new columns the primary timestamp columns

-- RENAME users Unix columns
ALTER TABLE users CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;
ALTER TABLE users CHANGE COLUMN last_active_unix last_active INT DEFAULT NULL;

-- RENAME friendships Unix columns
ALTER TABLE friendships CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;

-- RENAME messages Unix columns
ALTER TABLE messages CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;

-- RENAME profile_views Unix columns
ALTER TABLE profile_views CHANGE COLUMN viewed_at_unix viewed_at INT DEFAULT NULL;

-- RENAME user_ratings Unix columns
ALTER TABLE user_ratings CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;

-- RENAME comment_replies Unix columns
ALTER TABLE comment_replies CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;

-- RENAME comment_likes Unix columns
ALTER TABLE comment_likes CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;

-- RENAME match_history Unix columns
ALTER TABLE match_history CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;
ALTER TABLE match_history CHANGE COLUMN ended_at_unix ended_at INT DEFAULT NULL;

-- RENAME match_feedback Unix columns
ALTER TABLE match_feedback CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;

-- RENAME user_preferences Unix columns
ALTER TABLE user_preferences CHANGE COLUMN updated_at_unix updated_at INT DEFAULT NULL;

-- RENAME user_activity Unix columns
ALTER TABLE user_activity CHANGE COLUMN created_at_unix created_at INT DEFAULT NULL;


-- STEP 3: Update default values to use UNIX_TIMESTAMP() for new INSERTs
-- Note: This requires triggers since MySQL doesn't support function defaults directly

-- Create trigger for users table
DROP TRIGGER IF EXISTS users_created_at_trigger;
DELIMITER //
CREATE TRIGGER users_created_at_trigger
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for friendships table
DROP TRIGGER IF EXISTS friendships_created_at_trigger;
DELIMITER //
CREATE TRIGGER friendships_created_at_trigger
BEFORE INSERT ON friendships
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for messages table
DROP TRIGGER IF EXISTS messages_created_at_trigger;
DELIMITER //
CREATE TRIGGER messages_created_at_trigger
BEFORE INSERT ON messages
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for profile_views table
DROP TRIGGER IF EXISTS profile_views_viewed_at_trigger;
DELIMITER //
CREATE TRIGGER profile_views_viewed_at_trigger
BEFORE INSERT ON profile_views
FOR EACH ROW
BEGIN
    IF NEW.viewed_at IS NULL THEN
        SET NEW.viewed_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for user_ratings table
DROP TRIGGER IF EXISTS user_ratings_created_at_trigger;
DELIMITER //
CREATE TRIGGER user_ratings_created_at_trigger
BEFORE INSERT ON user_ratings
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for comment_replies table
DROP TRIGGER IF EXISTS comment_replies_created_at_trigger;
DELIMITER //
CREATE TRIGGER comment_replies_created_at_trigger
BEFORE INSERT ON comment_replies
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for comment_likes table
DROP TRIGGER IF EXISTS comment_likes_created_at_trigger;
DELIMITER //
CREATE TRIGGER comment_likes_created_at_trigger
BEFORE INSERT ON comment_likes
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for match_history table
DROP TRIGGER IF EXISTS match_history_created_at_trigger;
DELIMITER //
CREATE TRIGGER match_history_created_at_trigger
BEFORE INSERT ON match_history
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for match_feedback table
DROP TRIGGER IF EXISTS match_feedback_created_at_trigger;
DELIMITER //
CREATE TRIGGER match_feedback_created_at_trigger
BEFORE INSERT ON match_feedback
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for user_preferences table
DROP TRIGGER IF EXISTS user_preferences_updated_at_trigger;
DELIMITER //
CREATE TRIGGER user_preferences_updated_at_trigger
BEFORE INSERT ON user_preferences
FOR EACH ROW
BEGIN
    IF NEW.updated_at IS NULL THEN
        SET NEW.updated_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;

-- Create trigger for user_activity table
DROP TRIGGER IF EXISTS user_activity_created_at_trigger;
DELIMITER //
CREATE TRIGGER user_activity_created_at_trigger
BEFORE INSERT ON user_activity
FOR EACH ROW
BEGIN
    IF NEW.created_at IS NULL THEN
        SET NEW.created_at = UNIX_TIMESTAMP();
    END IF;
END //
DELIMITER ;


-- STEP 4: Create helper functions for timezone conversion (optional)
-- These can be used in queries when you need to work with timestamps
DROP FUNCTION IF EXISTS unix_to_datetime;
DELIMITER //
CREATE FUNCTION unix_to_datetime(unix_timestamp INT)
RETURNS DATETIME
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN FROM_UNIXTIME(unix_timestamp);
END //
DELIMITER ;

DROP FUNCTION IF EXISTS datetime_to_unix;
DELIMITER //
CREATE FUNCTION datetime_to_unix(dt DATETIME)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN UNIX_TIMESTAMP(dt);
END //
DELIMITER ;
