import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token
api.interceptors.request.use((config) => {
  const stored = localStorage.getItem('orciid-auth');
  if (stored) {
    const { state } = JSON.parse(stored);
    if (state?.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
  }
  return config;
});

// Handle 401 → refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const stored = localStorage.getItem('orciid-auth');
        if (stored) {
          const { state } = JSON.parse(stored);
          if (state?.refreshToken) {
            const { data } = await axios.post('/api/auth/refresh', { refreshToken: state.refreshToken });
            const parsed = JSON.parse(stored);
            parsed.state.token = data.accessToken;
            localStorage.setItem('orciid-auth', JSON.stringify(parsed));
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(original);
          }
        }
      } catch {
        localStorage.removeItem('orciid-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
