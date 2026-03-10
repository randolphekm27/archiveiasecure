/*
  # Add job_title to users table
  
  This migration adds a `job_title` column to the `users` table
  to allow users to define their role/position within the organization.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'job_title'
  ) THEN
    ALTER TABLE users ADD COLUMN job_title text;
  END IF;
END $$;
