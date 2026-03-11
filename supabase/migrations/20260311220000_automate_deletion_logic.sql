-- Migration: Automate Deletion Request Initial Status
-- Description: Automatically approves deletion requests if the requester is the only admin,
-- and ensures votes_required is correctly inherited from organization settings.

CREATE OR REPLACE FUNCTION public.initialize_deletion_request()
RETURNS TRIGGER AS $$
DECLARE
    v_admin_count INTEGER;
    v_org_votes_required INTEGER;
BEGIN
    -- 1. Get organization settings
    SELECT deletion_votes_required INTO v_org_votes_required
    FROM public.organizations
    WHERE id = NEW.organization_id;

    -- 2. Set default votes required if not set
    IF NEW.votes_required IS NULL THEN
        NEW.votes_required := COALESCE(v_org_votes_required, 3);
    END IF;

    -- 3. Count active admins
    SELECT COUNT(*) INTO v_admin_count
    FROM public.users
    WHERE organization_id = NEW.organization_id
    AND role = 'admin'
    AND is_active = true;

    -- 4. Auto-approve if only 1 admin (the requester)
    IF v_admin_count <= 1 THEN
        NEW.status := 'approved';
        NEW.resolved_at := NOW();
        -- The AFTER INSERT trigger won't catch this change as it's BEFORE, 
        -- but the AFTER INSERT move_to_trash trigger WILL catch it if we change it to AFTER INSERT/UPDATE
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create the move_to_trash trigger to handle both INSERT and UPDATE
-- currently it is AFTER UPDATE of status. 
-- If it's already approved on INSERT, we need to catch it too.

CREATE OR REPLACE FUNCTION public.move_to_trash_on_approval_v2()
RETURNS TRIGGER AS $$
DECLARE
    v_doc_record RECORD;
BEGIN
    -- Check if status is approved (either newly inserted as approved or updated to approved)
    IF (NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS NULL OR OLD.status <> 'approved')) THEN
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
$$ LANGUAGE plpgsql;

-- Update triggers
DROP TRIGGER IF EXISTS on_deletion_request_init ON public.deletion_requests;
CREATE TRIGGER on_deletion_request_init
    BEFORE INSERT ON public.deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_deletion_request();

DROP TRIGGER IF EXISTS on_deletion_request_approved ON public.deletion_requests;
CREATE TRIGGER on_deletion_request_approved
    AFTER INSERT OR UPDATE OF status ON public.deletion_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.move_to_trash_on_approval_v2();
