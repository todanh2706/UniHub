import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

export const options = {
    scenarios: {
        rate_limit_burst: {
            executor: 'constant-vus',
            vus: 5, // Sử dụng 5 luồng đồng thời từ cùng 1 IP để làm cạn kiệt Token Bucket cực nhanh
            duration: '10s',
        },
    },
};

export default function () {
    const url = `${BASE_URL}/api/v1/auth/login`;
    const payload = JSON.stringify({
        email: 'spam_bot@unihub.local',
        password: 'wrong_password'
    });
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const res = http.post(url, payload, params);

    const isRateLimited = res.status === 429;

    check(res, {
        'status is 401 (Auth Fail) or 429 (Rate Limited)': (r) => r.status === 401 || r.status === 429,
    });

    if (isRateLimited) {
        console.warn(`[🔥 RATE LIMIT TRIGGERED] IP của bạn đã bị chặn! Status: 429 Too Many Requests!`);
    } else {
        console.log(`[Request OK/Fail] Server phản hồi Status: ${res.status}`);
    }

    // Gửi liên tục không nghỉ (hoặc nghỉ cực ngắn 20ms) để trigger 429 lập tức
    sleep(0.02);
}
