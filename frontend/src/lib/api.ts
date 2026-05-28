import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      const { access } = JSON.parse(tokens);
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const tokens = localStorage.getItem('tokens');
        if (tokens) {
          const { refresh } = JSON.parse(tokens);
          const res = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          const newTokens = {
            access: res.data.access,
            refresh: res.data.refresh || refresh,
          };
          localStorage.setItem('tokens', JSON.stringify(newTokens));
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return api(originalRequest);
        }
      } catch {
        localStorage.removeItem('tokens');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
