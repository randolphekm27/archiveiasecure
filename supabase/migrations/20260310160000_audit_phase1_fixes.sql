/*
  # Phase 1 Audit Corrections
  
  1. Activity Logs RLS Fix
     - Drop old insecure policy
     - Create new policy restricting read access to admin or own logs
     
  2. Deletion Workflow Secure Triggers
     - Function to process votes and auto-resolve deletion requests
     - Trigger on deletion_votes table
     
  3. Secure Trash Auto-cleanup
     - Enable pg_cron extension
     - Schedule daily cleanup job
*/

-- 1. Fix Activity Logs RLS
DROP POLICY IF EXISTS "Users can view activity logs in their organization" ON activity_logs;

CREATE POLICY "Activity logs visibility"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND (
      get_user_role() = 'admin'
      OR user_id = auth.uid()
    )
  );

-- 2. Secure Deletion Workflow
CREATE OR REPLACE FUNCTION process_deletion_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_request RECORD;
  v_admin_count INTEGER;
  v_approvals INTEGER;
  v_rejections INTEGER;
  v_info_needed INTEGER;
  v_effective_required INTEGER;
  v_document RECORD;
BEGIN
  -- Get the deletion request details
  SELECT * INTO v_request 
  FROM deletion_requests 
  WHERE id = NEW.deletion_request_id;
  
  IF NOT FOUND OR v_request.status != 'pending' AND v_request.status != 'info_requested' THEN
    RETURN NEW; -- Do nothing if request is already resolved
  END IF;

  -- Count admins in the organization
  SELECT COUNT(*) INTO v_admin_count
  FROM users
  WHERE organization_id = v_request.organization_id AND role = 'admin';

  -- Get current vote counts including the new one
  SELECT 
    COUNT(*) FILTER (WHERE vote = 'approve'),
    COUNT(*) FILTER (WHERE vote = 'reject'),
    COUNT(*) FILTER (WHERE vote = 'info_needed')
  INTO v_approvals, v_rejections, v_info_needed
  FROM deletion_votes 
  WHERE deletion_request_id = NEW.deletion_request_id;

  -- Calculate effective required votes
  IF v_admin_count <= 1 THEN
    v_effective_required := 1;
  ELSIF v_admin_count = 2 THEN
    v_effective_required := 2;
  ELSE
    v_effective_required := LEAST(v_request.votes_required, v_admin_count);
  END IF;

  -- Process resolution
  IF v_rejections >= 1 THEN
    -- Immediate rejection on first reject vote
    UPDATE deletion_requests 
    SET status = 'rejected', resolved_at = now()
    WHERE id = NEW.deletion_request_id;
    
  ELSIF v_approvals >= v_effective_required THEN
    -- Required approvals reached
    UPDATE deletion_requests 
    SET status = 'approved', resolved_at = now()
    WHERE id = NEW.deletion_request_id;
    
    -- Move document to secure_trash
    SELECT * INTO v_document FROM documents WHERE id = v_request.document_id;
    
    IF FOUND THEN
      INSERT INTO secure_trash (
        organization_id,
        document_id,
        document_data,
        deletion_request_id,
        deleted_by
      ) VALUES (
        v_document.organization_id,
        v_document.id,
        row_to_json(v_document)::jsonb,
        NEW.deletion_request_id,
        NEW.voter_id
      );
      
      -- Delete from documents table
      DELETE FROM documents WHERE id = v_document.id;
    END IF;
    
  ELSIF v_info_needed > 0 AND v_request.status = 'pending' THEN
    -- Mark as info requested
    UPDATE deletion_requests 
    SET status = 'info_requested'
    WHERE id = NEW.deletion_request_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after vote insertion
DROP TRIGGER IF EXISTS trigger_process_deletion_vote ON deletion_votes;
CREATE TRIGGER trigger_process_deletion_vote
  AFTER INSERT ON deletion_votes
  FOR EACH ROW
  EXECUTE FUNCTION process_deletion_vote();

-- 3. Secure Trash Auto-cleanup using pg_cron
-- Note: Requires pg_cron extension to be enabled in Supabase dashboard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule the cleanup job to run every day at midnight
    PERFORM cron.schedule(
      'purge_secure_trash',
      '0 0 * * *',
      $$ DELETE FROM secure_trash WHERE expires_at < now() AND restored_at IS NULL; $$
    );
  END IF;
END $$;
