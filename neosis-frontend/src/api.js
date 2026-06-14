import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://neosis-433w.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true, // CRITICAL: This tells the browser to always attach the JSESSIONID cookie
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN' // CRITICAL: Protects POST requests against CSRF attacks
});

export default api;