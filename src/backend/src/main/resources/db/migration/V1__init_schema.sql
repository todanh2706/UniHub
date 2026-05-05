CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(128) NOT NULL UNIQUE,
    description VARCHAR(500)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL,
    role_id UUID NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL,
    permission_id UUID NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles (id),
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions (id)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE students (
    id UUID PRIMARY KEY,
    user_id UUID UNIQUE,
    student_code VARCHAR(64) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    faculty VARCHAR(255),
    major VARCHAR(255),
    cohort VARCHAR(64),
    status VARCHAR(32) NOT NULL,
    last_synced_at TIMESTAMPTZ,
    source_file VARCHAR(255),
    source_row_number INTEGER,
    CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE events (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(32) NOT NULL
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    building VARCHAR(255),
    floor VARCHAR(64),
    capacity INTEGER NOT NULL,
    layout_image_url VARCHAR(500),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE speakers (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    organization VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(500),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL UNIQUE
);

CREATE TABLE workshops (
    id UUID PRIMARY KEY,
    event_id UUID NOT NULL,
    room_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    price_amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(16) NOT NULL,
    status VARCHAR(32) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_opens_at TIMESTAMPTZ NOT NULL,
    registration_closes_at TIMESTAMPTZ NOT NULL,
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    CONSTRAINT fk_workshops_event FOREIGN KEY (event_id) REFERENCES events (id),
    CONSTRAINT fk_workshops_room FOREIGN KEY (room_id) REFERENCES rooms (id),
    CONSTRAINT fk_workshops_created_by FOREIGN KEY (created_by) REFERENCES users (id),
    CONSTRAINT fk_workshops_updated_by FOREIGN KEY (updated_by) REFERENCES users (id)
);

CREATE TABLE workshop_speakers (
    workshop_id UUID NOT NULL,
    speaker_id UUID NOT NULL,
    display_order INTEGER,
    PRIMARY KEY (workshop_id, speaker_id),
    CONSTRAINT fk_workshop_speakers_workshop FOREIGN KEY (workshop_id) REFERENCES workshops (id),
    CONSTRAINT fk_workshop_speakers_speaker FOREIGN KEY (speaker_id) REFERENCES speakers (id)
);

CREATE TABLE workshop_categories (
    workshop_id UUID NOT NULL,
    category_id UUID NOT NULL,
    PRIMARY KEY (workshop_id, category_id),
    CONSTRAINT fk_workshop_categories_workshop FOREIGN KEY (workshop_id) REFERENCES workshops (id),
    CONSTRAINT fk_workshop_categories_category FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE TABLE registrations (
    id UUID PRIMARY KEY,
    student_id UUID NOT NULL,
    workshop_id UUID NOT NULL,
    status VARCHAR(32) NOT NULL,
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID,
    cancel_reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_registrations_student FOREIGN KEY (student_id) REFERENCES students (id),
    CONSTRAINT fk_registrations_workshop FOREIGN KEY (workshop_id) REFERENCES workshops (id),
    CONSTRAINT fk_registrations_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users (id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY,
    registration_id UUID NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(16) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    provider_transaction_id VARCHAR(255),
    status VARCHAR(32) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    CONSTRAINT fk_payments_registration FOREIGN KEY (registration_id) REFERENCES registrations (id)
);

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    request_hash VARCHAR(255) NOT NULL,
    response_body JSONB,
    status_code INTEGER,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_idempotency_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE payment_webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    payment_id UUID,
    payload JSONB,
    status VARCHAR(32) NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    CONSTRAINT uq_webhook_provider_event UNIQUE (provider, event_id),
    CONSTRAINT fk_webhook_payment FOREIGN KEY (payment_id) REFERENCES payments (id)
);

CREATE TABLE checkins (
    id UUID PRIMARY KEY,
    registration_id UUID NOT NULL UNIQUE,
    checked_in_by UUID NOT NULL,
    client_event_id VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(32) NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ,
    device_id VARCHAR(255),
    CONSTRAINT fk_checkins_registration FOREIGN KEY (registration_id) REFERENCES registrations (id),
    CONSTRAINT fk_checkins_user FOREIGN KEY (checked_in_by) REFERENCES users (id)
);

CREATE TABLE csv_import_jobs (
    id UUID PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_checksum VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL,
    total_rows INTEGER,
    success_rows INTEGER,
    failed_rows INTEGER,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE TABLE csv_import_errors (
    id UUID PRIMARY KEY,
    job_id UUID NOT NULL,
    row_number INTEGER NOT NULL,
    raw_data TEXT,
    error_code VARCHAR(64),
    error_message TEXT,
    CONSTRAINT fk_csv_errors_job FOREIGN KEY (job_id) REFERENCES csv_import_jobs (id)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY,
    notification_id UUID NOT NULL,
    channel VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempt_count INTEGER NOT NULL,
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    CONSTRAINT fk_notification_deliveries_notification FOREIGN KEY (notification_id) REFERENCES notifications (id)
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(128) NOT NULL,
    aggregate_type VARCHAR(128) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(32) NOT NULL,
    available_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);

CREATE TABLE workshop_documents (
    id UUID PRIMARY KEY,
    workshop_id UUID NOT NULL,
    file_url VARCHAR(500) NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(128),
    file_size BIGINT,
    processing_status VARCHAR(32) NOT NULL,
    extracted_text TEXT,
    error_message TEXT,
    CONSTRAINT fk_workshop_documents_workshop FOREIGN KEY (workshop_id) REFERENCES workshops (id)
);

CREATE TABLE ai_summaries (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    model VARCHAR(128) NOT NULL,
    prompt_version VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    summary_text TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_ai_summaries_document FOREIGN KEY (document_id) REFERENCES workshop_documents (id)
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    actor_user_id UUID,
    action VARCHAR(128) NOT NULL,
    resource_type VARCHAR(128) NOT NULL,
    resource_id VARCHAR(255),
    metadata JSONB,
    ip_address VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_user_id) REFERENCES users (id)
);

CREATE TABLE workshop_change_logs (
    id UUID PRIMARY KEY,
    workshop_id UUID NOT NULL,
    field_name VARCHAR(128) NOT NULL,
    old_value VARCHAR(500),
    new_value VARCHAR(500),
    changed_by UUID NOT NULL,
    reason VARCHAR(500),
    changed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_workshop_change_logs_workshop FOREIGN KEY (workshop_id) REFERENCES workshops (id),
    CONSTRAINT fk_workshop_change_logs_changed_by FOREIGN KEY (changed_by) REFERENCES users (id)
);

CREATE TABLE rate_limit_policies (
    id UUID PRIMARY KEY,
    scope VARCHAR(128) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    role_code VARCHAR(64),
    limit_value INTEGER NOT NULL,
    window_seconds INTEGER NOT NULL,
    algorithm VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL
);

CREATE TABLE circuit_breaker_events (
    id UUID PRIMARY KEY,
    service_name VARCHAR(128) NOT NULL,
    from_state VARCHAR(64) NOT NULL,
    to_state VARCHAR(64) NOT NULL,
    reason VARCHAR(500),
    failure_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workshops_event_start_status
    ON workshops (event_id, start_time, status);

CREATE INDEX idx_workshops_room_time
    ON workshops (room_id, start_time, end_time);

CREATE INDEX idx_reg_workshop_status_expires
    ON registrations (workshop_id, status, expires_at);

CREATE INDEX idx_reg_status_expires
    ON registrations (status, expires_at);

CREATE INDEX idx_outbox_status_available
    ON outbox_events (status, available_at);

CREATE UNIQUE INDEX uq_active_registration
    ON registrations (student_id, workshop_id)
    WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');
