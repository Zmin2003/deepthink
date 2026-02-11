import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { configStore } from '../config/llm.config.js';
import { z } from 'zod';
import {
  generateToken,
  verifyPassword,
  hashPassword,
  authMiddleware,
  adminGuard,
  JWTPayload
} from '../middleware/auth.middleware.js';
import { LLMFactory } from '../services/llm/LLMFactory.js';

const LLMConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']).optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  defaultModel: z.string().optional(),
});

const SystemParamsSchema = z.object({
  maxRounds: z.number().min(1).max(10).optional(),
  qualityThreshold: z.number().min(0).max(1).optional(),
  planningLevel: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
  expertLevel: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
  synthesisLevel: z.enum(['minimal', 'low', 'medium', 'high']).optional(),
});

const SearchConfigSchema = z.object({
  provider: z.enum(['exa', 'tavily', 'none']).optional(),
  exaApiKey: z.string().optional(),
  tavilyApiKey: z.string().optional(),
  maxResults: z.number().min(1).max(20).optional(),
  enabled: z.boolean().optional(),
});

const LoginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

const UpdateAdminAccountSchema = z.object({
  username: z.string().min(3),
  newPassword: z.string().min(6).optional(),
});

/**
 * 脱敏API密钥 - 只显示最后4位
 */
function maskApiKey(key: string | undefined): string | undefined {
  if (!key || key.length < 8) return key ? '***' : undefined;
  return '***' + key.slice(-4);
}

/**
 * 脱敏配置对象中的敏感字段
 */
function maskSensitiveConfig(config: any): any {
  return {
    ...config,
    apiKey: maskApiKey(config.apiKey),
    exaApiKey: maskApiKey(config.exaApiKey),
    tavilyApiKey: maskApiKey(config.tavilyApiKey),
  };
}

export async function adminRoutes(fastify: FastifyInstance) {
  // ==================== 公开路由 ====================

  // 登录 - 不需要认证
  fastify.post('/admin/login', async (request, reply) => {
    const { username, password } = LoginSchema.parse(request.body);

    const user = configStore.verifyUser(username, password);

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // 生成JWT Token
    const token = generateToken({
      userId: String(user.id),
      username: user.username,
      role: user.role as 'admin' | 'user',
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      token,
    };
  });

  // ==================== 受保护路由 ====================
  // 以下所有路由都需要JWT认证 + 管理员权限

  // 认证钩子 - 应用于所有非登录的admin路由
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const urlPath = request.url.split('?')[0];
    const isAdminRoute = urlPath.includes('/admin');
    const isLoginRoute = request.method === 'POST' && urlPath.endsWith('/admin/login');

    // 跳过登录路由
    if (isLoginRoute) {
      return;
    }

    // 其他admin路由需要认证
    if (isAdminRoute) {
      await authMiddleware(request, reply);
      if (reply.sent) return;
      await adminGuard(request, reply);
    }
  });

  // 获取所有配置 - 脱敏返回
  fastify.get('/admin/config', async (request, reply) => {
    const llmConfig = configStore.getLLMConfig();
    const searchConfig = configStore.getSearchConfig();

    return {
      llm: maskSensitiveConfig(llmConfig),
      system: configStore.getSystemParams(),
      search: maskSensitiveConfig(searchConfig),
    };
  });

  // 更新 LLM 配置
  fastify.put('/admin/config/llm', async (request, reply) => {
    const config = LLMConfigSchema.parse(request.body);
    configStore.setLLMConfig(config);
    // Invalidate cached LLM provider instances since config changed
    LLMFactory.clearCache();
    return { success: true, config: maskSensitiveConfig(configStore.getLLMConfig()) };
  });

  // 更新系统参数
  fastify.put('/admin/config/system', async (request, reply) => {
    const params = SystemParamsSchema.parse(request.body);
    configStore.setSystemParams(params);
    return { success: true, params: configStore.getSystemParams() };
  });

  // 获取搜索配置 - 脱敏返回
  fastify.get('/admin/config/search', async (request, reply) => {
    return maskSensitiveConfig(configStore.getSearchConfig());
  });

  // 更新搜索配置
  fastify.put('/admin/config/search', async (request, reply) => {
    const config = SearchConfigSchema.parse(request.body);
    configStore.setSearchConfig(config);
    return { success: true, config: maskSensitiveConfig(configStore.getSearchConfig()) };
  });

  // 获取当前管理员账号信息
  fastify.get('/admin/account', async (request, reply) => {
    const currentUser = (request as any).user as JWTPayload;
    const user = configStore.getUserById(parseInt(currentUser.userId));

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return {
      id: user.id,
      username: user.username,
      role: 'admin',
      createdAt: user.createdAt,
    };
  });

  // 更新当前管理员账号（用户名/密码）并清理为单管理员模式
  fastify.put('/admin/account', async (request, reply) => {
    const currentUser = (request as any).user as JWTPayload;
    const { username, newPassword } = UpdateAdminAccountSchema.parse(request.body);

    configStore.updateUserCredentials(parseInt(currentUser.userId), username, newPassword);
    configStore.cleanupToSingleAdmin(parseInt(currentUser.userId));

    return { success: true };
  });

  // 测试 LLM 连接
  fastify.post('/admin/test-llm', async (request, reply) => {
    try {
      const llm = LLMFactory.createLLM();
      const result = await llm.complete({
        messages: [
          { role: 'user', content: '只输出你好' }
        ],
        temperature: 0.7,
        maxTokens: 100
      });

      return {
        success: true,
        response: result.content,
        usage: result.usage
      };
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message || 'LLM test failed'
      });
    }
  });
}
