import { FastifyInstance } from 'fastify';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: Date.now(),
    };
  });
}
