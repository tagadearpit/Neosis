import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://neosis-433w.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);
let csrfReadyPromise = null;

const getCookie = (name) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
};

const ensureCsrfCookie = async () => {
  if (getCookie('XSRF-TOKEN')) return;
  if (!csrfReadyPromise) {
    csrfReadyPromise = api.get('/api/csrf').finally(() => {
      csrfReadyPromise = null;
    });
  }
  await csrfReadyPromise;
};

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();
  if (unsafeMethods.has(method)) {
    await ensureCsrfCookie();
  }
  return config;
});

export default api;
