import { Hono } from 'hono';
import type { Env } from '../types';
import { getUserByEmail, createUser, updateUser2FA } from '../db';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken, verifyToken } from '../utils/jwt';
import { verifyTurnstile } from '../utils/turnstile';
import { getSetting, validateInviteCode, useInviteCode } from '../db';
import { verifyTOTP } from '../utils/totp';

export const authRoutes = new Hono<{ Bindings: Env }>();

// POST /api/auth/register - 用户注册
authRoutes.post('/register', async (c) => {
  const body = await c.req.json();
  const { email, password, name, invite_code, turnstile_token } = body as {
    email: string;
    password: string;
    name?: string;
    invite_code?: string;
    turnstile_token?: string;
  };

  // 基本验证
  if (!email || !password) {
    return c.json({ error: '邮箱和密码为必填项' }, 400);
  }
  if (password.length < 6) {
    return c.json({ error: '密码至少需要6位' }, 400);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return c.json({ error: '邮箱格式不正确' }, 400);
  }

  const env = c.env;

  // 检查是否需要邀请码
  const requireInvite = await getSetting(env, 'require_invite');
  if (requireInvite === '1') {
    if (!invite_code) {
      return c.json({ error: '此站点需要邀请码才能注册' }, 400);
    }
    const valid = await validateInviteCode(env, invite_code);
    if (!valid) {
      return c.json({ error: '邀请码无效或已使用' }, 400);
    }
  }

  // 检查 Turnstile
  const turnstileEnabled = await getSetting(env, 'turnstile_enabled');
  if (turnstileEnabled === '1') {
    if (!turnstile_token) {
      return c.json({ error: '请完成人机验证' }, 400);
    }
    const valid = await verifyTurnstile(turnstile_token, env);
    if (!valid) {
      return c.json({ error: '人机验证失败' }, 400);
    }
  }

  // 检查邮箱是否已注册
  const existing = await getUserByEmail(env, email.toLowerCase());
  if (existing) {
    return c.json({ error: '该邮箱已被注册' }, 409);
  }

  // 创建用户
  const passwordHash = await hashPassword(password);
  const userId = await createUser(env, email.toLowerCase(), passwordHash, name);

  // 使用邀请码
  if (requireInvite === '1' && invite_code) {
    await useInviteCode(env, invite_code, email.toLowerCase());
  }

  // 生成 JWT
  const token = await signToken({ uid: userId, email: email.toLowerCase(), admin: false }, env.JWT_SECRET);

  // 设置 Cookie
  setAuthCookie(c, token);

  return c.json({
    success: true,
    token,
    user: { id: userId, email: email.toLowerCase(), name, is_admin: false },
  });
});

// POST /api/auth/login - 用户登录
authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password, totp_code } = body as {
    email: string;
    password: string;
    totp_code?: string;
  };

  if (!email || !password) {
    return c.json({ error: '邮箱和密码为必填项' }, 400);
  }

  const env = c.env;
  const user = await getUserByEmail(env, email.toLowerCase());

  if (!user) {
    return c.json({ error: '邮箱或密码错误' }, 401);
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    return c.json({ error: '邮箱或密码错误' }, 401);
  }

  // 检查 2FA
  if (user.two_factor_enabled === 1 && user.two_factor_secret) {
    if (!totp_code) {
      return c.json({ error: '需要 TOTP 2FA 验证码', require_2fa: true, user_id: user.id }, 401);
    }
    const verified = await verifyTOTP(totp_code, user.two_factor_secret);
    if (!verified) {
      return c.json({ error: '2FA 验证码错误' }, 401);
    }
  }

  // 生成 JWT
  const token = await signToken(
    { uid: user.id, email: user.email, admin: user.is_admin === 1 },
    env.JWT_SECRET
  );

  setAuthCookie(c, token);

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      is_admin: user.is_admin === 1,
      two_factor_enabled: user.two_factor_enabled === 1,
    },
  });
});

// POST /api/auth/logout - 登出
authRoutes.post('/logout', async (c) => {
  setAuthCookie(c, '', 0);
  return c.json({ success: true });
});

// GET /api/auth/me - 获取当前用户
authRoutes.get('/me', async (c) => {
  const token = getAuthToken(c);
  if (!token) {
    return c.json({ error: '未认证' }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: '无效或过期的 token' }, 401);
  }

  const user = await getUserByEmail(c.env, payload.email as string);
  if (!user) {
    return c.json({ error: '用户不存在' }, 404);
  }

  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    is_admin: user.is_admin === 1,
    two_factor_enabled: user.two_factor_enabled === 1,
  });
});

// ==== 辅助函数 ====

function getAuthToken(c: any): string | null {
  // 先检查 header
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  // 再检查 cookie
  const cookie = c.req.header('Cookie');
  if (cookie) {
    const match = cookie.match(/auth_token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

function setAuthCookie(c: any, token: string, maxAge: number = 86400): void {
  c.header('Set-Cookie', `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

export { getAuthToken };
