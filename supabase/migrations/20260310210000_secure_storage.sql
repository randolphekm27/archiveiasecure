/*
  # Phase 5: Secure Storage & Organization Customization

  ## Overview
  1. Secures the 'documents' storage bucket by making it private.
  2. Adds customization fields to the organizations table.

  ## Changes
  1. Updates storage bucket 'documents' -> public = false.
  2. Alters organizations table to add:
     - description (text)
     - phone (text)
     - website (text)
     - primary_color (text)
     - secondary_color (text)
*/

-- Make the documents bucket private
UPDATE storage.buckets
SET public = false
WHERE id = 'documents';

-- Add new customization columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#2563EB',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#1E40AF';
