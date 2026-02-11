import pino from 'pino';
import { config } from '../config/app.config.js';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Logger: use pino-pretty (human-readable) in dev, raw JSON (faster) in production.
 * pino-pretty adds ~20-30% serialization overhead per log line.
 */
export const logger = pino(
  isDev
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
      }
);
