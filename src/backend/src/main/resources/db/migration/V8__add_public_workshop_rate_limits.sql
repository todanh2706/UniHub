-- Protect public workshop browse APIs during registration rushes.
-- DB policies remain the primary source of truth over YAML fallback.
INSERT INTO rate_limit_policies (id, scope, endpoint, role_code, limit_value, window_seconds, algorithm, enabled)
VALUES
    (
        '43000000-0000-0000-0000-000000000004',
        'IP',
        '/api/v1/public/workshops',
        NULL,
        300,
        60,
        'TOKEN_BUCKET',
        TRUE
    ),
    (
        '43000000-0000-0000-0000-000000000005',
        'IP',
        '/api/v1/public/workshops/{id}',
        NULL,
        600,
        60,
        'TOKEN_BUCKET',
        TRUE
    );
