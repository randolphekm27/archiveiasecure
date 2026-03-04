/*
  # Advanced Features Schema: Deletion Workflow, Activity Logs Enhancement, Secure Trash

  1. New Tables
    - `deletion_requests`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, FK to organizations)
      - `document_id` (uuid, FK to documents)
      - `requested_by` (uuid, FK to users)
      - `reason` (text) - reason for deletion request
      - `status` (text) - pending, approved, rejected, info_requested
      - `votes_required` (integer, default 3)
      - `created_at` (timestamptz)
      - `resolved_at` (timestamptz, nullable)

    - `deletion_votes`
      - `id` (uuid, primary key)
      - `deletion_request_id` (uuid, FK to deletion_requests)
      - `voter_id` (uuid, FK to users)
      - `vote` (text) - approve, reject, info_needed
      - `comment` (text, nullable)
      - `created_at` (timestamptz)

    - `secure_trash`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, FK to organizations)
      - `document_id` (uuid) - original document id (no FK since doc is deleted)
      - `document_data` (jsonb) - full snapshot of document at deletion time
      - `deletion_request_id` (uuid, FK to deletion_requests)
      - `deleted_by` (uuid, FK to users)
      - `expires_at` (timestamptz) - 30 days after deletion
      - `restored_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

  2. Modified Tables
    - `activity_logs` - add ip_address and user_agent columns
    - `user_invitations` - add personal_message and category_ids columns

  3. Security
    - RLS on all new tables
    - Policies using helper functions to avoid recursion
*/

-- 1. deletion_requests table
CREATE TABLE IF NOT EXISTS deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL REFERENCES documents(id),
  requested_by uuid NOT NULL REFERENCES users(id),
  reason text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  votes_required integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view org deletion requests"
  ON deletion_requests FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

CREATE POLICY "Admins can create deletion requests"
  ON deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
    AND requested_by = auth.uid()
  );

CREATE POLICY "Admins can update own org deletion requests"
  ON deletion_requests FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- 2. deletion_votes table
CREATE TABLE IF NOT EXISTS deletion_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deletion_request_id uuid NOT NULL REFERENCES deletion_requests(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL REFERENCES users(id),
  vote text NOT NULL CHECK (vote IN ('approve', 'reject', 'info_needed')),
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(deletion_request_id, voter_id)
);

ALTER TABLE deletion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view votes in their org"
  ON deletion_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deletion_requests dr
      WHERE dr.id = deletion_request_id
      AND dr.organization_id = get_user_organization_id()
    )
    AND get_user_role() = 'admin'
  );

CREATE POLICY "Admins can cast votes"
  ON deletion_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = auth.uid()
    AND get_user_role() = 'admin'
    AND EXISTS (
      SELECT 1 FROM deletion_requests dr
      WHERE dr.id = deletion_request_id
      AND dr.organization_id = get_user_organization_id()
      AND dr.requested_by != auth.uid()
    )
  );

-- 3. secure_trash table
CREATE TABLE IF NOT EXISTS secure_trash (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  document_id uuid NOT NULL,
  document_data jsonb NOT NULL,
  deletion_request_id uuid REFERENCES deletion_requests(id),
  deleted_by uuid NOT NULL REFERENCES users(id),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  restored_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE secure_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view org trash"
  ON secure_trash FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

CREATE POLICY "Admins can insert into trash"
  ON secure_trash FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

CREATE POLICY "Admins can update trash items"
  ON secure_trash FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND get_user_role() = 'admin'
  );

-- 4. Add columns to activity_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_logs' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE activity_logs ADD COLUMN ip_address text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_logs' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE activity_logs ADD COLUMN user_agent text;
  END IF;
END $$;

-- 5. Add columns to user_invitations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_invitations' AND column_name = 'personal_message'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN personal_message text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_invitations' AND column_name = 'category_ids'
  ) THEN
    ALTER TABLE user_invitations ADD COLUMN category_ids uuid[] DEFAULT '{}';
  END IF;
END $$;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_deletion_requests_org ON deletion_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_document ON deletion_requests(document_id);
CREATE INDEX IF NOT EXISTS idx_deletion_votes_request ON deletion_votes(deletion_request_id);
CREATE INDEX IF NOT EXISTS idx_secure_trash_org ON secure_trash(organization_id);
CREATE INDEX IF NOT EXISTS idx_secure_trash_expires ON secure_trash(expires_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
