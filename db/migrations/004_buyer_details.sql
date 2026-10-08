ALTER TABLE orders ADD COLUMN IF NOT EXISTS buyer_gender text CHECK (buyer_gender IN ('male','female'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS requested_payment_channel text CHECK (requested_payment_channel IN ('qris','bank_transfer','ewallet'));
