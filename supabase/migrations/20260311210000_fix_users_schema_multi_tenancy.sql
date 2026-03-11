-- Migration: Fix Users Schema and Roles
-- Description: Removes global unique constraints on email/phone to allow multi-tenancy, and fixes role defaults.

-- 1. Remove global unique constraints that prevent the same person from being in multiple organizations
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_phone_key;

-- 2. Ensure multi-tenant uniqueness instead
-- We already have UNIQUE(organization_id, username) which is good.
-- We might want UNIQUE(organization_id, email) to prevent double-entry in the same org.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_organization_email_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_organization_email_key UNIQUE (organization_id, email);
    END IF;
END $$;

-- 3. Fix get_user_role to handle missing profiles more gracefully
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- If not authenticated, they are definitely just a reader
  IF auth.uid() IS NULL THEN
    RETURN 'reader';
  END IF;

  SELECT role INTO user_role
  FROM public.users
  WHERE id = auth.uid();
  
  -- Return the role, or 'reader' as a safe default
  RETURN COALESCE(user_role, 'reader');
END;
$$;

-- 4. Ensure get_user_organization_id is robust
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

-- 5. Strengthen the founder role trigger
CREATE OR REPLACE FUNCTION public.ensure_founder_role()
RETURNS TRIGGER AS $$
BEGIN
    -- If marked as founder, strictly enforce admin role
    IF NEW.is_founder IS TRUE THEN
        NEW.role := 'admin';
    END IF;
    
    -- If this is the FIRST user in an organization, they should probably be admin anyway
    -- But we'll rely on is_founder for now as it's cleaner.
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Re-create the trigger to be sure it's active
DROP TRIGGER IF EXISTS trigger_ensure_founder_role ON public.users;
CREATE TRIGGER trigger_ensure_founder_role
    BEFORE INSERT OR UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_founder_role();
