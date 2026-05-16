-- Cập nhật partial unique index để bao gồm CHECKED_IN
DROP INDEX IF EXISTS uq_active_registration;
CREATE UNIQUE INDEX uq_active_registration
    ON registrations (student_id, workshop_id)
    WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN');
