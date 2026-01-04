-- Migration: Convert TIMESTAMP columns to INT Unix Timestamps
-- This script converts all TIMESTAMP columns to INT (Unix timestamps in seconds)
-- Run this script to migrate your database schema

-- 1. Add new INT columns to users table
ALTER TABLE users 
ADD COLUMN created_at_unix INT DEFAULT NULL,
ADD COLUMN last_active_unix INT DEFAULT NULL;

-- 2. Add new INT columns to friendships table
ALTER TABLE friendships 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- 3. Add new INT columns to messages table
ALTER TABLE messages 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- 4. Add new INT columns to profile_views table
ALTER TABLE profile_views 
ADD COLUMN viewed_at_unix INT DEFAULT NULL;

-- 5. Add new INT columns to user_ratings table
ALTER TABLE user_ratings 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- 6. Add new INT columns to comment_replies table
ALTER TABLE comment_replies 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- 7. Add new INT columns to comment_likes table
ALTER TABLE comment_likes 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- 8. Add new INT columns to match_history table
ALTER TABLE match_history 
ADD COLUMN created_at_unix INT DEFAULT NULL,
ADD COLUMN ended_at_unix INT DEFAULT NULL;

-- 9. Add new INT columns to match_feedback table
ALTER TABLE match_feedback 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- 10. Add new INT columns to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN updated_at_unix INT DEFAULT NULL;

-- 11. Add new INT columns to user_activity table
ALTER TABLE user_activity 
ADD COLUMN created_at_unix INT DEFAULT NULL;

-- Now copy data from TIMESTAMP columns to INT columns (converting to Unix timestamps)
-- 1. users table
UPDATE users 
SET created_at_unix = UNIX_TIMESTAMP(created_at),
    last_active_unix = CASE WHEN last_active IS NOT NULL THEN UNIX_TIMESTAMP(last_active) ELSE NULL END
WHERE created_at IS NOT NULL;

-- 2. friendships table
UPDATE friendships 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;

-- 3. messages table
UPDATE messages 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;

-- 4. profile_views table
UPDATE profile_views 
SET viewed_at_unix = UNIX_TIMESTAMP(viewed_at)
WHERE viewed_at IS NOT NULL;

-- 5. user_ratings table
UPDATE user_ratings 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;

-- 6. comment_replies table
UPDATE comment_replies 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;

-- 7. comment_likes table
UPDATE comment_likes 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;

-- 8. match_history table
UPDATE match_history 
SET created_at_unix = UNIX_TIMESTAMP(created_at),
    ended_at_unix = CASE WHEN ended_at IS NOT NULL THEN UNIX_TIMESTAMP(ended_at) ELSE NULL END
WHERE created_at IS NOT NULL;

-- 9. match_feedback table
UPDATE match_feedback 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;

-- 10. user_preferences table
UPDATE user_preferences 
SET updated_at_unix = UNIX_TIMESTAMP(updated_at)
WHERE updated_at IS NOT NULL;

-- 11. user_activity table
UPDATE user_activity 
SET created_at_unix = UNIX_TIMESTAMP(created_at)
WHERE created_at IS NOT NULL;
