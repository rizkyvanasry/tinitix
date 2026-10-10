CREATE INDEX IF NOT EXISTS orders_event_status_created_idx ON orders(event_id,status,created_at);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);
CREATE INDEX IF NOT EXISTS payment_events_order_paid_idx ON payment_events(order_id,created_at) WHERE data->>'status'='paid';
CREATE INDEX IF NOT EXISTS categories_event_idx ON categories(event_id);
