import { defineStore } from 'pinia';
import axios from 'axios';

const API_BASE = '/api';

// 创建带认证的axios实例
const authAxios = axios.create({
  baseURL: API_BASE,
});

// 请求拦截器：自动附加JWT token
authAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：处理401错误
authAxios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/admin';
    }
    return Promise.reject(error);
  }
);

export const useAdminStore = defineStore('admin', {
  state: () => ({
    token: localStorage.getItem('admin_token') || '',
    user: null as any,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    async login(username: string, password: string) {
      const response = await axios.post(`${API_BASE}/admin/login`, {
        username,
        password,
      });

      this.token = response.data.token;
      this.user = response.data.user;
      localStorage.setItem('admin_token', this.token);
    },

    logout() {
      this.token = '';
      this.user = null;
      localStorage.removeItem('admin_token');
    },

    async getConfig() {
      const response = await authAxios.get('/admin/config');
      return response.data;
    },

    async updateLLMConfig(config: any) {
      const response = await authAxios.put('/admin/config/llm', config);
      return response.data;
    },

    async testLLM() {
      const response = await authAxios.post('/admin/test-llm');
      return response.data;
    },

    async updateSystemParams(params: any) {
      const response = await authAxios.put('/admin/config/system', params);
      return response.data;
    },

    async getSearchConfig() {
      const response = await authAxios.get('/admin/config/search');
      return response.data;
    },

    async updateSearchConfig(config: any) {
      const response = await authAxios.put('/admin/config/search', config);
      return response.data;
    },

    async getUsers() {
      const response = await authAxios.get('/admin/users');
      return response.data;
    },

    async createUser(username: string, password: string, role: string) {
      const response = await authAxios.post('/admin/users', {
        username,
        password,
        role,
      });
      return response.data;
    },

    async deleteUser(userId: number) {
      const response = await authAxios.delete(`/admin/users/${userId}`);
      return response.data;
    },
  },
});
