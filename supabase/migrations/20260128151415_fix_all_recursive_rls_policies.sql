/*
  # Fix All Recursive RLS Policies

  ## Problem
  Multiple RLS policies create infinite recursion by querying the users table
  within their conditions. This affects:
  - organizations table policies
  - categories table policies
  - documents table policies
  - activity_logs table policies
  - users table policies that check roles

  ## Solution
  1. Create helper functions to get user's organization_id and role
  2. Update all policies to use these functions instead of recursive subqueries
  3. This eliminates all recursion while maintaining security

  ## Security
  All SECURITY DEFINER functions only expose data for the current authenticated user.
*/

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- ============================================================================
-- UPDATE ORGANIZATIONS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (id = public.get_user_organization_id());

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

-- ============================================================================
-- UPDATE USERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Admins can insert users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

CREATE POLICY "Admins can insert users in their organization"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

-- ============================================================================
-- UPDATE CATEGORIES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view categories in their organization" ON categories;
DROP POLICY IF EXISTS "Admins can manage categories in their organization" ON categories;

CREATE POLICY "Users can view categories in their organization"
  ON categories FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Admins can insert categories in their organization"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "Admins can update categories in their organization"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

CREATE POLICY "Admins can delete categories in their organization"
  ON categories FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

-- ============================================================================
-- UPDATE DOCUMENTS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view documents in their organization" ON documents;
DROP POLICY IF EXISTS "Editors and admins can insert documents" ON documents;
DROP POLICY IF EXISTS "Editors and admins can update documents in their organization" ON documents;
DROP POLICY IF EXISTS "Admins can delete documents in their organization" ON documents;

CREATE POLICY "Users can view documents in their organization"
  ON documents FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Editors and admins can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'editor')
  );

CREATE POLICY "Editors and admins can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'editor')
  )
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() IN ('admin', 'editor')
  );

CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (
    organization_id = public.get_user_organization_id()
    AND public.get_user_role() = 'admin'
  );

-- ============================================================================
-- UPDATE ACTIVITY_LOGS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs for their organization" ON activity_logs;

CREATE POLICY "Users can view activity logs in their organization"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_user_organization_id()
    AND user_id = auth.uid()
  );
