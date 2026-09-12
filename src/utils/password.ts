// 使用 Web Crypto API 进行密码哈希
// Cloudflare Workers 支持 SubtleCrypto

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ':oauth2-tool-salt');
  
  // 使用 SHA-256 多次迭代模拟 bcrypt
  let hashBuffer = await crypto.subtle.digest('SHA-256', data);
  for (let i = 0; i < 1000; i++) {
    hashBuffer = await crypto.subtle.digest('SHA-256', hashBuffer);
  }
  
  return bufferToHex(hashBuffer);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

function bufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    hex += byteArray[i].toString(16).padStart(2, '0');
  }
  return hex;
}
