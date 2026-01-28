/*
  # Fix RLS User Read Policy
  
  ## Problem
  The SELECT policy for users table prevents users from reading their own profile on first login.
  The policy checks if organization_id exists in the users table, but the user's profile doesn't exist yet.
  
  ## Solution
  Update the SELECT policy to allow users to read their own record without needing to check organization_id first.
  This enables proper bootstrapping on first login.
*/

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create new policy that allows users to view:
-- 1. Their own profile
-- 2. Other users in their organization (once profile exists)
CREATE POLICY "Users can view own and organization users"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );