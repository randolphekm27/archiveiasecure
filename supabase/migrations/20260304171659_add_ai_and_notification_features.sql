/*
  # Add AI features, notifications, and document enhancements

  1. Modified Tables
    - `documents`
      - `description` (text) - AI-generated document summary/description
      - `ai_keywords` (text[]) - AI-suggested keywords
      - `ai_category_suggestion` (text) - AI-suggested category name
      - `views_count` (integer) - Track document views

  2. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `organization_id` (uuid, references organizations)
      - `user_id` (uuid, references users) - target user
      - `title` (text) - notification title
      - `message` (text) - notification body
      - `type` (text) - notification type (info, warning, success, deletion)
      - `is_read` (boolean) - read status
      - `link_to` (text) - optional page to navigate to
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on `notifications` table
    - Add policies for authenticated users to read/update their own notifications
    - Add policy for admins to insert notifications for their org members
*/

-- Add new columns to documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'description'
  ) THEN
    ALTER TABLE documents ADD COLUMN description text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_keywords'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_keywords text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'ai_category_suggestion'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_category_suggestion text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'views_count'
  ) THEN
    ALTER TABLE documents ADD COLUMN views_count integer DEFAULT 0;
  END IF;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  user_id uuid NOT NULL REFERENCES users(id),
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'info',
  is_read boolean DEFAULT false,
  link_to text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can insert notifications for org members"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.organization_id = notifications.organization_id
    )
  );

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
