import { createServer } from './server.js';
import { config } from './config/app.config.js';
import { logger } from './utils/logger.js';
import { initConfigStore } from './config/llm.config.js';

async function start() {
  try {
    // 初始化配置存储
    logger.info('Initializing configuration store...');
    await initConfigStore();
    logger.info('Configuration store initialized');

    const server = await createServer();

    await server.listen({
      port: config.server.port,
      host: config.server.host,
    });

    logger.info(`Server listening on http://${config.server.host}:${config.server.port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
}

start();
