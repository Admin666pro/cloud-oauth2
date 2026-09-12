import { Hono } from 'hono';
import { authRoutes } from './routes/auth';
import { oauthRoutes } from './routes/oauth';
import { dashboardRoutes } from './routes/dashboard';
import { adminRoutes } from './routes/admin';
import { ensureAdminUser, getSetting } from './db';
import type { Env } from './types';
import { html_login, html_register, html_dashboard, html_admin, html_home } from './views';

const app = new Hono<{ Bindings: Env }>();

// CORS
app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Credentials', 'true');
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }
  await next();
});

// 初始化钩子 - 确保管理员用户存在
app.on('start', async () => {
  // Cloudflare Workers 的 fetch 中处理初始化
});

// ===== API 路由 =====
app.route('/api/auth', authRoutes);
app.route('/oauth', oauthRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/admin', adminRoutes);

// GET /api/config - 获取公开配置
app.get('/api/config', async (c) => {
  const [requireInvite, turnstileEnabled] = await Promise.all([
    getSetting(c.env, 'require_invite'),
    getSetting(c.env, 'turnstile_enabled'),
  ]);

  return c.json({
    require_invite: requireInvite === '1',
    turnstile_enabled: turnstileEnabled === '1',
    turnstile_site_key: c.env.TURNSTILE_SITE_KEY || '',
  });
});

// ===== 前端页面 =====

app.get('/', async (c) => {
  return c.html(html_home());
});

app.get('/login', async (c) => {
  return c.html(html_login());
});

app.get('/register', async (c) => {
  return c.html(html_register());
});

app.get('/dashboard', async (c) => {
  return c.html(html_dashboard());
});

app.get('/admin', async (c) => {
  return c.html(html_admin());
});

// 404
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// 错误处理
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // 确保数据库初始化（首次使用时会插入默认设置）
    ctx.waitUntil(ensureAdminUser(env).catch(() => {}));

    return app.fetch(request, env, ctx);
  },
};
