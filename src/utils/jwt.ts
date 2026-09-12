import type { Env } from '../types';

// 简单的 JWT 实现 (HS256)
export async function signToken(payload: Record<string, unknown>, secret: string, expiresIn: number = 86400): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresIn };
  
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(fullPayload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const signature = await hmacSign(`${headerB64}.${payloadB64}`, secret);
  
  return `${headerB64}.${payloadB64}.${signature}`;
}

export async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // 验证签名
    const expectedSignature = await hmacSign(`${headerB64}.${payloadB64}`, secret);
    if (expectedSignature !== signatureB64) return null;
    
    // 解析 payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/').replace(/^([A-Za-z0-9]+)$/, (_, p) => p + '==='.slice((p.length + 3) % 4))));
    
    // 检查过期
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    
    return payload;
  } catch {
    return null;
  }
}

async function hmacSign(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(data);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const byteArray = new Uint8Array(signature);
  let b64 = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    b64 += String.fromCharCode(byteArray[i]);
  }
  return btoa(b64).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

// 生成随机字符串
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars.charAt(array[i] % chars.length);
  }
  return result;
}
