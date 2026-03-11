-- Fix for Deletion Workflow and Trash
-- 1. Separating the deletion logic into a dedicated trigger on status change
-- 2. Fixing the quorum logic to include the requester's implicit approval

-- Function to move document to trash when a request is approved
CREATE OR REPLACE FUNCTION move_to_trash_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_doc_record RECORD;
BEGIN
    -- Check if status changed to approved
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved')) THEN
        -- Capture document data before deletion
        SELECT * INTO v_doc_record FROM public.documents WHERE id = NEW.document_id;
        
        IF v_doc_record.id IS NOT NULL THEN
            -- Move to secure_trash
            INSERT INTO public.secure_trash (
                document_id,
                organization_id,
                document_data,
                deleted_by,
                deletion_request_id,
                expires_at
            ) VALUES (
                v_doc_record.id,
                v_doc_record.organization_id,
                to_jsonb(v_doc_record),
                NEW.requested_by,
                NEW.id,
                NOW() + INTERVAL '30 days'
            );

            -- Delete from active documents
            DELETE FROM public.documents WHERE id = NEW.document_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for status change on deletion_requests
DROP TRIGGER IF EXISTS on_deletion_request_approved ON public.deletion_requests;
CREATE TRIGGER on_deletion_request_approved
    AFTER UPDATE OF status ON public.deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION move_to_trash_on_approval();

-- Update handle_deletion_vote to be smarter about quorum
CREATE OR REPLACE FUNCTION handle_deletion_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_votes_required INTEGER;
    v_admin_count INTEGER;
    v_effective_quorum INTEGER;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_org_id UUID;
BEGIN
    -- Get the deletion request details
    SELECT votes_required, organization_id
    INTO v_votes_required, v_org_id
    FROM public.deletion_requests 
    WHERE id = NEW.deletion_request_id;

    -- Count active admins in the organization
    SELECT COUNT(*) INTO v_admin_count 
    FROM public.users 
    WHERE organization_id = v_org_id 
    AND role = 'admin' 
    AND is_active = true;

    -- Calculate effective quorum
    -- If there's only 1 admin, 1 vote (the requester) is enough (auto-approval scenario)
    -- If there are 2 admins, 2 votes (requester + 1 other) are required
    -- If there are more, we follow votes_required but cap it at admin_count
    IF v_admin_count <= 1 THEN 
        v_effective_quorum := 1;
    ELSIF v_admin_count = 2 THEN 
        v_effective_quorum := 2;
    ELSE 
        v_effective_quorum := LEAST(v_votes_required, v_admin_count);
    END IF;

    -- Count current votes + 1 for the requester
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'approve') + 1,
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.deletion_votes
    WHERE deletion_request_id = NEW.deletion_request_id;

    -- If quorum for approval is reached
    IF v_approve_count >= v_effective_quorum THEN
        UPDATE public.deletion_requests 
        SET status = 'approved', resolved_at = NOW() 
        WHERE id = NEW.deletion_request_id;
        -- The move_to_trash_on_approval trigger will handle the rest

    -- If there's a rejection (can be customized, currently 1 reject blocks)
    ELSIF v_reject_count > 0 THEN
        UPDATE public.deletion_requests 
        SET status = 'rejected', resolved_at = NOW() 
        WHERE id = NEW.deletion_request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
