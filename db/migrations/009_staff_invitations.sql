CREATE TABLE staff_invitations (
 id text PRIMARY KEY,
 organization_id text NOT NULL REFERENCES organizations(id),
 email text NOT NULL,
 token_hash text NOT NULL UNIQUE,
 event_ids jsonb NOT NULL,
 invited_by text NOT NULL REFERENCES users(id),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','revoked')),
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 accepted_by text REFERENCES users(id),
 accepted_at timestamptz
);
CREATE INDEX staff_invitations_org_idx ON staff_invitations(organization_id,created_at);
CREATE UNIQUE INDEX staff_invitation_pending_idx ON staff_invitations(organization_id,email) WHERE status='pending';
