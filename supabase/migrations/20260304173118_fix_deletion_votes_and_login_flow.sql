/*
  # Fix deletion votes RLS and login flow

  1. Modified Policies
    - `deletion_votes` INSERT: Remove the restriction preventing the requester from voting
      on their own deletion request. This is needed for single-admin organizations where
      the only admin must be able to approve their own requests.
    - Update `deletion_requests` UPDATE policy to include WITH CHECK

  2. Security
    - Still requires admin role to cast votes
    - Still requires voter_id = auth.uid() to prevent impersonation
    - Still validates the deletion request belongs to the user's organization
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deletion_votes' AND policyname = 'Admins can cast votes'
  ) THEN
    DROP POLICY "Admins can cast votes" ON deletion_votes;
  END IF;
END $$;

CREATE POLICY "Admins can cast votes"
  ON deletion_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM deletion_requests dr
      WHERE dr.id = deletion_votes.deletion_request_id
      AND dr.organization_id = get_user_organization_id()
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'deletion_requests' AND policyname = 'Admins can update own org deletion requests'
  ) THEN
    DROP POLICY "Admins can update own org deletion requests" ON deletion_requests;
  END IF;
END $$;

CREATE POLICY "Admins can update own org deletion requests"
  ON deletion_requests FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  )
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );
