CREATE INDEX IF NOT EXISTS payment_events_report_idx
ON payment_events(order_id,created_at,id)
WHERE data->>'status'='paid';
