-- Upgrade Schema v2
-- Aligner la base de données sur la PROJECT_DOCUMENTATION.md

-- Mise à jour de la table organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#6366F1',
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'Inter',
ADD COLUMN IF NOT EXISTS deletion_votes_required integer DEFAULT 3;

-- Mise à jour de la table users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS department text,
ADD COLUMN IF NOT EXISTS phone_extension text,
ADD COLUMN IF NOT EXISTS signature text;

-- Commentaires pour documentation
COMMENT ON COLUMN public.organizations.deletion_votes_required IS 'Nombre de votes d''administrateurs requis pour valider une suppression définitive';
COMMENT ON COLUMN public.users.signature IS 'Signature électronique ou texte de l''utilisateur';
