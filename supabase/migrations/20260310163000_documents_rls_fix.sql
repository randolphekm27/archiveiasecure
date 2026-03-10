/*
  # Phase 2 & 3: Category Filtering RLS
  
  1. Documents RLS Fix
     - Non-admins can only see documents if the document's category_id 
       is in the user's category_ids array, or if they have no category (NULL).
*/

DROP POLICY IF EXISTS "Users can view documents in their organization" ON documents;

CREATE POLICY "Documents view policy"
  ON documents FOR SELECT
  TO authenticated
  USING (
    organization_id = get_user_organization_id()
    AND (
      get_user_role() = 'admin'
      OR (
        category_id IS NULL
        OR category_id = ANY (
          (SELECT category_ids FROM users WHERE id = auth.uid())
        )
      )
    )
  );
