import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// JWT密钥 - 生产环境应使用环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'deepthink-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

export interface JWTPayload {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  iat?: number;
  exp?: number;
}

/**
 * 生成JWT Token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * 验证JWT Token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * JWT认证中间件 - 验证请求中的token
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }

  // 将用户信息附加到请求对象
  (request as any).user = payload;
}

/**
 * 管理员权限中间件 - 必须在authMiddleware之后使用
 */
export async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = (request as any).user as JWTPayload | undefined;

  if (!user) {
    reply.code(401).send({ error: 'Authentication required' });
    return;
  }

  if (user.role !== 'admin') {
    reply.code(403).send({ error: 'Admin access required' });
    return;
  }
}

/**
 * WebSocket Token验证
 */
export function verifyWebSocketToken(token: string | undefined): JWTPayload | null {
  if (!token) return null;
  return verifyToken(token);
}
