import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config/app.config.js';
import { healthRoutes } from './routes/health.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { chatRoutes } from './routes/chat.routes.js';
import { setupWebSocket } from './websocket/ChatWebSocket.js';

const isDev = process.env.NODE_ENV !== 'production';

export async function createServer() {
  const fastify = Fastify({
    logger: isDev
      ? {
          level: config.log.level,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore: 'pid,hostname',
            },
          },
        }
      : {
          level: config.log.level,
        },
  });

  // Register plugins
  await fastify.register(cors, {
    origin: config.cors.origins,
    credentials: true,
  });

  await fastify.register(websocket);

  // Register routes
  await fastify.register(healthRoutes, { prefix: '/api' });
  await fastify.register(adminRoutes, { prefix: '/api' });
  await fastify.register(chatRoutes);

  // Setup WebSocket
  setupWebSocket(fastify);

  return fastify;
}
