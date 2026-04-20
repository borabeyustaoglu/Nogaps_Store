import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  skipLogoutOn401?: boolean;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,           // JWT cookie otomatik gönderilir
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor: 401 → logout + login'e yönlendir
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as CustomAxiosRequestConfig | undefined;
    if (error.response?.status === 401 && !config?.skipLogoutOn401) {
      useAuthStore.getState().clearUser();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export type { CustomAxiosRequestConfig };
export default api;
