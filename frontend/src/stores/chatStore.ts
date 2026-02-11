import { defineStore } from 'pinia';
import type { Session, Message, ThinkingState, ExpertResult } from '@/types/chat';

const STORAGE_KEY = 'deepthink_sessions';
const SAVE_DEBOUNCE_MS = 300;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

function loadFromStorage(): { sessions: Session[]; sessionsData: Record<string, Message[]> } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load sessions from storage:', e);
  }
  return { sessions: [], sessionsData: {} };
}

/**
 * Debounced save: avoids hammering localStorage.setItem on rapid updates
 * (e.g., during streaming expert responses that trigger multiple updateLastMessage calls).
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveToStorage(sessions: Session[], sessionsData: Record<string, Message[]>) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, sessionsData }));
    } catch (e) {
      console.error('Failed to save sessions to storage:', e);
    }
    saveTimer = null;
  }, SAVE_DEBOUNCE_MS);
}

/**
 * Immediate save for critical operations (session creation/deletion).
 */
function saveToStorageImmediate(sessions: Session[], sessionsData: Record<string, Message[]>) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ sessions, sessionsData }));
  } catch (e) {
    console.error('Failed to save sessions to storage:', e);
  }
}

export const useChatStore = defineStore('chat', {
  state: () => {
    const { sessions, sessionsData } = loadFromStorage();
    return {
      sessions: sessions as Session[],
      sessionsData: sessionsData as Record<string, Message[]>,
      currentSessionId: sessions.length > 0 ? sessions[0].id : null as string | null,
      isLoading: false,
      thinking: {
        active: false,
        status: 'idle',
        currentNode: '',
        round: 0,
        experts: [],
        plannerThoughts: '',
        selectedPlan: '',
        criticFeedback: '',
        reviewScore: 0,
        liveOutput: '',
        startTime: 0,
        error: '',
      } as ThinkingState,
    };
  },

  getters: {
    currentSession(state): Session | null {
      return state.sessions.find(s => s.id === state.currentSessionId) || null;
    },

    currentMessages(state): Message[] {
      if (!state.currentSessionId) return [];
      return state.sessionsData[state.currentSessionId] || [];
    },

    sortedSessions(state): Session[] {
      return [...state.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
    },
  },

  actions: {
    createSession(title?: string): Session {
      const now = Date.now();
      const session: Session = {
        id: generateId(),
        title: title || 'New Chat',
        createdAt: now,
        updatedAt: now,
      };

      this.sessions.unshift(session);
      this.sessionsData[session.id] = [];
      this.currentSessionId = session.id;
      this.saveStateImmediate();

      return session;
    },

    deleteSession(sessionId: string) {
      const index = this.sessions.findIndex(s => s.id === sessionId);
      if (index !== -1) {
        this.sessions.splice(index, 1);
        delete this.sessionsData[sessionId];

        if (this.currentSessionId === sessionId) {
          this.currentSessionId = this.sessions.length > 0 ? this.sessions[0].id : null;
        }

        this.saveStateImmediate();
      }
    },

    selectSession(sessionId: string) {
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        this.currentSessionId = sessionId;
      }
    },

    updateSessionTitle(sessionId: string, title: string) {
      const session = this.sessions.find(s => s.id === sessionId);
      if (session) {
        session.title = title;
        session.updatedAt = Date.now();
        this.saveState();
      }
    },

    addMessage(message: Message) {
      if (!this.currentSessionId) {
        this.createSession();
      }

      if (this.currentSessionId) {
        if (!this.sessionsData[this.currentSessionId]) {
          this.sessionsData[this.currentSessionId] = [];
        }

        this.sessionsData[this.currentSessionId].push(message);

        const session = this.sessions.find(s => s.id === this.currentSessionId);
        if (session) {
          session.updatedAt = Date.now();
          if (message.role === 'user' && session.title === 'New Chat') {
            session.title = message.content.substring(0, 50) + (message.content.length > 50 ? '...' : '');
          }
        }

        this.saveState();
      }
    },

    updateLastMessage(updates: Partial<Message>) {
      if (this.currentSessionId) {
        const messages = this.sessionsData[this.currentSessionId];
        if (messages && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          Object.assign(lastMsg, updates);
          this.saveState();
        }
      }
    },

    clearCurrentSession() {
      if (this.currentSessionId) {
        this.sessionsData[this.currentSessionId] = [];
        this.saveStateImmediate();
      }
    },

    setLoading(loading: boolean) {
      this.isLoading = loading;
    },

    startThinking() {
      this.thinking = {
        active: true,
        status: 'connecting',
        currentNode: '',
        round: 0,
        experts: [],
        plannerThoughts: '',
        selectedPlan: '',
        criticFeedback: '',
        reviewScore: 0,
        liveOutput: '',
        startTime: Date.now(),
        error: '',
      };
    },

    updateThinking(updates: Partial<ThinkingState>) {
      Object.assign(this.thinking, updates);
    },

    addExpert(expert: ExpertResult) {
      const existing = this.thinking.experts.find(e => e.id === expert.id);
      if (existing) {
        Object.assign(existing, expert);
      } else {
        this.thinking.experts.push(expert);
      }
    },

    updateExpert(expert: ExpertResult) {
      // 查找并更新 pending 状态的专家
      const existingIdx = this.thinking.experts.findIndex(e =>
        e.role === expert.role && e.variant === expert.variant && e.status === 'pending'
      );

      if (existingIdx !== -1) {
        // 更新现有的 pending 专家
        this.thinking.experts[existingIdx] = expert;
      } else {
        // 如果没找到 pending 的，就添加新的
        this.thinking.experts.push(expert);
      }
    },

    resetThinking() {
      this.thinking = {
        active: false,
        status: 'idle',
        currentNode: '',
        round: 0,
        experts: [],
        plannerThoughts: '',
        selectedPlan: '',
        criticFeedback: '',
        reviewScore: 0,
        liveOutput: '',
        startTime: 0,
        error: '',
      };
    },

    saveState() {
      saveToStorage(this.sessions, this.sessionsData);
    },

    saveStateImmediate() {
      saveToStorageImmediate(this.sessions, this.sessionsData);
    },
  },
});
