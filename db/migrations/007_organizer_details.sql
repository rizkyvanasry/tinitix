ALTER TABLE organizations ADD COLUMN organizer_type text CHECK (organizer_type IN ('individual','company'));
ALTER TABLE organizations ADD COLUMN slug text UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE organizations ADD COLUMN phone text;
ALTER TABLE organizations ADD COLUMN newsletter_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN terms_accepted_at timestamptz;
