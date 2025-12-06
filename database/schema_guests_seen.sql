-- Add 'seen' column to profile_views table to track new visitors
ALTER TABLE profile_views ADD COLUMN seen TINYINT(1) DEFAULT 0;
