-- Migration: Consensus Deletion Logic
-- Description: Adds functions and triggers to handle the multi-admin approval process for document deletion.

-- 1. Function to submit a vote and check quorum
CREATE OR REPLACE FUNCTION handle_deletion_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_votes_required INTEGER;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_doc_id UUID;
    v_org_id UUID;
    v_requested_by UUID;
    v_doc_record RECORD;
    v_doc_json JSONB;
BEGIN
    -- Get the deletion request details
    SELECT votes_required, document_id, organization_id, requested_by 
    INTO v_votes_required, v_doc_id, v_org_id, v_requested_by
    FROM public.deletion_requests 
    WHERE id = NEW.deletion_request_id;

    -- Count current votes
    SELECT COUNT(*) FILTER (WHERE vote = 'approve'),
           COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.deletion_votes
    WHERE deletion_request_id = NEW.deletion_request_id;

    -- If quorum for approval is reached
    IF v_approve_count >= v_votes_required THEN
        -- Mark request as approved
        UPDATE public.deletion_requests 
        SET status = 'approved', resolved_at = NOW() 
        WHERE id = NEW.deletion_request_id;

        -- Capture document data before deletion
        SELECT * INTO v_doc_record FROM public.documents WHERE id = v_doc_id;
        v_doc_json := to_jsonb(v_doc_record);

        -- Move to secure_trash
        INSERT INTO public.secure_trash (
            document_id,
            organization_id,
            document_data,
            deleted_by,
            deletion_request_id,
            expires_at
        ) VALUES (
            v_doc_id,
            v_org_id,
            v_doc_json,
            v_requested_by,
            NEW.deletion_request_id,
            NOW() + INTERVAL '30 days'
        );

        -- Delete from active documents
        DELETE FROM public.documents WHERE id = v_doc_id;

    -- If too many rejections (optional logic: can be customized)
    ELSIF v_reject_count > 0 THEN -- For now, a single rejection blocks the deletion
        UPDATE public.deletion_requests 
        SET status = 'rejected', resolved_at = NOW() 
        WHERE id = NEW.deletion_request_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for voting
DROP TRIGGER IF EXISTS on_vote_submitted ON public.deletion_votes;
CREATE TRIGGER on_vote_submitted
AFTER INSERT OR UPDATE ON public.deletion_votes
FOR EACH ROW EXECUTE FUNCTION handle_deletion_vote();

-- 2. Function to restore a document from trash
CREATE OR REPLACE FUNCTION restore_document(trash_id UUID)
RETURNS UUID AS $$
DECLARE
    v_doc_data JSONB;
    v_new_doc_id UUID;
BEGIN
    -- Get document data
    SELECT document_data INTO v_doc_data FROM public.secure_trash WHERE id = trash_id;

    -- Re-insert into documents table
    INSERT INTO public.documents (
        id,
        organization_id,
        title,
        description,
        file_url,
        file_type,
        document_date,
        category_id,
        keywords,
        is_important,
        uploaded_by,
        ai_keywords,
        ai_category_suggestion,
        views_count,
        created_at,
        updated_at
    ) VALUES (
        (v_doc_data->>'id')::UUID,
        (v_doc_data->>'organization_id')::UUID,
        v_doc_data->>'title',
        v_doc_data->>'description',
        v_doc_data->>'file_url',
        v_doc_data->>'file_type',
        (v_doc_data->>'document_date')::date,
        (v_doc_data->>'category_id')::UUID,
        ARRAY(SELECT jsonb_array_elements_text(v_doc_data->'keywords')),
        (v_doc_data->>'is_important')::boolean,
        (v_doc_data->>'uploaded_by')::UUID,
        ARRAY(SELECT jsonb_array_elements_text(v_doc_data->'ai_keywords')),
        v_doc_data->>'ai_category_suggestion',
        (v_doc_data->>'views_count')::integer,
        (v_doc_data->>'created_at')::timestamp with time zone,
        NOW()
    ) RETURNING id INTO v_new_doc_id;

    -- Remove from trash
    DELETE FROM public.secure_trash WHERE id = trash_id;

    -- Close deletion request if exists
    UPDATE public.deletion_requests 
    SET status = 'restored', resolved_at = NOW()
    WHERE document_id = v_new_doc_id AND status = 'approved';

    RETURN v_new_doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Policy to protect deletion votes (admins only)
ALTER TABLE public.deletion_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can vote on their organization requests"
ON public.deletion_votes
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'admin'
        AND organization_id = (SELECT organization_id FROM public.deletion_requests WHERE id = deletion_request_id)
    )
);

-- 4. Policy for secure trash
ALTER TABLE public.secure_trash ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can see their organization trash"
ON public.secure_trash
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'admin'
        AND organization_id = secure_trash.organization_id
    )
);

CREATE POLICY "Admins can restore trash"
ON public.secure_trash
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()
        AND role = 'admin'
        AND organization_id = secure_trash.organization_id
    )
);
