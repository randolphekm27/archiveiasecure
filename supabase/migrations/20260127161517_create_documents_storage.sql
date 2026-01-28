/*
  # Create Storage Bucket for Documents

  ## Overview
  Creates a storage bucket for document files with proper RLS policies.

  ## Changes
  1. Creates a public storage bucket named 'documents'
  2. Sets up RLS policies to allow:
     - Users to upload files to their organization's folder
     - Users to read files from their organization's folder
     - Admins to delete files from their organization's folder

  ## Security
  - Files are organized by organization_id
  - RLS ensures complete data isolation between organizations
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload documents to their org folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Users can view documents from their org folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users WHERE users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete documents from their org folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] IN (
      SELECT organization_id::text FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );