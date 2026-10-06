CREATE TABLE IF NOT EXISTS organizations (id text PRIMARY KEY, name text NOT NULL);
CREATE TABLE IF NOT EXISTS events (
 id text PRIMARY KEY, organization_id text NOT NULL REFERENCES organizations(id),
 slug text NOT NULL UNIQUE, data jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
 id text PRIMARY KEY, event_id text NOT NULL REFERENCES events(id),
 name text NOT NULL, price integer NOT NULL CHECK(price>=0), quota integer NOT NULL CHECK(quota>=0),
 people integer NOT NULL CHECK(people IN (1,2)), starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
 CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text UNIQUE NOT NULL, name text NOT NULL, password_hash text NOT NULL, verified boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS memberships (user_id text PRIMARY KEY REFERENCES users(id), organization_id text NOT NULL REFERENCES organizations(id), role text NOT NULL CHECK(role IN ('admin','staff','buyer')));
CREATE TABLE IF NOT EXISTS assignments (user_id text REFERENCES users(id), event_id text REFERENCES events(id), PRIMARY KEY(user_id,event_id));
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id text REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS auth_tokens (token_hash text PRIMARY KEY, user_id text REFERENCES users(id), kind text NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS orders (
 id text PRIMARY KEY, event_id text NOT NULL REFERENCES events(id), buyer_name text NOT NULL, buyer_email text NOT NULL,
 phone text NOT NULL DEFAULT '', status text NOT NULL CHECK(status IN ('pending','paid','failed','expired','payment_review')),
 total integer NOT NULL CHECK(total>=0), people integer NOT NULL CHECK(people>0), created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL, idempotency_key text NOT NULL UNIQUE, fingerprint text NOT NULL,
 payment_ref text UNIQUE, last_email_at timestamptz
);
CREATE INDEX IF NOT EXISTS orders_email_idx ON orders(buyer_email);
CREATE INDEX IF NOT EXISTS orders_pending_idx ON orders(status,expires_at);
CREATE TABLE IF NOT EXISTS order_items (
 id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), category_id text NOT NULL REFERENCES categories(id),
 name text NOT NULL, price integer NOT NULL, quantity integer NOT NULL CHECK(quantity>0), people integer NOT NULL CHECK(people IN (1,2))
);
CREATE TABLE IF NOT EXISTS reservations (
 order_id text REFERENCES orders(id), category_id text REFERENCES categories(id), units integer NOT NULL,
 state text NOT NULL CHECK(state IN ('active','converted','released')), expires_at timestamptz NOT NULL,
 PRIMARY KEY(order_id,category_id)
);
CREATE INDEX IF NOT EXISTS reservations_stock_idx ON reservations(category_id,state,expires_at);
CREATE TABLE IF NOT EXISTS order_access (token_hash text PRIMARY KEY, order_id text REFERENCES orders(id), expires_at timestamptz NOT NULL, kind text NOT NULL CHECK(kind IN ('link','session')));
CREATE TABLE IF NOT EXISTS payment_events (id text PRIMARY KEY, order_id text REFERENCES orders(id), data jsonb NOT NULL, created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS tickets (
 id text PRIMARY KEY, order_id text REFERENCES orders(id), order_item_id text REFERENCES order_items(id), event_id text REFERENCES events(id),
 name text NOT NULL, category_name text NOT NULL, token_hash text UNIQUE NOT NULL, status text NOT NULL DEFAULT 'valid' CHECK(status IN ('valid','cancelled')),
 ordinal integer NOT NULL, UNIQUE(order_item_id,ordinal)
);
CREATE TABLE IF NOT EXISTS check_ins (ticket_id text PRIMARY KEY REFERENCES tickets(id), user_id text NOT NULL REFERENCES users(id), checked_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS email_jobs (
 id text PRIMARY KEY, order_id text REFERENCES orders(id), recipient text NOT NULL, payload text NOT NULL,
 status text NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, next_attempt_at timestamptz NOT NULL DEFAULT now(),
 locked_until timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target text NOT NULL, reason text NOT NULL DEFAULT '', created_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL, expires_at timestamptz NOT NULL);
