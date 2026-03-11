-- 1. Amélioration de la fonction de traitement des votes de suppression
-- S'assure de l'atomicité et de la création d'une notification de résultat
CREATE OR REPLACE FUNCTION process_deletion_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_request RECORD;
  v_admin_count INTEGER;
  v_approvals INTEGER;
  v_rejections INTEGER;
  v_effective_required INTEGER;
  v_document RECORD;
  v_admin_ids UUID[];
BEGIN
  -- Get the deletion request details
  SELECT * INTO v_request 
  FROM deletion_requests 
  WHERE id = NEW.deletion_request_id;
  
  IF NOT FOUND OR (v_request.status != 'pending' AND v_request.status != 'info_requested') THEN
    RETURN NEW;
  END IF;

  -- Count admins in the organization
  SELECT COUNT(*) INTO v_admin_count
  FROM users
  WHERE organization_id = v_request.organization_id AND role = 'admin';

  -- Get current vote counts
  SELECT 
    COUNT(*) FILTER (WHERE vote = 'approve'),
    COUNT(*) FILTER (WHERE vote = 'reject')
  INTO v_approvals, v_rejections
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
    UPDATE deletion_requests 
    SET status = 'rejected', resolved_at = now()
    WHERE id = NEW.deletion_request_id;
    
    -- Notification du rejet à l'auteur
    INSERT INTO notifications (organization_id, user_id, title, message, type, link_to)
    VALUES (
      v_request.organization_id, 
      v_request.requested_by, 
      'Demande de suppression rejetée', 
      'Votre demande pour le document a été rejetée par un administrateur.', 
      'warning', 
      'deletion-requests'
    );
    
  ELSIF v_approvals >= v_effective_required THEN
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

      -- Notification du succès à l'auteur
      INSERT INTO notifications (organization_id, user_id, title, message, type, link_to)
      VALUES (
        v_request.organization_id, 
        v_request.requested_by, 
        'Document supprimé (Corbeille)', 
        'Le document "' || v_document.title || '" a été déplacé vers la corbeille.', 
        'success', 
        'secure-trash'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Automatisation des notifications lors de nouveaux événements
CREATE OR REPLACE FUNCTION notify_admins_of_deletion_request()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id RECORD;
  v_doc_title TEXT;
BEGIN
  SELECT title INTO v_doc_title FROM documents WHERE id = NEW.document_id;

  FOR v_admin_id IN 
    SELECT id FROM users 
    WHERE organization_id = NEW.organization_id AND role = 'admin' AND id != NEW.requested_by
  LOOP
    INSERT INTO notifications (organization_id, user_id, title, message, type, link_to)
    VALUES (
      NEW.organization_id, 
      v_admin_id.id, 
      'Nouvelle demande de suppression', 
      'Un vote est requis pour supprimer le document "' || COALESCE(v_doc_title, 'un document') || '".', 
      'deletion', 
      'deletion-requests'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_admins_deletion ON deletion_requests;
CREATE TRIGGER trigger_notify_admins_deletion
  AFTER INSERT ON deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_of_deletion_request();

-- 3. Notification de vote pour l'auteur de la demande
CREATE OR REPLACE FUNCTION notify_requester_of_vote()
RETURNS TRIGGER AS $$
DECLARE
  v_request RECORD;
  v_voter_name TEXT;
BEGIN
  SELECT * INTO v_request FROM deletion_requests WHERE id = NEW.deletion_request_id;
  SELECT full_name INTO v_voter_name FROM users WHERE id = NEW.voter_id;

  IF FOUND AND v_request.requested_by != NEW.voter_id THEN
    INSERT INTO notifications (organization_id, user_id, title, message, type, link_to)
    VALUES (
      v_request.organization_id, 
      v_request.requested_by, 
      'Nouveau vote reçu', 
      v_voter_name || ' a voté pour votre demande de suppression.', 
      'info', 
      'deletion-requests'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_requester_vote ON deletion_votes;
CREATE TRIGGER trigger_notify_requester_vote
  AFTER INSERT ON deletion_votes
  FOR EACH ROW
  EXECUTE FUNCTION notify_requester_of_vote();
