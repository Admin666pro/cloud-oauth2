import { Hono } from 'hono';
import type { Env } from '../types';
import { getAuthToken } from './auth';
import { verifyToken } from '../utils/jwt';
import { getUserById, updateUserPassword, updateUser2FA, getUserByEmail } from '../db';
import { hashPassword } from '../utils/password';
import { generateSecret, keyuri, verifyTOTP } from '../utils/totp';

export const dashboardRoutes = new Hono<{ Bindings: Env }>();

// 中间件：验证登录状态
dashboardRoutes.use('*', async (c, next) => {
  const token = getAuthToken(c);
  if (!token) {
    return c.json({ error: '未认证' }, 401);
  }
  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: '无效或过期的 token' }, 401);
  }
  c.set('user', payload);
  await next();
});

// POST /api/dashboard/password - 修改密码
dashboardRoutes.post('/password', async (c) => {
  const body = await c.req.json();
  const { current_password, new_password } = body as {
    current_password: string;
    new_password: string;
  };

  if (!current_password || !new_password) {
    return c.json({ error: '请填写当前密码和新密码' }, 400);
  }
  if (new_password.length < 6) {
    return c.json({ error: '新密码至少6位' }, 400);
  }

  const payload = c.get('user') as any;
  const env = c.env;
  const user = await getUserById(env, payload.uid);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  const { verifyPassword } = await import('../utils/password');
  const valid = await verifyPassword(current_password, user.password_hash);
  if (!valid) {
    return c.json({ error: '当前密码错误' }, 401);
  }

  const newHash = await hashPassword(new_password);
  await updateUserPassword(env, user.id, newHash);

  return c.json({ success: true });
});

// GET /api/dashboard/2fa/setup - 获取 2FA 密钥
dashboardRoutes.get('/2fa/setup', async (c) => {
  const payload = c.get('user') as any;
  const user = await getUserById(c.env, payload.uid);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  if (user.two_factor_enabled === 1) {
    return c.json({ error: '2FA 已启用' }, 400);
  }

  const secret = generateSecret();
  const otpauth = keyuri(user.email, 'OAuth2 Tool', secret);

  // 临时保存到 KV，后续验证时使用
  await c.env.KV.put(`2fa_setup:${user.id}`, secret, { expirationTtl: 300 });

  return c.json({ secret, otpauth });
});

// POST /api/dashboard/2fa/enable - 启用 2FA
dashboardRoutes.post('/2fa/enable', async (c) => {
  const body = await c.req.json();
  const { code } = body as { code: string };

  const payload = c.get('user') as any;
  const env = c.env;
  const user = await getUserById(env, payload.uid);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  const secret = await env.KV.get(`2fa_setup:${user.id}`);
  if (!secret) {
    return c.json({ error: '请先获取 2FA 密钥' }, 400);
  }

  const verified = await verifyTOTP(code, secret);
  if (!verified) {
    return c.json({ error: '验证码错误' }, 400);
  }

  await updateUser2FA(env, user.id, true, secret);
  await env.KV.delete(`2fa_setup:${user.id}`);

  return c.json({ success: true });
});

// POST /api/dashboard/2fa/disable - 禁用 2FA
dashboardRoutes.post('/2fa/disable', async (c) => {
  const body = await c.req.json();
  const { code, password } = body as { code: string; password: string };

  const payload = c.get('user') as any;
  const env = c.env;
  const user = await getUserById(env, payload.uid);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  const { verifyPassword } = await import('../utils/password');
  const pwdValid = await verifyPassword(password, user.password_hash);
  if (!pwdValid) {
    return c.json({ error: '密码错误' }, 401);
  }

  if (user.two_factor_enabled === 1 && user.two_factor_secret) {
    const verified = await verifyTOTP(code, user.two_factor_secret);
    if (!verified) {
      return c.json({ error: '2FA 验证码错误' }, 400);
    }
  }

  await updateUser2FA(env, user.id, false, null);

  return c.json({ success: true });
});
