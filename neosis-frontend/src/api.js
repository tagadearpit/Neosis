import axios from 'axios';

export const BACKEND_URL = (
  import.meta.env.VITE_BACKEND_URL || 'https://neosis-433w.onrender.com'
).replace(/\/$/, '');

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  timeout: 20_000,
  headers: {
    Accept: 'application/json'
  }
});

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
let csrfToken = null;
let csrfHeaderName = 'X-XSRF-TOKEN';
let csrfReadyPromise = null;

export const getCsrfToken = async () => {
  if (csrfToken) return { token: csrfToken, headerName: csrfHeaderName };

  if (!csrfReadyPromise) {
    csrfReadyPromise = api.get('/api/csrf', { __skipCsrf: true })
      .then((response) => {
        const data = response.data || {};
        if (!data.token) throw new Error('CSRF token missing from server response');
        csrfToken = data.token;
        csrfHeaderName = data.headerName || 'X-XSRF-TOKEN';
        return { token: csrfToken, headerName: csrfHeaderName };
      })
      .finally(() => {
        csrfReadyPromise = null;
      });
  }

  return csrfReadyPromise;
};

export const resetCsrfToken = () => {
  csrfToken = null;
  csrfHeaderName = 'X-XSRF-TOKEN';
};

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  if (!unsafeMethods.has(method) || config.__skipCsrf) return config;

  const csrf = await getCsrfToken();
  config.headers = config.headers || {};
  config.headers[csrf.headerName] = csrf.token;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if (
      status === 403 &&
      error?.response?.data?.code === 'CSRF_INVALID' &&
      originalRequest &&
      !originalRequest.__csrfRetry &&
      unsafeMethods.has((originalRequest.method || '').toLowerCase())
    ) {
      originalRequest.__csrfRetry = true;
      resetCsrfToken();
      const csrf = await getCsrfToken();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers[csrf.headerName] = csrf.token;
      return api(originalRequest);
    }

    if (status === 401 && !originalRequest?.__suppressUnauthorizedEvent) {
      window.dispatchEvent(new CustomEvent('neosis:unauthorized'));
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (error, fallback = 'Request failed') => {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return data.error;
  if (data?.message) return data.message;
  if (data?.fields) return Object.values(data.fields)[0] || fallback;
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond.';
  if (!error?.response) return 'Unable to reach the server. Check your connection.';
  return fallback;
};

export default api;
