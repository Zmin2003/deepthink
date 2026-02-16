export interface Session {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  experts?: ExpertResult[];
  searchResults?: SearchResult[];
  synthesisThoughts?: string;
  reviewScore?: number;
  rounds?: number;
  duration?: number;
  timestamp: number;
  _showExperts?: boolean;
  _expandedExpert?: string | null;
  _showReferences?: boolean;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface ExpertResult {
  id: string;
  role: string;
  variant: 'conservative' | 'creative' | 'standard';
  thoughts: string;
  content: string;
  round: number;
  status: 'completed' | 'error' | 'pending';
  temperature?: number;
  description?: string;
}

export interface ThinkingState {
  active: boolean;
  status: 'idle' | 'connecting' | 'planning' | 'experts' | 'critic' | 'reviewer' | 'synthesizer' | 'completed' | 'error';
  currentNode: string;
  round: number;
  experts: ExpertResult[];
  plannerThoughts: string;
  selectedPlan: string;
  criticFeedback: string;
  reviewScore: number;
  liveOutput: string;
  startTime: number;
  error: string;
  _expandedExpert?: string | null;
}

export interface ProcessStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed';
}

export const NODE_NAMES: Record<string, string> = {
  planner: 'Planning',
  experts: 'Experts',
  critic: 'Critic',
  reviewer: 'Review',
  synthesizer: 'Synthesis',
};

export const EXPERT_COLORS = [
  '#667eea',
  '#f093fb',
  '#4facfe',
  '#43e97b',
  '#fa709a',
  '#a18cd1',
  '#fccb90',
  '#30cfd0',
  '#a8edea',
  '#fbc2eb',
];
