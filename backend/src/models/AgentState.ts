export interface AgentState {
  query: string;
  context: string;
  attachments?: Attachment[];

  // Planning
  plannerThoughts?: string;
  planAlternatives?: any[];
  selectedPlan?: any;
  expertsConfig?: ExpertConfig[];

  // Search
  searchResults?: SearchResult[];

  // Execution
  expertsOutput: ExpertResult[];
  criticFeedback?: string[];

  // Iteration control
  round: number;
  maxRounds: number;
  reviewScore?: ReviewScore;
  satisfied: boolean;

  // Synthesis
  synthesisThoughts?: string;
  finalOutput: string;
  structuredOutput?: any;

  // Metadata
  startTime?: number;
  endTime?: number;
  error?: string;

  // Config
  config: any;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface ExpertConfig {
  role: string;
  description: string;
  prompt: string;
  temperature: number;
  variant: 'conservative' | 'creative';
}

export interface ExpertResult {
  id: string;
  role: string;
  variant: 'conservative' | 'creative' | 'standard';
  thoughts: string;
  content: string;
  round: number;
  status: 'completed' | 'error';
}

export interface ReviewScore {
  completeness: number;
  consistency: number;
  confidence: number;
  overall: number;
  satisfied: boolean;
}

export interface Attachment {
  type: 'image';
  mimeType: string;
  data: string;
}

export interface NodeResult {
  [key: string]: any;
}
