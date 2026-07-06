import axios from 'axios';

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://neosis-433w.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true
});

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

let csrfToken = null;
let csrfHeaderName = 'X-XSRF-TOKEN';
let csrfReadyPromise = null;

export const getCsrfToken = async () => {
  if (csrfToken) {
    return {
      token: csrfToken,
      headerName: csrfHeaderName
    };
  }

  if (!csrfReadyPromise) {
    csrfReadyPromise = api
      .get('/api/csrf')
      .then((res) => {
        const data = res.data || {};

        csrfToken = data.token;
        csrfHeaderName = data.headerName || 'X-XSRF-TOKEN';

        if (!csrfToken) {
          throw new Error('CSRF token missing from /api/csrf response');
        }

        return {
          token: csrfToken,
          headerName: csrfHeaderName
        };
      })
      .finally(() => {
        csrfReadyPromise = null;
      });
  }

  return csrfReadyPromise;
};

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();

  if (!unsafeMethods.has(method)) {
    return config;
  }

  const csrf = await getCsrfToken();

  config.headers = config.headers || {};
  config.headers[csrf.headerName || 'X-XSRF-TOKEN'] = csrf.token;

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const originalRequest = error?.config;

    if (
      status === 403 &&
      originalRequest &&
      !originalRequest.__csrfRetry &&
      unsafeMethods.has((originalRequest.method || '').toLowerCase())
    ) {
      originalRequest.__csrfRetry = true;

      csrfToken = null;
      csrfHeaderName = 'X-XSRF-TOKEN';

      const csrf = await getCsrfToken();

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers[csrf.headerName || 'X-XSRF-TOKEN'] = csrf.token;

      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

export default api;