/*
  # Fix Infinite Recursion in Users RLS Policy

  ## Problem
  The SELECT policy for users table creates infinite recursion because it queries
  the same table it's protecting: 
  `organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())`

  ## Solution
  1. Create a helper function that gets the user's organization_id using SECURITY DEFINER
  2. Update the SELECT policy to use this function instead of a recursive subquery
  3. This breaks the recursion cycle while maintaining security

  ## Security Note
  The SECURITY DEFINER function is safe because:
  - It only returns the organization_id for the current authenticated user
  - It doesn't expose any other user data
  - RLS is still enforced on all other operations
*/

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view own and organization users" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create a helper function that gets the current user's organization_id
-- This function runs with elevated privileges to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$;

-- Create new policy using the helper function
-- This avoids the recursive subquery problem
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    organization_id = public.get_user_organization_id()
  );
