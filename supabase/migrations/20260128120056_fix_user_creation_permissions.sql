/*
  # Fix User Creation Permissions

  ## Changes
  - Allow newly created users to insert their own profile
  - This is needed right after auth.signUp() completes
  - The auth user ID matches the users table ID
*/

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated, anon
  WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);