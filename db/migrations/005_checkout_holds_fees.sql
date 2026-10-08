ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_completed boolean NOT NULL DEFAULT true;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_percent numeric(5,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_percent numeric(5,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount integer NOT NULL DEFAULT 0 CHECK(tax_amount>=0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_amount integer NOT NULL DEFAULT 0 CHECK(service_amount>=0);
UPDATE orders SET subtotal=total WHERE subtotal IS NULL;
