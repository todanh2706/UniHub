import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const WORKSHOP_ID = '34000000-0000-0000-0000-000000000099';

const regSuccess = new Counter('registration_success');
const regFull = new Counter('registration_full');
const regOther = new Counter('registration_other');

const users = new SharedArray('users', function () {
    const arr = [];
    for (let i = 1; i <= 100; i++) {
        const pad = String(i).padStart(3, '0');
        arr.push({
            email: `loadtest${pad}@unihub.local`,
            password: 'secret'
        });
    }
    return arr;
});

export const options = {
    scenarios: {
        burst: {
            executor: 'per-vu-iterations',
            vus: 50,
            iterations: 1,
            maxDuration: '120s',
        },
    },
};

function retryRequest(fn, maxRetries) {
    for (let i = 0; i < maxRetries; i++) {
        const res = fn();
        if (res.status !== 429) return res;
        const wait = Math.pow(2, i) + Math.random();
        console.log(`VU ${__VU}: 429 rate limited, retry ${i + 1}/${maxRetries} after ${wait.toFixed(1)}s`);
        sleep(wait);
    }
    return fn();
}

export default function () {
    const user = users[__VU - 1];

    // Stagger login slightly to avoid rate limit burst
    sleep(Math.random() * 2);

    // Login with retry
    const loginRes = retryRequest(() =>
        http.post(`${BASE_URL}/api/v1/auth/login`,
            JSON.stringify({ email: user.email, password: user.password }),
            { headers: { 'Content-Type': 'application/json' } }
        ), 3);

    const loginOk = check(loginRes, { 'login 200': (r) => r.status === 200 });
    if (!loginOk) {
        console.log(`VU ${__VU} login FAILED: ${loginRes.status} ${loginRes.body}`);
        return;
    }

    const token = loginRes.json('token');

    // Register with retry
    const regRes = retryRequest(() =>
        http.post(`${BASE_URL}/api/v1/registrations`,
            JSON.stringify({ workshopId: WORKSHOP_ID }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'Idempotency-Key': `lt-${user.email}-${Date.now()}`
                }
            }
        ), 3);

    check(regRes, {
        'reg success or full': (r) => r.status === 200 || r.status === 409,
    });

    if (regRes.status === 200) {
        regSuccess.add(1);
    } else if (regRes.status === 409) {
        regFull.add(1);
    } else {
        regOther.add(1);
    }

    console.log(`VU ${__VU} [${user.email}]: ${regRes.status} ${regRes.status === 200 ? '✅ GOT SEAT' : regRes.status === 409 ? '❌ FULL' : '⚠️ ' + regRes.body}`);
}
