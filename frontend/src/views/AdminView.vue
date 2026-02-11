<template>
  <div class="admin-container">
    <!-- Header -->
    <header class="admin-header">
      <div class="header-left">
        <router-link to="/" class="back-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.7"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <span>DeepThink 设置</span>
        </div>
      </div>
      <button v-if="isLoggedIn" @click="logout" class="logout-btn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
        <span>退出登录</span>
      </button>
    </header>

    <!-- Login Form -->
    <div v-if="!isLoggedIn" class="login-container">
      <div class="login-card">
        <div class="login-header">
          <div class="login-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <h2>管理员登录</h2>
          <p>登录以管理 DeepThink 设置</p>
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <div class="form-group">
            <label>用户名</label>
            <input
              v-model="username"
              type="text"
              placeholder="输入用户名"
              autocomplete="username"
            />
          </div>
          <div class="form-group">
            <label>密码</label>
            <input
              v-model="password"
              type="password"
              placeholder="输入密码"
              autocomplete="current-password"
            />
          </div>
          <p v-if="loginError" class="error-message">{{ loginError }}</p>
          <button type="submit" class="login-btn" :disabled="!username || !password">
            登录
          </button>
        </form>
      </div>
    </div>

    <!-- Admin Content -->
    <div v-else class="admin-content">
      <!-- Tabs -->
      <nav class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <component :is="tab.icon" />
          <span>{{ tab.label }}</span>
        </button>
      </nav>

      <!-- Tab Content -->
      <div class="tab-content">
        <!-- LLM Config -->
        <section v-if="activeTab === 'llm'" class="config-section">
          <div class="section-header">
            <h2>LLM 配置</h2>
            <p>配置您的 AI 模型提供商设置</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>提供商</label>
              <select v-model="llmConfig.provider">
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div class="form-group">
              <label>默认模型</label>
              <input v-model="llmConfig.defaultModel" type="text" placeholder="gpt-4" />
            </div>
            <div class="form-group full-width">
              <label>API 密钥</label>
              <input v-model="llmConfig.apiKey" type="password" placeholder="sk-..." />
            </div>
            <div class="form-group full-width">
              <label>Base URL（可选）</label>
              <input v-model="llmConfig.baseUrl" type="text" placeholder="https://api.openai.com/v1" />
            </div>
          </div>

          <div class="form-actions">
            <button @click="saveLLMConfig" class="save-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存配置
            </button>
            <button @click="testLLM" class="test-btn" :disabled="llmTesting">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {{ llmTesting ? '测试中...' : '测试 LLM' }}
            </button>
            <span v-if="saveMessage" class="success-message">{{ saveMessage }}</span>
          </div>

          <!-- LLM 测试结果 -->
          <div v-if="llmTestResult" class="test-result" :class="{ 'test-error': !llmTestResult.success }">
            <div class="test-result-header">
              <span>{{ llmTestResult.success ? '测试成功' : '测试失败' }}</span>
              <button @click="llmTestResult = null" class="close-btn">&times;</button>
            </div>
            <pre class="test-result-content">{{ JSON.stringify(llmTestResult, null, 2) }}</pre>
          </div>
        </section>

        <!-- System Params -->
        <section v-if="activeTab === 'system'" class="config-section">
          <div class="section-header">
            <h2>系统参数</h2>
            <p>配置推理引擎行为</p>
          </div>

          <div class="form-grid">
            <div class="form-group">
              <label>最大轮数</label>
              <input
                v-model.number="systemParams.maxRounds"
                type="number"
                min="1"
                max="10"
              />
              <span class="hint">精炼迭代次数（1-10）</span>
            </div>
            <div class="form-group">
              <label>质量阈值</label>
              <input
                v-model.number="systemParams.qualityThreshold"
                type="number"
                step="0.05"
                min="0"
                max="1"
              />
              <span class="hint">最低质量分数（0-1）</span>
            </div>
            <div class="form-group">
              <label>规划级别</label>
              <select v-model="systemParams.planningLevel">
                <option value="minimal">最小</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div class="form-group">
              <label>专家级别</label>
              <select v-model="systemParams.expertLevel">
                <option value="minimal">最小</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
            <div class="form-group">
              <label>综合级别</label>
              <select v-model="systemParams.synthesisLevel">
                <option value="minimal">最小</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </div>
          </div>

          <div class="form-actions">
            <button @click="saveSystemParams" class="save-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存参数
            </button>
            <span v-if="saveMessage" class="success-message">{{ saveMessage }}</span>
          </div>
        </section>

        <!-- Search Config -->
        <section v-if="activeTab === 'search'" class="config-section">
          <div class="section-header">
            <h2>搜索配置</h2>
            <p>配置网络搜索集成以增强回答质量</p>
          </div>

          <div class="form-grid">
            <div class="form-group full-width">
              <label>搜索提供商</label>
              <select v-model="searchConfig.provider">
                <option value="none">无（禁用）</option>
                <option value="exa">Exa</option>
                <option value="tavily">Tavily</option>
              </select>
              <span class="hint">选择搜索提供商或禁用搜索</span>
            </div>

            <div class="form-group full-width" v-if="searchConfig.provider === 'exa'">
              <label>Exa API 密钥</label>
              <input
                v-model="searchConfig.exaApiKey"
                type="password"
                placeholder="输入您的 Exa API 密钥"
              />
              <span class="hint">从 <a href="https://exa.ai" target="_blank">exa.ai</a> 获取您的 API 密钥</span>
            </div>

            <div class="form-group full-width" v-if="searchConfig.provider === 'tavily'">
              <label>Tavily API 密钥</label>
              <input
                v-model="searchConfig.tavilyApiKey"
                type="password"
                placeholder="输入您的 Tavily API 密钥"
              />
              <span class="hint">从 <a href="https://tavily.com" target="_blank">tavily.com</a> 获取您的 API 密钥</span>
            </div>

            <div class="form-group">
              <label>最大搜索结果数</label>
              <input
                v-model.number="searchConfig.maxResults"
                type="number"
                min="1"
                max="20"
              />
              <span class="hint">检索的搜索结果数量（1-20）</span>
            </div>

            <div class="form-group">
              <label>启用搜索</label>
              <div class="toggle-switch">
                <input
                  type="checkbox"
                  id="search-enabled"
                  v-model="searchConfig.enabled"
                  :disabled="searchConfig.provider === 'none'"
                />
                <label for="search-enabled" class="toggle-label">
                  <span class="toggle-slider"></span>
                </label>
                <span class="toggle-text">{{ searchConfig.enabled ? '已启用' : '已禁用' }}</span>
              </div>
              <span class="hint">启用或禁用搜索功能</span>
            </div>
          </div>

          <div class="form-actions">
            <button @click="saveSearchConfig" class="save-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存搜索配置
            </button>
            <span v-if="saveMessage" class="success-message">{{ saveMessage }}</span>
          </div>
        </section>

        <!-- Account -->
        <section v-if="activeTab === 'account'" class="config-section">
          <div class="section-header">
            <h2>管理员账号</h2>
            <p>系统仅保留当前管理员账号，可在此修改用户名和密码</p>
          </div>

          <div class="form-grid">
            <div class="form-group full-width">
              <label>用户名</label>
              <input v-model="accountForm.username" type="text" placeholder="输入用户名" />
            </div>
            <div class="form-group full-width">
              <label>新密码（可选）</label>
              <input v-model="accountForm.newPassword" type="password" placeholder="留空则不修改密码" />
              <span class="hint">密码至少 6 位</span>
            </div>
          </div>

          <div class="form-actions">
            <button @click="saveAccount" class="save-btn" :disabled="!accountForm.username">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              保存账号
            </button>
            <span v-if="saveMessage" class="success-message">{{ saveMessage }}</span>
          </div>
        </section>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue';
import { useAdminStore } from '@/stores/adminStore';

const adminStore = useAdminStore();

const isLoggedIn = ref(false);
const username = ref('');
const password = ref('');
const loginError = ref('');
const activeTab = ref('llm');
const saveMessage = ref('');

const tabs = [
  { id: 'llm', label: 'LLM 配置', icon: { render: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2z' }), h('path', { d: 'M12 6v6l4 2' })]) } },
  { id: 'system', label: '系统参数', icon: { render: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('circle', { cx: 12, cy: 12, r: 3 }), h('path', { d: 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z' })]) } },
  { id: 'search', label: '搜索配置', icon: { render: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('circle', { cx: 11, cy: 11, r: 8 }), h('path', { d: 'm21 21-4.35-4.35' })]) } },
  { id: 'account', label: '管理员账号', icon: { render: () => h('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }, [h('path', { d: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' }), h('circle', { cx: 12, cy: 7, r: 4 })]) } },
];

const llmConfig = ref({
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  defaultModel: '',
});

// LLM 测试相关
const llmTesting = ref(false);
const llmTestResult = ref<any>(null);

const systemParams = ref({
  maxRounds: 1,
  qualityThreshold: 0.85,
  planningLevel: 'medium',
  expertLevel: 'medium',
  synthesisLevel: 'high',
});

const searchConfig = ref({
  provider: 'none',
  exaApiKey: '',
  tavilyApiKey: '',
  maxResults: 5,
  enabled: false,
});

const accountForm = ref({
  username: '',
  newPassword: '',
});

async function handleLogin() {
  try {
    loginError.value = '';
    await adminStore.login(username.value, password.value);
    isLoggedIn.value = true;
    await loadConfig();
  } catch (error: any) {
    loginError.value = error.response?.data?.error || '登录失败';
  }
}

function logout() {
  adminStore.logout();
  isLoggedIn.value = false;
}

async function loadConfig() {
  try {
    const config = await adminStore.getConfig();
    if (config.llm) llmConfig.value = config.llm;
    if (config.system) systemParams.value = config.system;
    if (config.search) searchConfig.value = config.search;

    const account = await adminStore.getAccount();
    accountForm.value.username = account.username || '';
    accountForm.value.newPassword = '';
  } catch (error) {
    console.error('Failed to load config:', error);
  }
}

async function saveLLMConfig() {
  try {
    await adminStore.updateLLMConfig(llmConfig.value);
    showSaveMessage();
  } catch (error) {
    console.error('Failed to save LLM config:', error);
  }
}

async function testLLM() {
  llmTesting.value = true;
  llmTestResult.value = null;
  try {
    const response = await adminStore.testLLM();
    llmTestResult.value = response;
  } catch (error: any) {
    llmTestResult.value = { error: error.message || '测试失败' };
  } finally {
    llmTesting.value = false;
  }
}

async function saveSystemParams() {
  try {
    await adminStore.updateSystemParams(systemParams.value);
    showSaveMessage();
  } catch (error) {
    console.error('Failed to save system params:', error);
  }
}

async function saveSearchConfig() {
  try {
    await adminStore.updateSearchConfig(searchConfig.value);
    showSaveMessage();
  } catch (error) {
    console.error('Failed to save search config:', error);
  }
}

async function saveAccount() {
  try {
    await adminStore.updateAccount(
      accountForm.value.username,
      accountForm.value.newPassword || undefined
    );
    accountForm.value.newPassword = '';
    showSaveMessage('账号更新成功，系统已保持为单管理员模式');
  } catch (error) {
    console.error('Failed to update account:', error);
  }
}

function showSaveMessage(message = '保存成功！') {
  saveMessage.value = message;
  setTimeout(() => (saveMessage.value = ''), 3000);
}

onMounted(() => {
  if (adminStore.token) {
    isLoggedIn.value = true;
    loadConfig();
  }
});
</script>

<style scoped>
.admin-container {
  height: var(--app-height);
  min-height: -webkit-fill-available;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  background: var(--bg-primary);
}

/* Header */
.admin-header {
  height: 56px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--text-secondary);
  text-decoration: none;
  border-radius: var(--radius-md);
  transition: all 0.15s;
}

.back-link:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  width: 24px;
  height: 24px;
  color: var(--accent);
}

.logo span {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--danger-soft);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.logout-btn:hover {
  background: var(--danger);
  color: white;
}

/* Login */
.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 56px);
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 32px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border-radius: 16px;
  color: var(--accent);
}

.login-header h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
}

.login-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select {
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.form-group select {
  cursor: pointer;
}

.form-group .hint {
  font-size: 11px;
  color: var(--text-muted);
}

.error-message {
  padding: 10px 14px;
  background: var(--danger-soft);
  border-radius: var(--radius-md);
  color: var(--danger);
  font-size: 13px;
}

.login-btn {
  padding: 12px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.login-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Admin Content */
.admin-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
}

.tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.tabs button:hover {
  color: var(--text-primary);
}

.tabs button.active {
  background: var(--accent);
  color: white;
}

/* Config Section */
.config-section {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 24px;
}

.section-header {
  margin-bottom: 24px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
}

.section-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.form-group.full-width {
  grid-column: span 2;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.save-btn,
.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-md);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.save-btn:hover,
.add-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.success-message {
  font-size: 13px;
  color: var(--accent);
}

/* Users */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.user-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border-radius: 50%;
  color: var(--accent);
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.user-role {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  width: fit-content;
}

.user-role.admin {
  background: var(--accent-soft);
  color: var(--accent);
}

.user-role.user {
  background: var(--bg-secondary);
  color: var(--text-muted);
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}

.delete-btn:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.add-user-form {
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.add-user-form h3 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
}

.add-user-form .form-grid {
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 16px;
}

/* Coming Soon */
.coming-soon {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  color: var(--text-muted);
}

.coming-soon svg {
  margin-bottom: 16px;
  opacity: 0.5;
}

.coming-soon h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.coming-soon p {
  font-size: 14px;
}

/* Responsive */
@media (max-width: 640px) {
  .admin-header {
    padding: 0 12px;
  }

  .logo span {
    font-size: 14px;
  }

  .logout-btn {
    padding: 8px 10px;
  }

  .logout-btn span {
    display: none;
  }

  .admin-content {
    padding: 12px;
  }

  .config-section {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-group.full-width {
    grid-column: span 1;
  }

  .add-user-form .form-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tabs button {
    flex: 1 1 45%;
    min-height: 44px;
  }

  .tabs button span {
    font-size: 12px;
  }

  .form-group input,
  .form-group select,
  .save-btn,
  .add-btn,
  .login-btn,
  .delete-btn,
  .back-link,
  .logout-btn {
    min-height: 44px;
  }
}

/* Toggle Switch */
.toggle-switch {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toggle-switch input[type="checkbox"] {
  display: none;
}

.toggle-label {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--bg-tertiary);
  border-radius: 12px;
  transition: all 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: all 0.2s;
}

input[type="checkbox"]:checked + .toggle-label .toggle-slider {
  background: var(--accent);
}

input[type="checkbox"]:checked + .toggle-label .toggle-slider::before {
  transform: translateX(20px);
}

input[type="checkbox"]:disabled + .toggle-label {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-text {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Full Width Form Group */
.form-group.full-width {
  grid-column: span 2;
}

.form-group.full-width a {
  color: var(--accent);
  text-decoration: none;
}

.form-group.full-width a:hover {
  text-decoration: underline;
}
</style>
