import { Hono } from 'hono';
import type { Env } from '../types';
import { getAuthToken } from './auth';
import { verifyToken, generateRandomString } from '../utils/jwt';
import { getUserById, getUserByEmail, updateUserPassword, updateUser2FA } from '../db';
import { hashPassword } from '../utils/password';
import {
  listUsers, deleteUser,
  createOAuthClient, listOAuthClients, getOAuthClient,
  createInviteCode, listInviteCodes,
  getSetting, setSetting
} from '../db';

export const adminRoutes = new Hono<{ Bindings: Env }>();

// 管理员中间件
adminRoutes.use('*', async (c, next) => {
  const token = getAuthToken(c);
  if (!token) return c.json({ error: '未认证' }, 401);

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) return c.json({ error: '无效或过期的 token' }, 401);

  if (!payload.admin) {
    return c.json({ error: '需要管理员权限' }, 403);
  }

  c.set('user', payload);
  await next();
});

// ===== 用户管理 =====

// GET /api/admin/users - 用户列表
adminRoutes.get('/users', async (c) => {
  const users = await listUsers(c.env);
  return c.json({ users });
});

// DELETE /api/admin/users/:id - 删除用户
adminRoutes.delete('/users/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const adminPayload = c.get('user') as any;
  if (adminPayload.uid === id) {
    return c.json({ error: '不能删除自己' }, 400);
  }

  const user = await getUserById(c.env, id);
  if (!user) return c.json({ error: '用户不存在' }, 404);
  if (user.is_admin === 1) {
    return c.json({ error: '不能删除管理员' }, 400);
  }

  await deleteUser(c.env, id);
  return c.json({ success: true });
});

// PUT /api/admin/users/:id/password - 重置用户密码
adminRoutes.put('/users/:id/password', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { new_password } = body as { new_password: string };

  if (!new_password || new_password.length < 6) {
    return c.json({ error: '新密码至少6位' }, 400);
  }

  const user = await getUserById(c.env, id);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  const newHash = await hashPassword(new_password);
  await updateUserPassword(c.env, id, newHash);

  return c.json({ success: true });
});

// PUT /api/admin/users/:id/admin - 设置/取消管理员
adminRoutes.put('/users/:id/admin', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const { is_admin } = body as { is_admin: boolean };

  const adminPayload = c.get('user') as any;
  if (adminPayload.uid === id) {
    return c.json({ error: '不能修改自己的管理员状态' }, 400);
  }

  const user = await getUserById(c.env, id);
  if (!user) return c.json({ error: '用户不存在' }, 404);

  await c.env.DB.prepare('UPDATE users SET is_admin = ? WHERE id = ?')
    .bind(is_admin ? 1 : 0, id).run();

  return c.json({ success: true });
});

// PUT /api/admin/users/:id/2fa - 禁用用户 2FA
adminRoutes.put('/users/:id/2fa', async (c) => {
  const id = parseInt(c.req.param('id'));
  await updateUser2FA(c.env, id, false, null);
  return c.json({ success: true });
});

// ===== OAuth 客户端管理 =====

// GET /api/admin/clients - OAuth 客户端列表
adminRoutes.get('/clients', async (c) => {
  const clients = await listOAuthClients(c.env);
  // 不在列表中返回 client_secret
  const safeClients = clients.map((c: any) => ({
    id: c.id, client_id: c.client_id, name: c.name,
    redirect_uri: c.redirect_uri, created_at: c.created_at,
  }));
  return c.json({ clients: safeClients });
});

// POST /api/admin/clients - 创建 OAuth 客户端
adminRoutes.post('/clients', async (c) => {
  const body = await c.req.json();
  const { name, redirect_uri } = body as { name: string; redirect_uri: string };

  if (!name || !redirect_uri) {
    return c.json({ error: '名称和重定向 URL 为必填项' }, 400);
  }

  const client = await createOAuthClient(c.env, name, redirect_uri);
  return c.json({ client });
});

// DELETE /api/admin/clients/:id - 删除 OAuth 客户端
adminRoutes.delete('/clients/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  await c.env.DB.prepare('DELETE FROM oauth_clients WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// GET /api/admin/clients/:id/secret - 查看/重置客户端密钥
adminRoutes.get('/clients/:id/secret', async (c) => {
  const id = parseInt(c.req.param('id'));
  const client = await c.env.DB.prepare('SELECT * FROM oauth_clients WHERE id = ?').bind(id).first() as any;
  if (!client) return c.json({ error: '客户端不存在' }, 404);

  const clientSecret = generateRandomString(32);
  await c.env.DB.prepare('UPDATE oauth_clients SET client_secret = ? WHERE id = ?').bind(clientSecret, id).run();

  return c.json({ client_id: client.client_id, client_secret: clientSecret });
});

// ===== 邀请码管理 =====

// POST /api/admin/invite - 创建邀请码
adminRoutes.post('/invite', async (c) => {
  const body = await c.req.json();
  const { expires_days } = body as { expires_days?: number };

  const adminPayload = c.get('user') as any;
  let expiresAt: number | undefined;
  if (expires_days && expires_days > 0) {
    expiresAt = Math.floor(Date.now() / 1000) + expires_days * 86400;
  }

  const code = await createInviteCode(c.env, adminPayload.uid, expiresAt);
  return c.json({ code });
});

// GET /api/admin/invite/codes - 邀请码列表
adminRoutes.get('/invite/codes', async (c) => {
  const codes = await listInviteCodes(c.env);
  return c.json({ codes });
});

// ===== 系统设置 =====

// GET /api/admin/settings - 获取设置
adminRoutes.get('/settings', async (c) => {
  const env = c.env;
  const [require_invite, turnstile_enabled, turnstile_site_key] = await Promise.all([
    getSetting(env, 'require_invite'),
    getSetting(env, 'turnstile_enabled'),
    Promise.resolve(env.TURNSTILE_SITE_KEY || ''),
  ]);

  return c.json({
    require_invite: require_invite === '1',
    turnstile_enabled: turnstile_enabled === '1',
    turnstile_site_key,
    admin_email: env.ADMIN_EMAIL,
    has_turnstile_secret: !!env.TURNSTILE_SECRET,
  });
});

// PUT /api/admin/settings - 更新设置
adminRoutes.put('/settings', async (c) => {
  const body = await c.req.json();
  const env = c.env;

  if (typeof body.require_invite === 'boolean') {
    await setSetting(env, 'require_invite', body.require_invite ? '1' : '0');
  }
  if (typeof body.turnstile_enabled === 'boolean') {
    if (body.turnstile_enabled && !env.TURNSTILE_SECRET) {
      return c.json({ error: '未配置 Turnstile Secret Key，请先在 wrangler secret 中设置 TURNSTILE_SECRET' }, 400);
    }
    await setSetting(env, 'turnstile_enabled', body.turnstile_enabled ? '1' : '0');
  }

  return c.json({ success: true });
});
