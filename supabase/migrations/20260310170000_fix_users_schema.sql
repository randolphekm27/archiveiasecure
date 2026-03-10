/*
  # Fix Users Schema Columns
  
  This migration correctly adds the `email` column specifically to the `public.users` table.
  The previous migration (20260310150000) failed to add `email` because it checked
  `information_schema.columns` without specifying `table_schema = 'public'`,
  which matched `auth.users.email` and skipped the addition.
*/

DO $$
BEGIN
  -- Add email column specifically to public.users
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.users ADD COLUMN email text;
  END IF;

  -- Ensure updated_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.users ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;

  -- Ensure is_active exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.users ADD COLUMN is_active boolean DEFAULT true;
  END IF;

  -- Ensure last_login exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE public.users ADD COLUMN last_login timestamptz;
  END IF;
END $$;
