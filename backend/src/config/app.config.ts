import dotenv from 'dotenv';

dotenv.config();

export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001'),
    host: process.env.HOST || '0.0.0.0',
  },
  llm: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    defaultModel: process.env.DEFAULT_MODEL || 'gpt-4',
  },
  database: {
    path: process.env.DATABASE_PATH || './data/sessions.db',
  },
  cors: {
    origins: process.env.CORS_ORIGINS === '*' ? true : (process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173']),
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
