INSERT INTO roles (id, code, name) VALUES
    ('00000000-0000-0000-0000-000000000011', 'STUDENT', 'Sinh vien'),
    ('00000000-0000-0000-0000-000000000012', 'ORGANIZER', 'Ban to chuc'),
    ('00000000-0000-0000-0000-000000000013', 'CHECKIN_STAFF', 'Nhan su check-in');

INSERT INTO permissions (id, code, description) VALUES
    ('00000000-0000-0000-0000-000000000021', 'workshop:create', 'Create workshop'),
    ('00000000-0000-0000-0000-000000000022', 'workshop:update', 'Update workshop'),
    ('00000000-0000-0000-0000-000000000023', 'registration:create', 'Create registration'),
    ('00000000-0000-0000-0000-000000000024', 'checkin:scan', 'Scan QR check-in'),
    ('00000000-0000-0000-0000-000000000025', 'ai:summary', 'Generate AI summary');

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000023'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000021'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000022'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000025'),
    ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000024');

INSERT INTO users (id, email, password_hash, full_name, status) VALUES
    ('10000000-0000-0000-0000-000000000001', 'student1@unihub.local', '$2a$10$N9qo8uLOickgx2ZMRZo5i.ejQ5PaXtkKtu6ugfQof8I4eAbOeXKli', 'Student One', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000002', 'student2@unihub.local', '$2a$10$N9qo8uLOickgx2ZMRZo5i.ejQ5PaXtkKtu6ugfQof8I4eAbOeXKli', 'Student Two', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000003', 'organizer@unihub.local', '$2a$10$N9qo8uLOickgx2ZMRZo5i.ejQ5PaXtkKtu6ugfQof8I4eAbOeXKli', 'Organizer Demo', 'ACTIVE'),
    ('10000000-0000-0000-0000-000000000004', 'checkin@unihub.local', '$2a$10$N9qo8uLOickgx2ZMRZo5i.ejQ5PaXtkKtu6ugfQof8I4eAbOeXKli', 'Checkin Staff Demo', 'ACTIVE');

INSERT INTO user_roles (user_id, role_id) VALUES
    ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011'),
    ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011'),
    ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000012'),
    ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000013');

INSERT INTO students (id, user_id, student_code, full_name, email, faculty, major, cohort, status, source_file, source_row_number) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '22110001', 'Student One', 'student1@unihub.local', 'CNTT', 'Khoa hoc may tinh', 'K22', 'ACTIVE', 'sample_students_500.csv', 1),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', '22110002', 'Student Two', 'student2@unihub.local', 'CNTT', 'Ky thuat phan mem', 'K22', 'ACTIVE', 'sample_students_500.csv', 2);

INSERT INTO events (id, name, start_date, end_date, status) VALUES
    ('30000000-0000-0000-0000-000000000001', 'Tuan le ky nang va nghe nghiep 2026', DATE '2026-06-01', DATE '2026-06-07', 'ACTIVE');

INSERT INTO rooms (id, name, building, floor, capacity, layout_image_url) VALUES
    ('31000000-0000-0000-0000-000000000001', 'A101', 'Toa A', '1', 120, '/layouts/a101.png'),
    ('31000000-0000-0000-0000-000000000002', 'B201', 'Toa B', '2', 80, '/layouts/b201.png');

INSERT INTO speakers (id, full_name, title, organization, bio, avatar_url) VALUES
    ('32000000-0000-0000-0000-000000000001', 'Tran Van A', 'Senior Engineer', 'UniHub', 'Speaker for CV workshop', '/avatars/speaker-a.png'),
    ('32000000-0000-0000-0000-000000000002', 'Nguyen Thi B', 'Tech Lead', 'UniHub', 'Speaker for interview workshop', '/avatars/speaker-b.png');

INSERT INTO categories (id, name, slug) VALUES
    ('33000000-0000-0000-0000-000000000001', 'CV', 'cv'),
    ('33000000-0000-0000-0000-000000000002', 'Interview', 'interview'),
    ('33000000-0000-0000-0000-000000000003', 'AI', 'ai');

INSERT INTO workshops (
    id, event_id, room_id, title, description, capacity, price_amount, currency, status,
    start_time, end_time, registration_opens_at, registration_closes_at, created_by, updated_by
) VALUES
    (
        '34000000-0000-0000-0000-000000000001',
        '30000000-0000-0000-0000-000000000001',
        '31000000-0000-0000-0000-000000000001',
        'CV chuan doanh nghiep',
        'Huong dan viet CV va review truc tiep.',
        60,
        0,
        'VND',
        'PUBLISHED',
        TIMESTAMPTZ '2026-06-02 08:00:00+07',
        TIMESTAMPTZ '2026-06-02 10:00:00+07',
        TIMESTAMPTZ '2026-05-20 08:00:00+07',
        TIMESTAMPTZ '2026-06-02 07:30:00+07',
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003'
    ),
    (
        '34000000-0000-0000-0000-000000000002',
        '30000000-0000-0000-0000-000000000001',
        '31000000-0000-0000-0000-000000000002',
        'Interview va mock interview',
        'Huong dan tra loi va thuc hanh phong van.',
        50,
        50000,
        'VND',
        'PUBLISHED',
        TIMESTAMPTZ '2026-06-03 13:30:00+07',
        TIMESTAMPTZ '2026-06-03 16:00:00+07',
        TIMESTAMPTZ '2026-05-20 08:00:00+07',
        TIMESTAMPTZ '2026-06-03 13:00:00+07',
        '10000000-0000-0000-0000-000000000003',
        '10000000-0000-0000-0000-000000000003'
    );

INSERT INTO workshop_speakers (workshop_id, speaker_id, display_order) VALUES
    ('34000000-0000-0000-0000-000000000001', '32000000-0000-0000-0000-000000000001', 1),
    ('34000000-0000-0000-0000-000000000002', '32000000-0000-0000-0000-000000000002', 1);

INSERT INTO workshop_categories (workshop_id, category_id) VALUES
    ('34000000-0000-0000-0000-000000000001', '33000000-0000-0000-0000-000000000001'),
    ('34000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000002'),
    ('34000000-0000-0000-0000-000000000002', '33000000-0000-0000-0000-000000000003');

INSERT INTO registrations (id, student_id, workshop_id, status, qr_token, expires_at, confirmed_at) VALUES
    ('35000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '34000000-0000-0000-0000-000000000001', 'CONFIRMED', 'qr_demo_student_1', NULL, NOW()),
    ('35000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '34000000-0000-0000-0000-000000000002', 'PENDING_PAYMENT', 'qr_demo_student_2', NOW() + INTERVAL '15 minutes', NULL);

INSERT INTO payments (id, registration_id, idempotency_key, amount, currency, provider, provider_transaction_id, status, requested_at) VALUES
    ('36000000-0000-0000-0000-000000000001', '35000000-0000-0000-0000-000000000002', 'idem_pay_demo_1', 50000, 'VND', 'MOCK_GATEWAY', NULL, 'PENDING', NOW());

INSERT INTO idempotency_keys (id, key, user_id, endpoint, request_hash, response_body, status_code, expires_at) VALUES
    (
        '37000000-0000-0000-0000-000000000001',
        'idem_registration_demo_1',
        '10000000-0000-0000-0000-000000000002',
        '/api/v1/registrations',
        'hash_registration_demo_1',
        '{"status":"PENDING_PAYMENT"}',
        202,
        NOW() + INTERVAL '1 day'
    );

INSERT INTO payment_webhook_events (id, provider, event_id, payment_id, payload, status, received_at) VALUES
    (
        '38000000-0000-0000-0000-000000000001',
        'MOCK_GATEWAY',
        'evt_demo_1',
        '36000000-0000-0000-0000-000000000001',
        '{"event":"payment.pending"}',
        'RECEIVED',
        NOW()
    );

INSERT INTO checkins (id, registration_id, checked_in_by, client_event_id, source, checked_in_at, synced_at, device_id) VALUES
    (
        '39000000-0000-0000-0000-000000000001',
        '35000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000004',
        'client_event_demo_1',
        'OFFLINE_SYNC',
        NOW() - INTERVAL '1 hour',
        NOW(),
        'android-demo-001'
    );

INSERT INTO csv_import_jobs (id, file_name, file_checksum, status, total_rows, success_rows, failed_rows, started_at, finished_at) VALUES
    (
        '3A000000-0000-0000-0000-000000000001',
        'sample_students_500.csv',
        'demo-checksum-500',
        'SUCCESS',
        500,
        498,
        2,
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1 hour'
    );

INSERT INTO csv_import_errors (id, job_id, row_number, raw_data, error_code, error_message) VALUES
    (
        '3B000000-0000-0000-0000-000000000001',
        '3A000000-0000-0000-0000-000000000001',
        233,
        'bad,row,data',
        'INVALID_EMAIL',
        'Email format is invalid'
    );

INSERT INTO notifications (id, user_id, type, title, body, data) VALUES
    (
        '3C000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001',
        'REGISTRATION_CONFIRMED',
        'Dang ky thanh cong',
        'Ban da dang ky workshop CV thanh cong.',
        '{"workshopId":"34000000-0000-0000-0000-000000000001"}'
    );

INSERT INTO notification_deliveries (id, notification_id, channel, status, attempt_count, sent_at) VALUES
    (
        '3D000000-0000-0000-0000-000000000001',
        '3C000000-0000-0000-0000-000000000001',
        'EMAIL',
        'SENT',
        1,
        NOW()
    );

INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, payload, status, available_at, processed_at) VALUES
    (
        '3E000000-0000-0000-0000-000000000001',
        'REGISTRATION_CONFIRMED',
        'registration',
        '35000000-0000-0000-0000-000000000001',
        '{"registrationId":"35000000-0000-0000-0000-000000000001"}',
        'PROCESSED',
        NOW() - INTERVAL '10 minutes',
        NOW() - INTERVAL '5 minutes'
    );

INSERT INTO workshop_documents (id, workshop_id, file_url, file_name, mime_type, file_size, processing_status, extracted_text) VALUES
    (
        '3F000000-0000-0000-0000-000000000001',
        '34000000-0000-0000-0000-000000000001',
        '/uploads/workshop-cv.pdf',
        'workshop-cv.pdf',
        'application/pdf',
        204800,
        'EXTRACTED',
        'Noi dung tai lieu CV duoc trich xuat...'
    );

INSERT INTO ai_summaries (id, document_id, model, prompt_version, status, summary_text, created_at) VALUES
    (
        '40000000-0000-0000-0000-000000000001',
        '3F000000-0000-0000-0000-000000000001',
        'gemini-1.5-pro',
        'v1',
        'SUCCESS',
        'Workshop huong dan xay dung CV thuc chien.',
        NOW()
    );

INSERT INTO audit_logs (id, actor_user_id, action, resource_type, resource_id, metadata, ip_address) VALUES
    (
        '41000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000003',
        'WORKSHOP_CREATED',
        'workshop',
        '34000000-0000-0000-0000-000000000001',
        '{"source":"seed"}',
        '127.0.0.1'
    );

INSERT INTO workshop_change_logs (id, workshop_id, field_name, old_value, new_value, changed_by, reason, changed_at) VALUES
    (
        '42000000-0000-0000-0000-000000000001',
        '34000000-0000-0000-0000-000000000001',
        'start_time',
        '2026-06-02T07:30:00+07',
        '2026-06-02T08:00:00+07',
        '10000000-0000-0000-0000-000000000003',
        'Can bang lich phong',
        NOW()
    );

INSERT INTO rate_limit_policies (id, scope, endpoint, role_code, limit_value, window_seconds, algorithm, enabled) VALUES
    (
        '43000000-0000-0000-0000-000000000001',
        'ROLE',
        '/api/v1/registrations',
        'STUDENT',
        30,
        60,
        'SLIDING_WINDOW',
        TRUE
    );

INSERT INTO circuit_breaker_events (id, service_name, from_state, to_state, reason, failure_count, created_at) VALUES
    (
        '44000000-0000-0000-0000-000000000001',
        'payment-gateway',
        'CLOSED',
        'OPEN',
        'timeout threshold reached',
        5,
        NOW() - INTERVAL '1 day'
    );
