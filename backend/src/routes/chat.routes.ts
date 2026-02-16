import { FastifyInstance } from 'fastify';
import { DeepThinkEngine } from '../services/deepthink/DeepThinkEngine.js';
import { z } from 'zod';

const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1).max(50000),
  })).min(1),
  stream: z.boolean().optional(),
  model: z.string().max(100).optional(),
  maxRounds: z.number().min(1).max(10).optional(),
});

const DeepThinkRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(50000, 'Query too long'),
  maxRounds: z.number().min(1).max(10).optional(),
  model: z.string().max(100).optional(),
});

export async function chatRoutes(fastify: FastifyInstance) {
  const engine = new DeepThinkEngine();

  // OpenAI 兼容的聊天端点
  fastify.post('/v1/chat/completions', async (request, reply) => {
    let body;
    try {
      body = ChatRequestSchema.parse(request.body);
    } catch (err: any) {
      return reply.code(400).send({
        error: 'Invalid request',
        details: err.errors || err.message,
      });
    }
    const { messages, stream, model, maxRounds } = body;

    // 提取最后一条用户消息作为查询
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (!lastUserMessage) {
      return reply.code(400).send({ error: 'No user message found' });
    }

    const query = lastUserMessage.content;

    if (stream) {
      // SSE 流式响应
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

      let accumulatedOutput = '';

      for await (const update of engine.stream(query, { maxRounds, model })) {
        if (update.type === 'node_complete' && update.data?.finalOutput) {
          const newContent = update.data.finalOutput.slice(accumulatedOutput.length);
          if (newContent) {
            accumulatedOutput = update.data.finalOutput;
            const chunk = {
              id: 'chatcmpl-' + Date.now(),
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model || 'deepthink',
              choices: [{
                delta: { content: newContent },
                index: 0,
                finish_reason: null,
              }],
            };
            reply.raw.write(`data: ${JSON.stringify(chunk)}\n\n`);
          }
        } else if (update.type === 'complete') {
          const finalChunk = {
            id: 'chatcmpl-' + Date.now(),
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: model || 'deepthink',
            choices: [{
              delta: {},
              index: 0,
              finish_reason: 'stop',
            }],
          };
          reply.raw.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
          reply.raw.write('data: [DONE]\n\n');
        }
      }

      reply.raw.end();
      return;
    } else {
      // 非流式响应
      const result = await engine.invoke(query, { maxRounds, model });

      return {
        id: 'chatcmpl-' + Date.now(),
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: model || 'deepthink',
        choices: [{
          message: {
            role: 'assistant',
            content: result.finalOutput,
          },
          index: 0,
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
        },
      };
    }
  });

  // DeepThink 原生端点
  fastify.post('/deepthink/invoke', async (request, reply) => {
    let body;
    try {
      body = DeepThinkRequestSchema.parse(request.body);
    } catch (err: any) {
      return reply.code(400).send({
        error: 'Invalid request',
        details: err.errors || err.message,
      });
    }
    const { query, maxRounds, model } = body;

    try {
      const result = await engine.invoke(query, { maxRounds, model });

      return {
        final_output: result.finalOutput,
        structured_output: result.structuredOutput,
        experts: result.expertsOutput,
        review_score: result.reviewScore,
        rounds: result.round,
        synthesis_thoughts: result.synthesisThoughts,
      };
    } catch (err: any) {
      request.log.error({ err }, 'DeepThink invoke failed');
      return reply.code(500).send({
        error: 'Processing failed',
        message: err.message || 'Unknown error',
      });
    }
  });
}
