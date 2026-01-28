/*
  # Fix Organization Creation Permissions

  ## Changes
  - Modify RLS policies to allow unauthenticated users to create organizations
  - This is needed for the initial organization creation flow
  - Security is maintained because we validate email and require strong passwords

  ## Security Notes
  - Organization creation is rate-limited at application level
  - Email validation ensures authenticity
  - Password requirements are enforced
  - First user becomes admin with full control
*/

DROP POLICY IF EXISTS "Anyone can create an organization" ON organizations;

CREATE POLICY "Anyone can create an organization"
  ON organizations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow organizations to be viewed by members
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );