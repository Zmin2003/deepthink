import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import multipart from '@fastify/multipart';
import { config } from './config/app.config.js';
import { healthRoutes } from './routes/health.routes.js';
import { adminRoutes } from './routes/admin.routes.js';
import { chatRoutes } from './routes/chat.routes.js';
import { setupWebSocket } from './websocket/ChatWebSocket.js';
import { logger } from './utils/logger.js';

const isDev = process.env.NODE_ENV !== 'production';

/** Simple in-memory sliding-window rate limiter per IP */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '60');

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, entry);
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Periodically clean up expired rate-limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60_000);

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
    // Enterprise: request body size limit
    bodyLimit: 10 * 1024 * 1024, // 10MB
    // Request timeout (5 minutes for long-running DeepThink queries)
    requestTimeout: 300_000,
  });

  // ──────── Plugins ────────
  await fastify.register(cors, {
    origin: config.cors.origins,
    credentials: true,
  });

  await fastify.register(websocket);

  await fastify.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB max file
      files: 5,
    },
  });

  // ──────── Global Hooks ────────

  // Request ID injection for traceability
  fastify.addHook('onRequest', async (request, reply) => {
    (request as any).requestId = request.id;
    reply.header('X-Request-Id', request.id);
  });

  // Rate limiting (skip WebSocket upgrade requests)
  fastify.addHook('onRequest', async (request, reply) => {
    if (request.headers.upgrade) return; // skip WS
    const ip = request.ip || 'unknown';
    if (!checkRateLimit(ip)) {
      reply.code(429).send({
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} requests per minute.`,
      });
      return;
    }
  });

  // Security headers
  fastify.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '1; mode=block');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!isDev) {
      reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
  });

  // ──────── Global Error Handler ────────
  fastify.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const isValidation = error.validation !== undefined;

    if (statusCode >= 500) {
      logger.error({ err: error, requestId: request.id, url: request.url }, 'Internal server error');
    } else {
      logger.warn({ err: error, requestId: request.id, url: request.url }, 'Client error');
    }

    reply.code(statusCode).send({
      error: isValidation ? 'Validation Error' : error.message || 'Internal Server Error',
      statusCode,
      requestId: request.id,
      ...(isDev && !isValidation ? { stack: error.stack } : {}),
    });
  });

  // ──────── Routes ────────
  await fastify.register(healthRoutes, { prefix: '/api' });
  await fastify.register(adminRoutes, { prefix: '/api' });
  await fastify.register(chatRoutes);

  // Setup WebSocket
  setupWebSocket(fastify);

  return fastify;
}
