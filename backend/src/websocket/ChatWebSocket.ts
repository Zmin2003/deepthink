import type { FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';
import { DeepThinkEngine } from '../services/deepthink/DeepThinkEngine.js';

export function setupWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/chat', { websocket: true }, (socket: WebSocket, req) => {
    console.log('WebSocket connection established');

    let isProcessing = false;

    socket.on('message', async (message) => {
      try {
        const msgStr = message.toString();
        console.log('Raw message received:', msgStr);

        const data = JSON.parse(msgStr);

        // 忽略 ping 消息
        if (data.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // 如果正在处理中，忽略新消息
        if (isProcessing) {
          console.log('Already processing, ignoring message');
          return;
        }

        const query = data.query;

        if (!query) {
          console.log('No query in message, ignoring');
          return;
        }

        console.log('Received query:', query);

        isProcessing = true;
        const engine = new DeepThinkEngine();

        try {
          // 构建配置，只包含有值的字段（避免 undefined 覆盖数据库配置）
          const streamConfig: any = { maxRounds: data.maxRounds || 1 };
          if (data.model) streamConfig.defaultModel = data.model;
          if (data.apiKey) streamConfig.apiKey = data.apiKey;
          if (data.baseUrl) streamConfig.baseUrl = data.baseUrl;

          // 流式执行
          for await (const update of engine.stream(query, streamConfig)) {
            if (socket.readyState !== 1) {
              console.log('WebSocket closed, stopping');
              break;
            }

            if (update.type === 'node_start') {
              socket.send(JSON.stringify({
                type: 'state_update',
                node: update.node,
                status: 'started',
                data: update.data || {},
              }));
            } else if (update.type === 'expert_complete') {
              socket.send(JSON.stringify({
                type: 'expert_complete',
                data: update.data,
              }));
            } else if (update.type === 'node_complete') {
              const nodeCompleteData: any = {
                type: 'state_update',
                node: update.node,
                status: 'completed',
              };
              // 搜索节点完成时发送搜索结果
              if (update.node === 'search' && update.state?.searchResults) {
                nodeCompleteData.searchResults = update.state.searchResults;
              }
              socket.send(JSON.stringify(nodeCompleteData));
            } else if (update.type === 'complete') {
              socket.send(JSON.stringify({
                type: 'complete',
                data: {
                  final_output: update.state?.finalOutput,
                  experts: update.state?.expertsOutput,
                  searchResults: update.state?.searchResults,
                },
              }));
            }
          }
        } finally {
          isProcessing = false;
        }
      } catch (error: any) {
        console.error('WebSocket error:', error);
        if (socket.readyState === 1) {
          socket.send(JSON.stringify({
            type: 'error',
            message: error.message || 'Unknown error',
          }));
        }
      }
    });

    socket.on('close', () => {
      console.log('WebSocket connection closed');
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}
