/*
  # Fix Organization Read Permissions

  ## Changes
  - Allow anonymous users to read organizations (to check if code exists)
  - Allow authenticated users to read their own organization
  - This enables the organization creation flow
*/

DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

-- Allow anonymous users to read organization codes
CREATE POLICY "Anyone can read organizations"
  ON organizations FOR SELECT
  TO anon, authenticated
  USING (true);