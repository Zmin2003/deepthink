import { config } from './app.config.js';
import { ConfigStore } from '../services/session/ConfigStore.js';

// 初始化配置存储
export const configStore = new ConfigStore(config.database.path);

// 异步初始化
export async function initConfigStore() {
  await configStore.init();
}

// 从数据库加载 LLM 配置
export const llmConfig = {
  get() {
    return configStore.getLLMConfig();
  },
  set(newConfig: any) {
    configStore.setLLMConfig(newConfig);
  }
};

// 从数据库加载系统参数
export const systemParams = {
  get() {
    return configStore.getSystemParams();
  },
  set(newParams: any) {
    configStore.setSystemParams(newParams);
  }
};
