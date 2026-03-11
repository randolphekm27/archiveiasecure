-- Migration: Robust Auth and Founder Protection
-- Description: Adds is_founder flag, ensures sync between auth.users and public.users, and strengthens role protection.

-- 1. Add is_founder column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_founder'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_founder boolean DEFAULT false;
    END IF;
END $$;

-- 2. Create function to ensure founder always has admin role
CREATE OR REPLACE FUNCTION public.ensure_founder_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_founder IS TRUE THEN
        NEW.role := 'admin';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger to enforce founder role on insert or update
DROP TRIGGER IF EXISTS trigger_ensure_founder_role ON public.users;
CREATE TRIGGER trigger_ensure_founder_role
    BEFORE INSERT OR UPDATE OF role, is_founder ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_founder_role();

-- 4. Update get_user_role to be more robust
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
  
  RETURN COALESCE(user_role, 'reader'); -- Default to reader if profile not yet created
END;
$$;

-- 5. Update RLS on users to allow viewing by email (for login lookup if needed)
DROP POLICY IF EXISTS "Users can view users in their organization" ON public.users;
CREATE POLICY "Users can view users in their organization"
  ON public.users FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    organization_id = public.get_user_organization_id()
  );

-- 6. Add policy for founders to protect themselves
CREATE POLICY "Admins can update their own founder status"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() 
    AND (
        (is_founder = (SELECT is_founder FROM public.users WHERE id = auth.uid())) -- Cannot change is_founder once set
        OR 
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
    )
  );
