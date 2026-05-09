CREATE TABLE role_upgrade_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_role VARCHAR NOT NULL,
    status VARCHAR NOT NULL, -- PENDING, APPROVED, REJECTED
    reason TEXT,
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert ADMIN role (Using 00...10 for ID)
INSERT INTO roles (id, code, name) VALUES
    ('00000000-0000-0000-0000-000000000010', 'ADMIN', 'Quan tri vien');

-- Insert admin user (Password hash is same as other demo users, it is `secret`)
INSERT INTO users (id, email, password_hash, full_name, status) VALUES
    ('10000000-0000-0000-0000-000000000000', 'admin@unihub.local', '$2a$10$gIBcQtLddWoKielhBR4xjOUeLpFSe8jJFAs9Dbtw84mLHSRwOiPie', 'Admin Demo', 'ACTIVE');

-- Assign ADMIN role to admin user
INSERT INTO user_roles (user_id, role_id) VALUES
    ('10000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000010');

-- Optional: Insert a demo request from student1 to become ORGANIZER
INSERT INTO role_upgrade_requests (id, user_id, requested_role, status, reason) VALUES
    ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'ORGANIZER', 'PENDING', 'I want to organize a new workshop for IT students.');
