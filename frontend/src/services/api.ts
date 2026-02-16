import axios from 'axios';

// 从环境变量读取后端地址，如果没有则使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_PORT = import.meta.env.VITE_API_PORT || '3001';
const API_BASE = API_BASE_URL ? `${API_BASE_URL}/api` : '/api';

export const api = {
  async health() {
    const response = await axios.get(`${API_BASE}/health`);
    return response.data;
  },

  async invokeDeepThink(query: string, maxRounds: number = 3) {
    const response = await axios.post(`${API_BASE}/deepthink/invoke`, {
      query,
      maxRounds,
    });
    return response.data;
  },

  async chatCompletions(messages: any[], stream: boolean = false) {
    const response = await axios.post(`${API_BASE}/v1/chat/completions`, {
      model: 'deepthink',
      messages,
      stream,
    });
    return response.data;
  },

  getWebSocketUrl(): string {
    // 如果设置了自定义 WebSocket 地址，直接使用
    const customWsUrl = import.meta.env.VITE_WS_BASE_URL;
    if (customWsUrl) {
      return `${customWsUrl}/ws/chat`;
    }

    // 如果设置了自定义 API 地址，从中推断 WebSocket 地址
    if (API_BASE_URL) {
      const protocol = API_BASE_URL.startsWith('https') ? 'wss:' : 'ws:';
      const url = new URL(API_BASE_URL);
      return `${protocol}//${url.host}/ws/chat`;
    }

    // 默认行为：根据当前页面地址推断，使用环境变量中的端口
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port === '5173' ? API_PORT : window.location.port;
    return `${protocol}//${host}:${port}/ws/chat`;
  },
};
