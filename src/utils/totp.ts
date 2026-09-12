// TOTP 实现 (RFC 6238) - 使用 Cloudflare Workers 内置的 Web Crypto API
// 不依赖任何 Node.js crypto API

// base32 字符表
const B32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let bits = '';
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    bits += bytes[i].toString(2).padStart(8, '0');
  }
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += B32_CHARS[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function base32Decode(encoded: string): Uint8Array {
  const sanitized = encoded.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let bits = '';
  for (const ch of sanitized) {
    const idx = B32_CHARS.indexOf(ch);
    bits += idx.toString(2).padStart(5, '0');
  }
  const byteLen = Math.floor(bits.length / 8);
  const result = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    result[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return result;
}

// HMAC-SHA1
async function hmacSha1(keyData: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, message);
  return new Uint8Array(signature);
}

// 生成随机密钥
export function generateSecret(length: number = 20): string {
  const buffer = new Uint8Array(length);
  crypto.getRandomValues(buffer);
  return base32Encode(buffer);
}

// 生成 URI (用于二维码)
export function keyuri(accountName: string, issuerName: string, secret: string): string {
  return `otpauth://totp/${issuerName}:${accountName}?secret=${secret}&issuer=${issuerName}`;
}

// 生成当前 TOTP code
export async function generateTOTP(secret: string, digits: number = 6, period: number = 30): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / period);
  return await generateTOTPAt(secret, counter, digits);
}

// 验证 TOTP code (带时间窗口容忍)
export async function verifyTOTP(token: string, secret: string, digits: number = 6, window: number = 1): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const counter = Math.floor(now / 30);

  for (let i = -window; i <= window; i++) {
    const expected = await generateTOTPAt(secret, counter + i, digits);
    if (expected === token) return true;
  }
  return false;
}

async function generateTOTPAt(secret: string, counter: number, digits: number): Promise<string> {
  const key = base32Decode(secret);

  // counter 转为 8 字节 big-endian
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const hmac = await hmacSha1(key, counterBytes);

  // RFC 6238 truncation
  const offset = hmac[19] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const mod = Math.pow(10, digits);
  return (code % mod).toString().padStart(digits, '0');
}
