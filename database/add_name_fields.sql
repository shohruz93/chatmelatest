-- Migration: Add first_name and family_name fields to users table
-- Date: 2025-12-04
-- Description: Adds separate first and last name fields from Google OAuth

ALTER TABLE users 
ADD COLUMN first_name VARCHAR(255) NULL AFTER name,
ADD COLUMN family_name VARCHAR(255) NULL AFTER first_name;

-- Update existing records to populate first_name from name field
-- This is a best-effort migration for existing users
UPDATE users 
SET first_name = SUBSTRING_INDEX(name, ' ', 1),
    family_name = SUBSTRING_INDEX(name, ' ', -1)
WHERE first_name IS NULL AND name IS NOT NULL;
