-- Add category_ids for granular access control
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'category_ids'
  ) THEN
    ALTER TABLE users ADD COLUMN category_ids uuid[] DEFAULT '{}';
  END IF;
END $$;
