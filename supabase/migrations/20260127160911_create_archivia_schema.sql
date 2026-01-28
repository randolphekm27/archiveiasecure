/*
  # ArchivIA Pro - Complete Database Schema

  ## Overview
  Multi-tenant archive management system with AI-powered document processing.
  Each organization has complete data isolation through RLS policies.

  ## New Tables

  ### 1. organizations
  Stores organization information with unique codes
  - `id` (uuid, primary key) - Unique organization identifier
  - `code` (text, unique) - Human-readable organization code (e.g., MEMP_2024)
  - `name` (text) - Organization name
  - `logo_url` (text, nullable) - URL to organization logo
  - `admin_email` (text) - Email of the organization administrator
  - `created_at` (timestamptz) - Creation timestamp

  ### 2. users
  User profiles linked to organizations
  - `id` (uuid, primary key, references auth.users) - User ID from Supabase auth
  - `organization_id` (uuid, foreign key) - Links to organizations table
  - `username` (text) - Username for login
  - `full_name` (text) - User's full name
  - `role` (text) - User role: 'admin', 'editor', or 'reader'
  - `avatar_url` (text, nullable) - URL to user avatar
  - `created_at` (timestamptz) - Creation timestamp

  ### 3. categories
  Document categories customized per organization
  - `id` (uuid, primary key) - Category identifier
  - `organization_id` (uuid, foreign key) - Links to organizations table
  - `name` (text) - Category name
  - `description` (text, nullable) - Category description
  - `color` (text) - Color code for UI display
  - `created_at` (timestamptz) - Creation timestamp

  ### 4. documents
  Archived documents with metadata
  - `id` (uuid, primary key) - Document identifier
  - `organization_id` (uuid, foreign key) - Links to organizations table
  - `title` (text) - Document title
  - `file_url` (text) - URL to the stored file
  - `file_type` (text) - File type/extension
  - `document_date` (date) - Date on the document
  - `category_id` (uuid, foreign key, nullable) - Links to categories table
  - `keywords` (text array) - Searchable keywords
  - `uploaded_by` (uuid, foreign key) - Links to users table
  - `is_important` (boolean) - Pinned/important flag
  - `created_at` (timestamptz) - Upload timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 5. activity_logs
  Audit trail for all actions
  - `id` (uuid, primary key) - Log entry identifier
  - `organization_id` (uuid, foreign key) - Links to organizations table
  - `user_id` (uuid, foreign key) - Links to users table
  - `action` (text) - Action performed
  - `document_id` (uuid, foreign key, nullable) - Links to documents table if applicable
  - `details` (jsonb, nullable) - Additional details
  - `created_at` (timestamptz) - Action timestamp

  ## Security

  Row Level Security (RLS) is enabled on all tables.
  Policies ensure complete data isolation between organizations:
  - Users can only access data from their own organization
  - Admins have full control within their organization
  - Editors can create and modify documents
  - Readers have read-only access
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  admin_email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  username text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'reader' CHECK (role IN ('admin', 'editor', 'reader')),
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, username)
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  color text DEFAULT '#3B82F6',
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, name)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  document_date date DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  keywords text[] DEFAULT '{}',
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  is_important boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL NOT NULL,
  action text NOT NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Anyone can create an organization"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert users in their organization"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their organization"
  ON categories FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Admins can manage categories in their organization"
  ON categories FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for documents
CREATE POLICY "Users can view documents in their organization"
  ON documents FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Editors and admins can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Editors and admins can update documents in their organization"
  ON documents FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'editor')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'editor')
    )
  );

CREATE POLICY "Admins can delete documents in their organization"
  ON documents FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view activity logs in their organization"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
  );

CREATE POLICY "Users can insert activity logs for their organization"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM users WHERE users.id = auth.uid())
    AND user_id = auth.uid()
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(organization_id, username);
CREATE INDEX IF NOT EXISTS idx_categories_organization ON categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_organization ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_keywords ON documents USING gin(keywords);
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for documents table
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();