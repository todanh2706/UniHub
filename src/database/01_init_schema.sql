-- ==========================================
-- TẠO EXTENSION CẦN THIẾT
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. AUTH & RBAC
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR NOT NULL UNIQUE,
    password_hash VARCHAR,
    full_name VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR NOT NULL UNIQUE,
    name VARCHAR NOT NULL
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR NOT NULL UNIQUE,
    description VARCHAR
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);

-- ==========================================
-- 2. STUDENT DIRECTORY
-- ==========================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    student_code VARCHAR NOT NULL UNIQUE,
    full_name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    faculty VARCHAR,
    major VARCHAR,
    cohort VARCHAR,
    status VARCHAR NOT NULL,
    last_synced_at TIMESTAMPTZ,
    source_file VARCHAR,
    source_row_number INT
);

CREATE TABLE csv_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_name VARCHAR NOT NULL,
    file_checksum VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    total_rows INT,
    success_rows INT,
    failed_rows INT,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE TABLE csv_import_errors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES csv_import_jobs(id) ON DELETE CASCADE,
    row_number INT NOT NULL,
    raw_data TEXT,
    error_code VARCHAR,
    error_message TEXT
);

-- ==========================================
-- 3. WORKSHOP CATALOG
-- ==========================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR NOT NULL
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    building VARCHAR,
    floor VARCHAR,
    capacity INT NOT NULL,
    layout_image_url VARCHAR,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id),
    room_id UUID NOT NULL REFERENCES rooms(id),
    title VARCHAR NOT NULL,
    description TEXT,
    capacity INT NOT NULL,
    price_amount NUMERIC NOT NULL,
    currency VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_opens_at TIMESTAMPTZ NOT NULL,
    registration_closes_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE speakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR NOT NULL,
    title VARCHAR,
    organization VARCHAR,
    bio TEXT,
    avatar_url VARCHAR,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR NOT NULL,
    slug VARCHAR NOT NULL UNIQUE
);

CREATE TABLE workshop_speakers (
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    speaker_id UUID NOT NULL REFERENCES speakers(id) ON DELETE CASCADE,
    display_order INT,
    PRIMARY KEY (workshop_id, speaker_id)
);

CREATE TABLE workshop_categories (
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (workshop_id, category_id)
);

CREATE TABLE workshop_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    field_name VARCHAR NOT NULL,
    old_value VARCHAR,
    new_value VARCHAR,
    changed_by UUID NOT NULL REFERENCES users(id),
    reason VARCHAR,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 4. REGISTRATION & CHECKIN
-- ==========================================
CREATE TABLE registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id),
    workshop_id UUID NOT NULL REFERENCES workshops(id),
    status VARCHAR NOT NULL,
    qr_token VARCHAR NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancelled_by UUID REFERENCES users(id),
    cancel_reason VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL UNIQUE REFERENCES registrations(id),
    checked_in_by UUID NOT NULL REFERENCES users(id),
    client_event_id VARCHAR NOT NULL UNIQUE,
    source VARCHAR NOT NULL,
    checked_in_at TIMESTAMPTZ NOT NULL,
    synced_at TIMESTAMPTZ,
    device_id VARCHAR
);

-- ==========================================
-- 5. PAYMENT
-- ==========================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_id UUID NOT NULL REFERENCES registrations(id),
    idempotency_key VARCHAR NOT NULL UNIQUE,
    amount NUMERIC NOT NULL,
    currency VARCHAR NOT NULL,
    provider VARCHAR NOT NULL,
    provider_transaction_id VARCHAR,
    status VARCHAR NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ
);

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id),
    endpoint VARCHAR NOT NULL,
    request_hash VARCHAR NOT NULL,
    response_body JSONB,
    status_code INT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR NOT NULL,
    event_id VARCHAR NOT NULL,
    payment_id UUID REFERENCES payments(id),
    payload JSONB,
    status VARCHAR NOT NULL,
    received_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    UNIQUE (provider, event_id)
);

-- ==========================================
-- 6. NOTIFICATION & OUTBOX
-- ==========================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    body TEXT,
    data JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMPTZ
);

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR NOT NULL,
    aggregate_type VARCHAR NOT NULL,
    aggregate_id VARCHAR NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR NOT NULL,
    available_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);

-- ==========================================
-- 7. AI SUMMARY
-- ==========================================
CREATE TABLE workshop_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    file_url VARCHAR NOT NULL,
    file_name VARCHAR,
    mime_type VARCHAR,
    file_size BIGINT,
    processing_status VARCHAR NOT NULL,
    extracted_text TEXT,
    error_message TEXT
);

CREATE TABLE ai_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES workshop_documents(id) ON DELETE CASCADE,
    model VARCHAR NOT NULL,
    prompt_version VARCHAR,
    status VARCHAR NOT NULL,
    summary_text TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 8. AUDIT & PROTECTION
-- ==========================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR NOT NULL,
    resource_type VARCHAR NOT NULL,
    resource_id VARCHAR,
    metadata JSONB,
    ip_address VARCHAR,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rate_limit_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scope VARCHAR NOT NULL,
    endpoint VARCHAR NOT NULL,
    role_code VARCHAR,
    limit_value INT NOT NULL,
    window_seconds INT NOT NULL,
    algorithm VARCHAR NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE circuit_breaker_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_name VARCHAR NOT NULL,
    from_state VARCHAR NOT NULL,
    to_state VARCHAR NOT NULL,
    reason VARCHAR,
    failure_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- 9. INDEXES
-- ==========================================

-- Chống duplicate registration active
CREATE UNIQUE INDEX uq_active_registration 
ON registrations(student_id, workshop_id) 
WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');

-- Đếm chỗ còn lại nhanh
CREATE INDEX idx_registrations_workshop_status_expires 
ON registrations(workshop_id, status, expires_at);

-- Xem lịch workshop
CREATE INDEX idx_workshops_event_start_status 
ON workshops(event_id, start_time, status);

-- Lọc workshop theo phòng/thời gian
CREATE INDEX idx_workshops_room_time 
ON workshops(room_id, start_time, end_time);

-- Worker xử lý outbox
CREATE INDEX idx_outbox_events_status_available 
ON outbox_events(status, available_at);

-- Worker expire pending payment
CREATE INDEX idx_registrations_status_expires 
ON registrations(status, expires_at);
