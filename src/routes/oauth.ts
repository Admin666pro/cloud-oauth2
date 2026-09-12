import { Hono } from 'hono';
import type { Env } from '../types';
import { getAuthToken } from './auth';
import { verifyToken, generateRandomString } from '../utils/jwt';
import {
  getOAuthClient, createOAuthCode, getOAuthCode, markOAuthCodeUsed,
  createOAuthToken, getUserByOAuthToken
} from '../db';

export const oauthRoutes = new Hono<{ Bindings: Env }>();

// ==== OIDC Discovery 端点 (放在 app 根路由上，见 index.ts 全局注册) ====

// 辅助: 从请求推导 issuer URL
function getIssuer(c: any): string {
  const url = new URL(c.req.raw.url);
  return `${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
}

// ==== 现有端点 ====

// GET /oauth/authorize - 授权端点
oauthRoutes.get('/authorize', async (c) => {
  const params = c.req.query();
  const { client_id, redirect_uri, response_type, scope, state } = params as any;
  const env = c.env;

  // 检查参数
  if (!client_id || !redirect_uri || response_type !== 'code') {
    return c.text('Invalid OAuth request', 400);
  }

  const client = await getOAuthClient(env, client_id);
  if (!client) {
    return c.text('Unknown client', 400);
  }

  // 验证 redirect_uri
  if (client.redirect_uri !== redirect_uri) {
    return c.text('Redirect URI mismatch', 400);
  }

  // 获取/检查用户登录
  const token = getAuthToken(c);
  if (!token) {
    // 重定向到登录页，保留原始请求参数
    const loginUrl = `/login?redirect=${encodeURIComponent(c.req.raw.url)}`;
    return c.redirect(loginUrl);
  }

  const payload = await verifyToken(token, env.JWT_SECRET);
  if (!payload) {
    const loginUrl = `/login?redirect=${encodeURIComponent(c.req.raw.url)}`;
    return c.redirect(loginUrl);
  }

  const userId = payload.uid as number;

  // 生成授权码
  const code = generateRandomString(32);
  await createOAuthCode(env, code, client_id, userId, redirect_uri, scope);

  // 重定向回客户端
  let redirectUrl = `${redirect_uri}?code=${code}`;
  if (state) redirectUrl += `&state=${state}`;

  return c.redirect(redirectUrl);
});

// POST /oauth/token - 令牌端点
oauthRoutes.post('/token', async (c) => {
  const body = await c.req.parseBody();
  const { grant_type, code, redirect_uri, client_id, client_secret } = body as any;

  const env = c.env;

  if (grant_type !== 'authorization_code') {
    return c.json({ error: 'unsupported_grant_type' }, 400);
  }

  if (!code || !client_id) {
    return c.json({ error: 'invalid_request' }, 400);
  }

  // 验证客户端
  let actualClientId = client_id;
  let actualClientSecret = client_secret;

  // 也支持 Basic Auth 传递客户端凭据
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Basic ')) {
    const decoded = atob(authHeader.substring(6));
    const [cid, csecret] = decoded.split(':');
    actualClientId = cid;
    actualClientSecret = csecret;
  }

  const client = await getOAuthClient(env, actualClientId);
  if (!client || client.client_secret !== actualClientSecret) {
    return c.json({ error: 'invalid_client' }, 401);
  }

  // 查授权码
  const oauthCode = await getOAuthCode(env, code);
  if (!oauthCode) {
    return c.json({ error: 'invalid_grant', error_description: 'Code not found' }, 400);
  }

  if (oauthCode.used) {
    return c.json({ error: 'invalid_grant', error_description: 'Code already used' }, 400);
  }

  if (oauthCode.expires_at < Math.floor(Date.now() / 1000)) {
    return c.json({ error: 'invalid_grant', error_description: 'Code expired' }, 400);
  }

  if (oauthCode.client_id !== actualClientId) {
    return c.json({ error: 'invalid_grant' }, 400);
  }

  // 使用授权码
  await markOAuthCodeUsed(env, code);

  // 生成访问令牌
  const accessToken = generateRandomString(48);
  await createOAuthToken(env, accessToken, actualClientId, oauthCode.user_id, oauthCode.scope);

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 2592000, // 30天
    scope: oauthCode.scope || 'openid email',
  });
});

// GET /oauth/userinfo - 用户信息端点
oauthRoutes.get('/userinfo', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'invalid_token' }, 401);
  }

  const token = authHeader.substring(7);
  const user = await getUserByOAuthToken(c.env, token);

  if (!user) {
    return c.json({ error: 'invalid_token' }, 401);
  }

  return c.json({
    sub: user.id,
    email: user.email,
    name: user.name,
    email_verified: true,
  });
});
