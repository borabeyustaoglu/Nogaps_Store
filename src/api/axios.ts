import axios, { type AxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  skipLogoutOn401?: boolean;
}

const resolveApiBaseUrl = () => {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (!configured || configured.trim().length === 0) {
    return '/api';
  }
  return configured.replace(/\/+$/, '');
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config as CustomAxiosRequestConfig | undefined;
    if (error.response?.status === 401 && !config?.skipLogoutOn401) {
      useAuthStore.getState().clearUser();
    }
    return Promise.reject(error);
  }
);

export type { CustomAxiosRequestConfig };
export default api;
