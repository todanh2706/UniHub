-- Tăng IP rate limit cho load test (từ 90 lên 500 req/60s)
UPDATE rate_limit_policies
SET limit_value = 500
WHERE id = '43000000-0000-0000-0000-000000000002';

-- Tăng USER rate limit cho STUDENT registrations (từ 5/3s lên 20/3s)
UPDATE rate_limit_policies
SET limit_value = 20
WHERE id = '43000000-0000-0000-0000-000000000001';
