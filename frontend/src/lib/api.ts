import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const authData = localStorage.getItem('auth-storage');
  if (authData) {
    try {
      const { state } = JSON.parse(authData);
      if (state?.accessToken) {
        config.headers.Authorization = `Bearer ${state.accessToken}`;
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const { state } = JSON.parse(authData);
          if (state?.refreshToken) {
            const response = await axios.post('/api/v1/auth/refresh', { refreshToken: state.refreshToken });
            const { accessToken, refreshToken } = response.data;

            const newState = { ...state, accessToken, refreshToken };
            localStorage.setItem('auth-storage', JSON.stringify({ state: newState }));
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            return api(error.config);
          }
        } catch {
          localStorage.removeItem('auth-storage');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
