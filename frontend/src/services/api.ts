import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authUtils } from '@/utils/auth.utils';

export const api = axios.create({
  baseURL: 'http://localhost:3000', // Ajuste para a URL do seu backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar o token em todas as requisições
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authUtils.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar erros de autenticação
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      authUtils.clearAuthData();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);