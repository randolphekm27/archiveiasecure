-- Migration: Admin Advanced Features
-- Description: Adds category deletion logic, auto document numbering, retention policies

-- 1. Add Smart File Numbering
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS registration_number TEXT;

CREATE OR REPLACE FUNCTION generate_document_registration_number()
RETURNS TRIGGER AS $$
DECLARE
    v_year TEXT;
    v_seq integer;
BEGIN
    v_year := to_char(COALESCE(NEW.document_date, CURRENT_DATE), 'YYYY');
    
    -- Find the max sequence number for this org and year
    SELECT COALESCE(MAX(SUBSTRING(registration_number FROM 'DOC-\d{4}-(\d+)')::integer), 0) + 1
    INTO v_seq
    FROM public.documents
    WHERE organization_id = NEW.organization_id
    AND registration_number LIKE 'DOC-' || v_year || '-%';

    NEW.registration_number := 'DOC-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_document_insert_registration ON public.documents;
CREATE TRIGGER on_document_insert_registration
    BEFORE INSERT ON public.documents
    FOR EACH ROW
    WHEN (NEW.registration_number IS NULL)
    EXECUTE FUNCTION generate_document_registration_number();

-- 2. Add Retention Policies
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS retention_period_years INTEGER DEFAULT 10;

-- 3. Adapt Deletion Consensus for Categories
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE;
ALTER TABLE public.deletion_requests ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'document' CHECK (target_type IN ('document', 'category'));
ALTER TABLE public.deletion_requests ALTER COLUMN document_id DROP NOT NULL;

ALTER TABLE public.secure_trash ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.secure_trash ADD COLUMN IF NOT EXISTS category_data JSONB;
ALTER TABLE public.secure_trash ALTER COLUMN document_id DROP NOT NULL;
ALTER TABLE public.secure_trash ALTER COLUMN document_data DROP NOT NULL;


-- Function to move document or category to trash when a request is approved
CREATE OR REPLACE FUNCTION move_to_trash_on_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_doc_record RECORD;
    v_cat_record RECORD;
BEGIN
    -- Check if status changed to approved
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved')) THEN
        
        IF NEW.target_type = 'document' THEN
            SELECT * INTO v_doc_record FROM public.documents WHERE id = NEW.document_id;
            
            IF v_doc_record.id IS NOT NULL THEN
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

                DELETE FROM public.documents WHERE id = NEW.document_id;
            END IF;
            
        ELSIF NEW.target_type = 'category' THEN
            SELECT * INTO v_cat_record FROM public.categories WHERE id = NEW.category_id;
            
            IF v_cat_record.id IS NOT NULL THEN
                INSERT INTO public.secure_trash (
                    category_id,
                    organization_id,
                    category_data,
                    deleted_by,
                    deletion_request_id,
                    expires_at
                ) VALUES (
                    v_cat_record.id,
                    v_cat_record.organization_id,
                    to_jsonb(v_cat_record),
                    NEW.requested_by,
                    NEW.id,
                    NOW() + INTERVAL '30 days'
                );

                DELETE FROM public.categories WHERE id = NEW.category_id;
            END IF;
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to restore document or category from trash
CREATE OR REPLACE FUNCTION restore_from_trash(trash_id UUID)
RETURNS UUID AS $$
DECLARE
    v_trash_record RECORD;
    v_new_id UUID;
BEGIN
    -- Get trash data
    SELECT * INTO v_trash_record FROM public.secure_trash WHERE id = trash_id;

    IF v_trash_record.document_data IS NOT NULL THEN
        -- Restore document
        INSERT INTO public.documents (
            id, organization_id, title, file_url, file_type, document_date, category_id,
            keywords, is_important, uploaded_by, created_at, updated_at, registration_number
        ) VALUES (
            (v_trash_record.document_data->>'id')::UUID,
            (v_trash_record.document_data->>'organization_id')::UUID,
            v_trash_record.document_data->>'title',
            v_trash_record.document_data->>'file_url',
            v_trash_record.document_data->>'file_type',
            (v_trash_record.document_data->>'document_date')::date,
            (v_trash_record.document_data->>'category_id')::UUID,
            ARRAY(SELECT jsonb_array_elements_text(v_trash_record.document_data->'keywords')),
            (v_trash_record.document_data->>'is_important')::boolean,
            (v_trash_record.document_data->>'uploaded_by')::UUID,
            (v_trash_record.document_data->>'created_at')::timestamp with time zone,
            NOW(),
            v_trash_record.document_data->>'registration_number'
        ) RETURNING id INTO v_new_id;

        -- Close deletion request
        UPDATE public.deletion_requests 
        SET status = 'restored', resolved_at = NOW()
        WHERE document_id = v_new_id AND status = 'approved';

    ELSIF v_trash_record.category_data IS NOT NULL THEN
        -- Restore category
        INSERT INTO public.categories (
            id, organization_id, name, description, color, created_at, retention_period_years
        ) VALUES (
            (v_trash_record.category_data->>'id')::UUID,
            (v_trash_record.category_data->>'organization_id')::UUID,
            v_trash_record.category_data->>'name',
            v_trash_record.category_data->>'description',
            v_trash_record.category_data->>'color',
            (v_trash_record.category_data->>'created_at')::timestamp with time zone,
            (v_trash_record.category_data->>'retention_period_years')::integer
        ) RETURNING id INTO v_new_id;

        -- Close deletion request
        UPDATE public.deletion_requests 
        SET status = 'restored', resolved_at = NOW()
        WHERE category_id = v_new_id AND status = 'approved';
    END IF;

    -- Remove from trash
    DELETE FROM public.secure_trash WHERE id = trash_id;

    RETURN COALESCE(v_new_id, trash_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
