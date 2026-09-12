export type Env = {
  DB: D1Database;
  KV: KVNamespace;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  JWT_SECRET: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET?: string;
};

export type User = {
  id: number;
  email: string;
  password_hash: string;
  name: string | null;
  is_admin: number;
  two_factor_enabled: number;
  two_factor_secret: string | null;
  created_at: number;
  updated_at: number;
};

export type OAuthClient = {
  id: number;
  client_id: string;
  client_secret: string;
  name: string;
  redirect_uri: string;
  created_at: number;
};
