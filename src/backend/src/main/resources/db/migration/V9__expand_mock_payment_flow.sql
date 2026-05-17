ALTER TABLE payments
    ADD COLUMN checkout_token VARCHAR(255),
    ADD COLUMN last_error_message TEXT;

UPDATE payments
SET checkout_token = CONCAT('chk_', REPLACE(id::text, '-', ''))
WHERE checkout_token IS NULL;

ALTER TABLE payments
    ALTER COLUMN checkout_token SET NOT NULL;

ALTER TABLE payments
    ADD CONSTRAINT uq_payments_checkout_token UNIQUE (checkout_token);
