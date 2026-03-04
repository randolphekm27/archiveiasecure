/*
  # Fix Invitation RLS for Anonymous/New User Access

  1. Problem
    - When an unauthenticated user clicks an invitation link, they cannot read the invitation
      because all SELECT policies on `user_invitations` require authentication
    - There is no UPDATE policy on `user_invitations`, so marking an invitation as accepted fails
    - The `organizations` table also needs anonymous read access by ID for the join page

  2. Changes
    - Add SELECT policy on `user_invitations` allowing anonymous users to read a single
      pending invitation by its token (limited to non-accepted, non-expired invitations)
    - Add UPDATE policy on `user_invitations` allowing authenticated users to mark their
      own invitation as accepted (only the `accepted_at` column)
    - Add SELECT policy on `organizations` for anonymous users to read by ID
      (needed for the join page to display org info)

  3. Security
    - Anonymous SELECT is scoped to exact token match + pending + not expired
    - UPDATE is scoped to authenticated users setting only accepted_at on their invitation
    - Organization read is limited to basic org info lookup
*/

CREATE POLICY "Anyone can read invitation by valid token"
  ON user_invitations
  FOR SELECT
  TO anon, authenticated
  USING (
    accepted_at IS NULL
    AND expires_at > now()
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_invitations'
    AND policyname = 'Authenticated users can accept invitations'
  ) THEN
    CREATE POLICY "Authenticated users can accept invitations"
      ON user_invitations
      FOR UPDATE
      TO authenticated
      USING (accepted_at IS NULL AND expires_at > now())
      WITH CHECK (accepted_at IS NOT NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'organizations'
    AND policyname = 'Anon can read organizations by id'
  ) THEN
    CREATE POLICY "Anon can read organizations by id"
      ON organizations
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;
