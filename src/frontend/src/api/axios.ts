import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
});

// Generate idempotency key for mutation requests
function generateIdempotencyKey(): string {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

export function getScopedIdempotencyKey(scope: string): string {
  const storageKey = `idem:${scope}`;
  const existing = sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }

  const nextKey = generateIdempotencyKey();
  sessionStorage.setItem(storageKey, nextKey);
  return nextKey;
}

export function clearScopedIdempotencyKey(scope: string): void {
  sessionStorage.removeItem(`idem:${scope}`);
}

// Add a request interceptor to attach the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const isAuthRoute = config.url?.includes('/auth/register') || config.url?.includes('/auth/login');
    
    if (token && !isAuthRoute) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;
    if (isFormData) {
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration and rate limiting
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 429 Rate Limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || error.response.data?.retryAfterSeconds || 3;
      console.warn(`Rate limited. Retry after ${retryAfter} seconds.`);
      // Don't retry automatically - let the UI handle it
      return Promise.reject(error);
    }

    // Handle 503 Payment Unavailable
    if (error.response?.status === 503) {
      const errorCode = error.response.data?.error;
      if (errorCode === 'PAYMENT_UNAVAILABLE') {
        const retryAfter = error.response.data?.retryAfterSeconds || 30;
        console.warn(`Payment unavailable. Retry after ${retryAfter} seconds.`);
        return Promise.reject(error);
      }
    }

    // Handle 409 Idempotency Conflict
    if (error.response?.status === 409) {
      const errorCode = error.response.data?.error;
      if (errorCode === 'REQUEST_IN_PROGRESS') {
        console.warn('Previous request still processing. Please wait.');
        return Promise.reject(error);
      }
      if (errorCode === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST' && originalRequest?.headers?.['Idempotency-Key']) {
        console.error('Idempotency key conflict. Generating new key...');
        originalRequest.headers['Idempotency-Key'] = generateIdempotencyKey();
        return api(originalRequest);
      }
    }

    // If error is 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${api.defaults.baseURL}/auth/refresh`, {
          refreshToken,
        });

        const { token } = response.data;
        localStorage.setItem('token', token);

        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
