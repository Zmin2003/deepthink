<template>
  <div class="app-container">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo">
          <svg class="logo-icon" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.7"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          <span class="logo-text">DeepThink</span>
        </div>
        <button class="close-sidebar" @click="sidebarOpen = false">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <button class="new-chat-btn" @click="createNewChat">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>新对话</span>
      </button>

      <div class="sessions-list">
        <div v-if="sessions.length === 0" class="empty-sessions">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <p>No conversations yet</p>
        </div>
        <div
          v-for="session in sessions"
          :key="session.id"
          class="session-item"
          :class="{ active: currentSessionId === session.id }"
          @click="selectSession(session.id)"
        >
          <svg class="session-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <div class="session-info">
            <span class="session-title">{{ session.title }}</span>
            <span class="session-date">{{ formatDate(session.updatedAt) }}</span>
          </div>
          <button class="delete-session" @click.stop="deleteSession(session.id)" title="Delete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="sidebar-footer">
        <router-link to="/admin" class="admin-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          <span>设置</span>
        </router-link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="header">
        <button class="menu-btn" @click="sidebarOpen = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <h1 class="header-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.7"/>
            <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
          DeepThink AI
        </h1>
      </header>

      <!-- Chat Area -->
      <div class="chat-area" ref="chatAreaRef">
        <!-- Empty State -->
        <div v-if="messages.length === 0 && !thinking.active" class="empty-state">
          <div class="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor" opacity="0.3"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
            </svg>
          </div>
          <h2>DeepThink AI</h2>
          <p>多专家协作的深度推理 AI</p>
          <div class="features">
            <div class="feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a10 10 0 0110 10 10 10 0 01-10 10A10 10 0 012 12 10 10 0 0112 2z"/>
                <path d="M12 6v6l4 2"/>
              </svg>
              <span>深度分析</span>
            </div>
            <div class="feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
              <span>专家协作</span>
            </div>
            <div class="feature">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span>高质量综合</span>
            </div>
          </div>
        </div>

        <!-- Messages -->
        <div v-else class="messages-container">
          <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
            <!-- User Message -->
            <template v-if="msg.role === 'user'">
              <div class="message-bubble user-bubble">
                <div class="message-content">{{ msg.content }}</div>
              </div>
            </template>

            <!-- Assistant Message -->
            <template v-else>
              <div class="message-bubble assistant-bubble">
                <div class="avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="currentColor"/>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" stroke-width="2" fill="none"/>
                  </svg>
                </div>
                <div class="message-body">
                  <div class="markdown-body" v-html="renderMarkdown(msg.content)"></div>

                  <!-- Expert Cards -->
                  <div v-if="msg.experts && msg.experts.length > 0" class="experts-section">
                    <button class="experts-toggle" @click="toggleExperts(msg)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                      </svg>
                      <span>{{ msg.experts.length }} 位专家分析</span>
                      <svg class="chevron" :class="{ rotated: msg._showExperts }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>

                    <div v-if="msg._showExperts" class="experts-grid">
                      <div
                        v-for="(expert, idx) in msg.experts"
                        :key="expert.id"
                        class="expert-card"
                        :class="{ expanded: msg._expandedExpert === expert.id || isInExpandedRow(msg, expert.id, idx) }"
                        :style="{ '--accent-color': getExpertColor(idx) }"
                        @click="toggleExpertExpand(msg, expert.id)"
                      >
                        <div class="expert-header">
                          <div class="expert-icon" :style="{ background: getExpertColor(idx) }">
                            {{ expert.role.charAt(0) }}
                          </div>
                          <div class="expert-meta">
                            <span class="expert-role">{{ expert.role }}</span>
                            <span class="expert-variant">{{ expert.variant }}</span>
                          </div>
                          <span class="expert-round" v-if="expert.round > 1">R{{ expert.round }}</span>
                        </div>
                        <div class="expert-content">
                          <p>{{ expert.content }}</p>
                        </div>
                        <div v-if="(msg._expandedExpert === expert.id || isInExpandedRow(msg, expert.id, idx)) && expert.thoughts" class="expert-thoughts">
                          <div class="thoughts-label">Reasoning</div>
                          <p>{{ expert.thoughts }}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- References Section -->
                  <div v-if="msg.searchResults && msg.searchResults.length > 0" class="references-section">
                    <button class="references-toggle" @click="toggleReferences(msg)">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                      <span>{{ msg.searchResults.length }} 条参考文献</span>
                      <svg class="chevron" :class="{ rotated: msg._showReferences }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </button>

                    <div v-if="msg._showReferences" class="references-list">
                      <div
                        v-for="(ref, idx) in msg.searchResults"
                        :key="idx"
                        class="reference-item"
                      >
                        <div class="reference-number">[{{ idx + 1 }}]</div>
                        <div class="reference-content">
                          <a :href="ref.url" target="_blank" rel="noopener noreferrer" class="reference-title">
                            {{ ref.title }}
                          </a>
                          <p class="reference-snippet">{{ ref.snippet }}</p>
                          <div class="reference-meta">
                            <span class="reference-url">{{ formatUrl(ref.url) }}</span>
                            <span v-if="ref.score" class="reference-score">相关度: {{ (ref.score * 100).toFixed(0) }}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Message Footer -->
                  <div class="message-footer" v-if="msg.duration || msg.rounds">
                    <span v-if="msg.duration" class="footer-item">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                      {{ formatDuration(msg.duration) }}
                    </span>
                    <span v-if="msg.rounds" class="footer-item">{{ msg.rounds }} rounds</span>
                  </div>
                </div>
              </div>
            </template>
          </div>

          <!-- Thinking State -->
          <div v-if="thinking.active" class="message assistant thinking-message">
            <div class="message-bubble assistant-bubble">
              <div class="avatar thinking">
                <svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 12a9 9 0 11-6.219-8.56"/>
                </svg>
              </div>
              <div class="message-body">
                <!-- Process Flow -->
                <div class="process-flow">
                  <div class="process-header">
                    <span class="process-status">{{ getStatusText() }}</span>
                    <span class="process-timer">{{ formatTimer() }}</span>
                  </div>
                  <div class="process-steps">
                    <div
                      v-for="step in processSteps"
                      :key="step.id"
                      class="process-step"
                      :class="step.status"
                    >
                      <div class="step-indicator">
                        <svg v-if="step.status === 'completed'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <div v-else-if="step.status === 'active'" class="step-spinner"></div>
                        <div v-else class="step-dot"></div>
                      </div>
                      <span class="step-name">{{ step.name }}</span>
                    </div>
                  </div>
                </div>

                <!-- Live Experts Grid -->
                <div v-if="thinking.experts.length > 0" class="live-experts">
                  <div class="live-experts-header">
                    <span>{{ thinking.experts.length }} 位专家已完成</span>
                  </div>
                  <div class="live-experts-grid">
                    <div
                      v-for="(expert, idx) in thinking.experts"
                      :key="expert.id"
                      class="live-expert-card"
                      :class="{ expanded: thinking._expandedExpert === expert.id, loading: expert.status === 'pending' }"
                      :style="{ '--accent-color': getExpertColor(idx) }"
                      @click="expert.status !== 'pending' && toggleLiveExpertExpand(expert.id)"
                    >
                      <div class="live-expert-header">
                        <div class="live-expert-icon" :style="{ background: getExpertColor(idx) }">
                          <span v-if="expert.status === 'pending'" class="loading-spinner"></span>
                          <span v-else>{{ expert.role.charAt(0) }}</span>
                        </div>
                        <div class="live-expert-info">
                          <span class="live-expert-role">{{ expert.role }}</span>
                          <span class="live-expert-variant">{{ expert.variant === 'conservative' ? '保守' : '创新' }}</span>
                        </div>
                        <svg v-if="expert.status === 'completed'" class="live-expert-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span v-else-if="expert.status === 'pending'" class="live-expert-status">等待中...</span>
                      </div>
                      <div v-if="thinking._expandedExpert === expert.id && expert.status === 'completed'" class="live-expert-content">
                        <div v-if="expert.thoughts" class="live-expert-thoughts">
                          <div class="thoughts-label">思考过程</div>
                          <p>{{ expert.thoughts }}</p>
                        </div>
                        <div class="live-expert-response">
                          <div class="thoughts-label">专家意见</div>
                          <p>{{ expert.content }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Live Output -->
                <div v-if="thinking.liveOutput" class="live-output">
                  <div class="markdown-body" v-html="renderMarkdown(thinking.liveOutput)"></div>
                  <span class="typing-cursor"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <textarea
            ref="inputRef"
            v-model="userInput"
            @keydown="handleKeydown"
            @input="autoResize"
            placeholder="Ask anything..."
            :disabled="isLoading"
            rows="1"
          ></textarea>
          <button
            class="send-btn"
            :class="{ loading: isLoading }"
            @click="isLoading ? stopGeneration() : sendMessage()"
            :disabled="!userInput.trim() && !isLoading"
          >
            <svg v-if="!isLoading" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>
        </div>
        <p class="disclaimer">DeepThink may produce inaccurate information. Verify important facts.</p>
      </div>
    </main>

    <!-- Sidebar Overlay -->
    <div class="sidebar-overlay" :class="{ visible: sidebarOpen }" @click="sidebarOpen = false"></div>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useChatStore } from '@/stores/chatStore';
import { api } from '@/services/api';
import { useWebSocket } from '@/composables/useWebSocket';
import { EXPERT_COLORS, type Message, type ProcessStep } from '@/types/chat';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
});

const chatStore = useChatStore();
const { connect, send, disconnect } = useWebSocket();

const sidebarOpen = ref(false);
const userInput = ref('');
const chatAreaRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const sessions = computed(() => chatStore.sortedSessions);
const currentSessionId = computed(() => chatStore.currentSessionId);
const messages = computed(() => chatStore.currentMessages);
const isLoading = computed(() => chatStore.isLoading);
const thinking = computed(() => chatStore.thinking);


const processSteps = computed<ProcessStep[]>(() => {
  const steps = ['planner', 'search', 'experts', 'critic', 'reviewer', 'synthesizer'];
  const stepNames: Record<string, string> = {
    planner: '规划',
    search: '搜索',
    experts: '专家',
    critic: '批评',
    reviewer: '评审',
    synthesizer: '综合',
  };
  const currentNode = thinking.value.currentNode;
  const currentIndex = steps.indexOf(currentNode);

  return steps.map((step, index) => ({
    id: step,
    name: stepNames[step] || step,
    status: index < currentIndex ? 'completed' :
            index === currentIndex ? 'active' : 'pending',
  }));
});

function renderMarkdown(content: string): string {
  if (!content) return '';
  return md.render(content);
}

function getExpertColor(index: number): string {
  return EXPERT_COLORS[index % EXPERT_COLORS.length];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}m ${secs}s`;
}

function formatTimer(): string {
  if (!thinking.value.startTime) return '0s';
  const elapsed = Date.now() - thinking.value.startTime;
  return formatDuration(elapsed);
}

function getStatusText(): string {
  const statusMap: Record<string, string> = {
    connecting: '连接中...',
    planning: '规划策略中...',
    planner: '规划策略中...',
    search: '🔍 搜索相关信息...',
    experts: '专家分析中...',
    critic: '审查分析中...',
    reviewer: '质量评估中...',
    synthesizer: '综合结果中...',
    completed: '完成',
    error: '发生错误',
  };
  return statusMap[thinking.value.currentNode] || statusMap[thinking.value.status] || '处理中...';
}

function toggleExperts(msg: Message) {
  msg._showExperts = !msg._showExperts;
}

function toggleReferences(msg: Message) {
  msg._showReferences = !msg._showReferences;
}

function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url;
  }
}

function toggleExpertExpand(msg: Message, expertId: string) {
  msg._expandedExpert = msg._expandedExpert === expertId ? null : expertId;
}

function isInExpandedRow(msg: Message, expertId: string, idx: number): boolean {
  if (!msg._expandedExpert) return false;

  // 找到展开的专家的索引
  const expandedIdx = msg.experts?.findIndex(e => e.id === msg._expandedExpert);
  if (expandedIdx === undefined || expandedIdx === -1) return false;

  // 计算每行2个，判断是否在同一行
  const expandedRow = Math.floor(expandedIdx / 2);
  const currentRow = Math.floor(idx / 2);

  return expandedRow === currentRow && expertId !== msg._expandedExpert;
}

function toggleLiveExpertExpand(expertId: string) {
  const thinking = chatStore.thinking;
  if (thinking._expandedExpert === expertId) {
    thinking._expandedExpert = null;
  } else {
    thinking._expandedExpert = expertId;
  }
  chatStore.updateThinking({ _expandedExpert: thinking._expandedExpert });
}

function createNewChat() {
  chatStore.createSession();
  sidebarOpen.value = false;
}

function selectSession(sessionId: string) {
  chatStore.selectSession(sessionId);
  sidebarOpen.value = false;
}

function deleteSession(sessionId: string) {
  if (confirm('Delete this conversation?')) {
    chatStore.deleteSession(sessionId);
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize() {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
    inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 200) + 'px';
  }
}

async function sendMessage() {
  const query = userInput.value.trim();
  if (!query || isLoading.value) return;

  userInput.value = '';
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
  }

  const userMessage: Message = {
    id: Date.now().toString(),
    role: 'user',
    content: query,
    timestamp: Date.now(),
  };
  chatStore.addMessage(userMessage);
  chatStore.setLoading(true);
  chatStore.startThinking();

  await nextTick();
  scrollToBottom();

  await sendMessageStreaming(query);
}

async function sendMessageStreaming(query: string) {
  const startTime = Date.now();

  try {
    const wsUrl = api.getWebSocketUrl();

    await connect(
      wsUrl,
      (data) => handleWebSocketMessage(data, startTime),
            (_err) => {
        chatStore.updateThinking({ status: 'error', error: '连接失败' });
        finishThinking(startTime, '连接失败，请重试。');
      }
    );

    send({ query, maxRounds: 1 });
  } catch (err: any) {
    finishThinking(startTime, err.message || '连接失败');
  }
}

function handleWebSocketMessage(data: any, startTime: number) {
  if (data.type === 'state_update') {
    chatStore.updateThinking({
      status: data.node || data.status,
      currentNode: data.node || '',
      round: data.round || chatStore.thinking.round,
    });

    // 如果是 experts 节点开始，清空并初始化专家卡片
    if (data.node === 'experts' && data.data?.expertsConfig) {
      // 先清空之前的专家
      chatStore.updateThinking({ experts: [] });

      const expertsConfig = data.data.expertsConfig;
      for (const config of expertsConfig) {
        chatStore.addExpert({
          id: `expert-pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: config.role,
          variant: config.variant || 'standard',
          thoughts: '',
          content: '',
          round: data.round || 1,
          status: 'pending',
        });
      }
    }

    scrollToBottom();
  } else if (data.type === 'expert_complete') {
    // 实时接收并更新专家内容
    chatStore.updateExpert(data.data);
    scrollToBottom();
  } else if (data.type === 'complete') {
    const duration = Date.now() - startTime;
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: data.data?.final_output || 'No response generated.',
      experts: data.data?.experts || chatStore.thinking.experts,
      searchResults: data.data?.searchResults || [],
      synthesisThoughts: data.data?.synthesis_thoughts,
      reviewScore: data.data?.review_score,
      rounds: data.data?.rounds,
      duration,
      timestamp: Date.now(),
    };

    chatStore.addMessage(aiMessage);
    chatStore.setLoading(false);
    chatStore.resetThinking();

    disconnect();
    scrollToBottom();
  } else if (data.type === 'error') {
    finishThinking(startTime, data.message || '发生错误');

    disconnect();
  }
}

function finishThinking(_startTime: number, errorMessage: string) {
  chatStore.addMessage({
    id: (Date.now() + 1).toString(),
    role: 'assistant',
    content: errorMessage,
    timestamp: Date.now(),
  });
  chatStore.setLoading(false);
  chatStore.resetThinking();
}

function stopGeneration() {
  disconnect();
  chatStore.setLoading(false);
  chatStore.resetThinking();
}

function scrollToBottom() {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight;
    }
  });
}

watch(messages, () => {
  scrollToBottom();
}, { deep: true });

onMounted(() => {
  if (sessions.value.length === 0) {
    chatStore.createSession();
  }
  scrollToBottom();
});
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--bg-primary);
}

/* Sidebar */
.sidebar {
  width: 280px;
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.sidebar-header {
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
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

.logo-text {
  font-weight: 600;
  font-size: 16px;
  color: var(--text-primary);
}

.close-sidebar {
  display: none;
  padding: 6px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
}

.close-sidebar:hover {
  background: var(--bg-tertiary);
}

.new-chat-btn {
  margin: 12px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.new-chat-btn:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-sessions {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--text-muted);
  text-align: center;
}

.empty-sessions p {
  margin-top: 12px;
  font-size: 13px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s ease;
}

.session-item:hover {
  background: var(--bg-tertiary);
}

.session-item.active {
  background: var(--accent-soft);
}

.session-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.session-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.session-title {
  font-size: 13px;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-date {
  font-size: 11px;
  color: var(--text-muted);
}

.delete-session {
  opacity: 0;
  padding: 4px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: opacity 0.15s;
}

.session-item:hover .delete-session {
  opacity: 1;
}

.delete-session:hover {
  color: var(--danger);
  background: var(--danger-soft);
}

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
}

.admin-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  transition: all 0.15s;
}

.admin-link:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  text-decoration: none;
}

/* Main Content */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* Header */
.header {
  height: 56px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-secondary);
}

.menu-btn {
  display: none;
  padding: 8px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-md);
}

.menu-btn:hover {
  background: var(--bg-tertiary);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-title svg {
  color: var(--accent);
}

.header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 12px;
}

.stream-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.stream-toggle input {
  display: none;
}

.toggle-slider {
  width: 36px;
  height: 20px;
  background: var(--bg-tertiary);
  border-radius: 10px;
  position: relative;
  transition: background 0.2s;
}

.toggle-slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--text-secondary);
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}

.stream-toggle input:checked + .toggle-slider {
  background: var(--accent);
}

.stream-toggle input:checked + .toggle-slider::after {
  transform: translateX(16px);
  background: white;
}

.toggle-label {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Chat Area */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  animation: fadeIn 0.4s ease;
}

.empty-icon {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  border-radius: 20px;
  margin-bottom: 20px;
  color: var(--accent);
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 32px;
}

.features {
  display: flex;
  gap: 16px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  font-size: 13px;
  color: var(--text-secondary);
}

.feature svg {
  color: var(--accent);
}

/* Messages */
.messages-container {
  max-width: 800px;
  margin: 0 auto;
}

.message {
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
}

.message-bubble {
  display: flex;
  gap: 12px;
}

.user-bubble {
  justify-content: flex-end;
}

.user-bubble .message-content {
  max-width: 70%;
  padding: 12px 16px;
  background: var(--accent);
  color: white;
  border-radius: 18px 18px 4px 18px;
  font-size: 15px;
  line-height: 1.5;
}

.assistant-bubble .avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border-radius: 50%;
  color: var(--accent);
}

.assistant-bubble .avatar.thinking {
  background: var(--accent-soft);
}

.assistant-bubble .message-body {
  flex: 1;
  min-width: 0;
}

.spin {
  animation: spin 1s linear infinite;
}

/* Experts Section */
.experts-section {
  margin-top: 16px;
}

.experts-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.experts-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--text-primary);
}

.chevron {
  margin-left: auto;
  transition: transform 0.2s;
}

.chevron.rotated {
  transform: rotate(180deg);
}

.experts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  margin-top: 12px;
}

.expert-card {
  padding: 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.expert-card:hover {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 1px var(--accent-color);
}

.expert-card.expanded {
  border-color: var(--accent-color);
}

.expert-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.expert-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: white;
  font-weight: 600;
  font-size: 13px;
}

.expert-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.expert-role {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.expert-variant {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: capitalize;
}

.expert-round {
  font-size: 10px;
  padding: 2px 6px;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--radius-full);
  font-weight: 500;
}

.expert-content {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.expert-card.expanded .expert-content {
  -webkit-line-clamp: unset;
  max-height: 300px;
  overflow-y: auto;
}

.expert-thoughts {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  max-height: 200px;
  overflow-y: auto;
}

.thoughts-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.expert-thoughts p {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  font-family: var(--font-mono);
}

/* References Section */
.references-section {
  margin-top: 16px;
}

.references-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}

.references-toggle:hover {
  background: var(--bg-hover);
  border-color: var(--accent);
  color: var(--text-primary);
}

.references-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reference-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: all 0.15s;
}

.reference-item:hover {
  background: var(--bg-hover);
  border-color: var(--accent-soft);
}

.reference-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-soft);
  color: var(--accent);
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.reference-content {
  flex: 1;
  min-width: 0;
}

.reference-title {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  text-decoration: none;
  margin-bottom: 6px;
  transition: color 0.15s;
}

.reference-title:hover {
  color: var(--accent-hover);
  text-decoration: underline;
}

.reference-snippet {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.reference-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
}

.reference-url {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reference-score {
  padding: 2px 6px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-weight: 500;
}

/* Message Footer */
.message-footer {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

/* Process Flow */
.process-flow {
  padding: 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}

.process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.process-status {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.process-timer {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
}

.process-steps {
  display: flex;
  gap: 8px;
}

.process-step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.step-indicator {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-secondary);
  border: 2px solid var(--border);
}

.process-step.completed .step-indicator {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

.process-step.active .step-indicator {
  border-color: var(--accent);
  animation: pulseGlow 2s ease-in-out infinite;
}

.step-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid var(--accent);
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.step-dot {
  width: 6px;
  height: 6px;
  background: var(--text-muted);
  border-radius: 50%;
}

.step-name {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.process-step.active .step-name,
.process-step.completed .step-name {
  color: var(--accent);
}

/* Live Experts */
.live-experts {
  margin-bottom: 16px;
}

.live-experts-header {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.live-experts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.live-expert-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
}

.live-expert-card:hover {
  background: var(--bg-hover);
  border-color: var(--accent-soft);
}

.live-expert-card.expanded {
  border-color: var(--accent-color);
}

.live-expert-card.loading {
  opacity: 0.6;
  cursor: default;
}

.live-expert-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.live-expert-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.live-expert-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.live-expert-role {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-expert-variant {
  font-size: 11px;
  color: var(--text-muted);
}

.live-expert-check {
  color: var(--accent);
  flex-shrink: 0;
}

.live-expert-status {
  font-size: 11px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.loading-spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.live-expert-content {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  max-height: 300px;
  overflow-y: auto;
}

.live-expert-thoughts {
  margin-bottom: 12px;
}

.live-expert-thoughts p,
.live-expert-response p {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-top: 6px;
  max-height: 150px;
  overflow-y: auto;
}

.live-expert-response {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

/* Live Output */
.live-output {
  position: relative;
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--accent);
  animation: typing 1s infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
}

/* Input Area */
.input-area {
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border);
  background: var(--bg-primary);
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-2xl);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-container:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.input-container textarea {
  flex: 1;
  min-height: 24px;
  max-height: 200px;
  padding: 0;
  background: none;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
}

.input-container textarea::placeholder {
  color: var(--text-muted);
}

.send-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.send-btn:disabled {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  cursor: not-allowed;
}

.send-btn.loading {
  background: var(--danger);
}

.disclaimer {
  max-width: 800px;
  margin: 12px auto 0;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
}

/* Sidebar Overlay */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 40;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.sidebar-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    z-index: 50;
    transform: translateX(-100%);
  }

  .sidebar.sidebar-open {
    transform: translateX(0);
  }

  .close-sidebar {
    display: block;
  }

  .menu-btn {
    display: block;
  }

  .sidebar-overlay {
    display: block;
  }

  .sidebar-overlay:not(.visible) {
    pointer-events: none;
    opacity: 0;
  }

  .header-title span {
    display: none;
  }

  .features {
    flex-direction: column;
  }

  .experts-grid {
    grid-template-columns: 1fr;
  }

  .live-experts-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  /* 移动端触摸优化 */
  button, .expert-card, .live-expert-card, .reference-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }

  /* 确保按钮可点击 */
  .send-btn, .menu-btn, .new-chat-btn, .settings-btn {
    min-height: 44px;
    min-width: 44px;
  }

  /* 输入框优化 */
  .input-container {
    position: relative;
    z-index: 1;
  }

  /* 防止侧边栏遮挡 */
  .main-content {
    position: relative;
    z-index: 1;
  }
}

</style>
