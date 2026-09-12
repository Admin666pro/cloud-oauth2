import type { Env, User, OAuthClient } from './types';
import { hashPassword } from './utils/password';
import { generateRandomString } from './utils/jwt';

// ==== 用户操作 ====

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const stmt = env.DB.prepare('SELECT * FROM users WHERE email = ?');
  const result = await stmt.bind(email).first() as User | null;
  return result;
}

export async function getUserById(env: Env, id: number): Promise<User | null> {
  const stmt = env.DB.prepare('SELECT * FROM users WHERE id = ?');
  const result = await stmt.bind(id).first() as User | null;
  return result;
}

export async function createUser(env: Env, email: string, passwordHash: string, name?: string): Promise<number> {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    'INSERT INTO users (email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(email, passwordHash, name || null, now, now).run();
  return result.lastRowId as number;
}

export async function updateUserPassword(env: Env, userId: number, passwordHash: string): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(passwordHash, now, userId).run();
}

export async function updateUser2FA(env: Env, userId: number, enabled: boolean, secret: string | null): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('UPDATE users SET two_factor_enabled = ?, two_factor_secret = ?, updated_at = ? WHERE id = ?')
    .bind(enabled ? 1 : 0, secret, now, userId).run();
}

export async function listUsers(env: Env): Promise<User[]> {
  const result = await env.DB.prepare('SELECT id, email, name, is_admin, two_factor_enabled, created_at FROM users').all();
  return result.results as User[];
}

export async function deleteUser(env: Env, userId: number): Promise<void> {
  await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
}

// ==== OAuth 客户端操作 ====

export async function createOAuthClient(env: Env, name: string, redirectUri: string): Promise<OAuthClient> {
  const now = Math.floor(Date.now() / 1000);
  const clientId = generateRandomString(16);
  const clientSecret = generateRandomString(32);
  
  await env.DB.prepare(
    'INSERT INTO oauth_clients (client_id, client_secret, name, redirect_uri, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(clientId, clientSecret, name, redirectUri, now).run();
  
  return { id: 0, client_id: clientId, client_secret: clientSecret, name, redirect_uri: redirectUri, created_at: now };
}

export async function getOAuthClient(env: Env, clientId: string): Promise<OAuthClient | null> {
  const stmt = env.DB.prepare('SELECT * FROM oauth_clients WHERE client_id = ?');
  const result = await stmt.bind(clientId).first() as OAuthClient | null;
  return result;
}

export async function listOAuthClients(env: Env): Promise<OAuthClient[]> {
  const result = await env.DB.prepare('SELECT * FROM oauth_clients').all();
  return result.results as OAuthClient[];
}

// ==== OAuth Code/Token 操作 ====

export async function createOAuthCode(env: Env, code: string, clientId: string, userId: number, redirectUri: string, scope?: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + 600; // 10分钟
  await env.DB.prepare(
    'INSERT INTO oauth_codes (code, client_id, user_id, redirect_uri, scope, expires_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(code, clientId, userId, redirectUri, scope || null, expiresAt).run();
}

export async function getOAuthCode(env: Env, code: string): Promise<any> {
  const stmt = env.DB.prepare('SELECT * FROM oauth_codes WHERE code = ?');
  return await stmt.bind(code).first();
}

export async function markOAuthCodeUsed(env: Env, code: string): Promise<void> {
  await env.DB.prepare('UPDATE oauth_codes SET used = 1 WHERE code = ?').bind(code).run();
}

export async function createOAuthToken(env: Env, token: string, clientId: string, userId: number, scope?: string): Promise<void> {
  const expiresAt = Math.floor(Date.now() / 1000) + 86400 * 30; // 30天
  await env.DB.prepare(
    'INSERT INTO oauth_tokens (token, client_id, user_id, scope, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(token, clientId, userId, scope || null, expiresAt).run();
}

export async function getUserByOAuthToken(env: Env, token: string): Promise<User | null> {
  const result = await env.DB.prepare(
    'SELECT u.* FROM users u JOIN oauth_tokens t ON u.id = t.user_id WHERE t.token = ? AND t.expires_at > ?'
  ).bind(token, Math.floor(Date.now() / 1000)).first() as User | null;
  return result;
}

// ==== 邀请码操作 ====

export async function createInviteCode(env: Env, createdBy?: number, expiresAt?: number): Promise<string> {
  const code = generateRandomString(12).toUpperCase();
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    'INSERT INTO invite_codes (code, created_at, created_by, expires_at) VALUES (?, ?, ?, ?)'
  ).bind(code, now, createdBy || null, expiresAt || null).run();
  return code;
}

export async function validateInviteCode(env: Env, code: string): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const result = await env.DB.prepare(
    'SELECT * FROM invite_codes WHERE code = ? AND used = 0 AND (expires_at IS NULL OR expires_at > ?)'
  ).bind(code.toUpperCase(), now).first();
  return result !== null;
}

export async function useInviteCode(env: Env, code: string, userEmail: string): Promise<void> {
  await env.DB.prepare('UPDATE invite_codes SET used = 1, used_by = ? WHERE code = ?')
    .bind(userEmail, code.toUpperCase()).run();
}

export async function listInviteCodes(env: Env): Promise<any[]> {
  const result = await env.DB.prepare('SELECT * FROM invite_codes ORDER BY created_at DESC').all();
  return result.results;
}

// ==== 系统设置 ====

export async function getSetting(env: Env, key: string): Promise<string> {
  const result = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
  return result ? (result as any).value : '';
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
    .bind(key, value).run();
}

// ==== 管理员初始化 ====

export async function ensureAdminUser(env: Env): Promise<void> {
  const admin = await getUserByEmail(env, env.ADMIN_EMAIL);
  if (!admin) {
    const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
    const id = await createUser(env, env.ADMIN_EMAIL, passwordHash, 'Administrator');
    await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').bind(id).run();
  } else if (admin.is_admin !== 1) {
    await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').bind(admin.id).run();
  }
}
