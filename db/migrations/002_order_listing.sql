CREATE INDEX IF NOT EXISTS orders_event_created_idx ON orders(event_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS events_organization_idx ON events(organization_id);
