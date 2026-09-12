# OAuth2 Tool

基于 **Cloudflare Workers** 实现的轻量 OAuth2 身份提供方 (Identity Provider)。用户可以通过邮箱注册账户，管理员可通过后台进行用户管理和系统配置。

## ✨ 功能特性

- 📧 **邮箱注册登录** - 用户通过邮箱 + 密码创建账户
- 🔑 **OAuth2 Provider** - 完整的授权码流程 (`/oauth/authorize` → `/oauth/token`)
- 🎟️ **邀请码系统** - 管理员可开启/关闭注册邀请码机制
- 🛡️ **Turnstile 人机验证** - 集成 Cloudflare Turnstile 防止机器人注册
- 🔐 **TOTP 两步验证** - 用户可自行在仪表盘开启 2FA (Google Authenticator 等兼容)
- 👥 **管理员后台** - 用户管理、密码重置、OAuth 客户端管理、系统设置
- 🏠 **用户仪表盘** - 修改密码、开启/关闭 2FA
- ⚡ **Serverless** - 基于 Cloudflare Workers + D1 + KV，全球低延迟

## 📦 技术栈

- **Hono** - Cloudflare Workers 上最快的 Web 框架
- **Cloudflare D1** - 关系型数据库 (SQLite)
- **Cloudflare KV** - 键值存储 (OAuth code/2FA setup)
- **Web Crypto API** - 密码哈希 & JWT 签名 (无外部依赖)
- **原生 JS TOTP** - 两步验证实现 (无 Node crypto 依赖)

## 🚀 快速开始

### 1. 前置条件

- [Cloudflare](https://dash.cloudflare.com) 账户
- [Node.js](https://nodejs.org) >= 18
- Wrangler CLI: `npm install -g wrangler`

### 2. 克隆并安装

```bash
git clone <your-repo-url>
cd oauth2-tool
npm install
```

### 3. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
wrangler d1 create oauth2-db

# 创建 KV Namespace
wrangler kv namespace create OauthStore --preview
wrangler kv namespace create OauthStore
```

记下返回的 database_id 和 namespace_id。

### 4. 配置 wrangler.toml

编辑 `wrangler.toml`，替换以下占位符：

```toml
# D1
[[d1_databases]]
binding = "DB"
database_name = "oauth2-db"
database_id = "你的-database-id"  # ← 替换这里

# KV
[[kv_namespaces]]
binding = "KV"
id = "你的-kv-namespace-id"  # ← 替换这里
```

同时修改管理员账户信息：

```toml
[vars]
ADMIN_EMAIL = "your-admin@example.com"  # ← 管理员邮箱
ADMIN_PASSWORD = "your-strong-password"  # ← 管理员密码
```

### 5. 配置密钥 (Secrets)

敏感信息通过 `wrangler secret` 管理，**不要写在 wrangler.toml 的 [vars] 里**：

```bash
# JWT 签名密钥 - 必须设置
wrangler secret put JWT_SECRET
# 输入一个足够长的随机字符串

# Turnstile Secret Key (可选 - 仅当你要开启 Turnstile 时)
wrangler secret put TURNSTILE_SECRET
# 输入 Cloudflare Turnstile 的 Secret Key
```

获取 JWT_SECRET 随机值：
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 6. 初始化数据库

```bash
# 本地开发初始化
wrangler d1 execute oauth2-db --file=./schema.sql

# 生产环境初始化
wrangler d1 execute oauth2-db --remote --file=./schema.sql
```

### 7. 配置 Turnstile (可选)

1. 到 [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) 创建一个站点
2. 获取 Site Key 和 Secret Key
3. 在 `wrangler.toml` 的 `[vars]` 中添加：
   ```toml
   TURNSTILE_SITE_KEY = "0x4AAAAAAA..."
   ```
4. 将 Secret Key 设为 secret：
   ```bash
   wrangler secret put TURNSTILE_SECRET
   ```

### 8. 部署

```bash
wrangler deploy
```

部署成功后访问你的 Worker URL（如 `https://oauth2-tool.your-subdomain.workers.dev`）。

### 9. 登录管理员

1. 访问 `/login`
2. 使用在 `wrangler.toml` 中设置的 `ADMIN_EMAIL` 和 `ADMIN_PASSWORD` 登录
3. 登录后会自动跳转到 `/admin` 管理员后台
4. **立即修改管理员密码！**（在管理员后台无法修改自身密码，但可以通过用户仪表盘修改）

## 📖 OAuth2 使用流程

### 注册一个 OAuth 客户端

1. 登录管理员后台 `/admin`
2. 在 "OAuth 客户端" 区域创建新客户端
3. 记下返回的 `client_id` 和 `client_secret`

### 在应用中使用 OAuth2

**1. 跳转到授权页面：**
```
GET https://your-worker.oauth2.dev/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https://yourapp.com/callback&response_type=code&scope=openid+email&state=random_state
```

**2. 交换授权码：**
```bash
curl -X POST https://your-worker.oauth2.dev/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=AUTH_CODE&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&redirect_uri=https://yourapp.com/callback"
```

**3. 获取用户信息：**
```bash
curl https://your-worker.oauth2.dev/oauth/userinfo \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## 🔧 本地开发

```bash
# 启动本地开发服务器
wrangler dev

# 或者带远程 D1 的开发模式
wrangler dev --remote
```

## 📂 项目结构

```
├── src/
│   ├── index.ts          # 应用入口
│   ├── types.ts          # 类型定义
│   ├── db.ts             # 数据库操作层
│   ├── views.ts          # 前端 HTML 页面
│   ├── utils/
│   │   ├── jwt.ts        # JWT 签名/验证
│   │   ├── password.ts   # 密码哈希
│   │   ├── totp.ts       # TOTP 2FA 实现
│   │   └── turnstile.ts  # Turnstile 验证
│   └── routes/
│       ├── auth.ts       # 注册/登录 API
│       ├── oauth.ts      # OAuth2 Provider
│       ├── dashboard.ts  # 用户仪表盘 API
│       └── admin.ts      # 管理员 API
├── schema.sql            # 数据库初始化脚本
├── wrangler.toml         # Wrangler 配置
└── package.json
```

## 🔐 API 速查

| 方法 | 路径 | 描述 | 需要认证 |
|------|------|------|----------|
| POST | `/api/auth/register` | 用户注册 | ❌ |
| POST | `/api/auth/login` | 用户登录 | ❌ |
| POST | `/api/auth/logout` | 登出 | ❌ |
| GET  | `/api/auth/me` | 当前用户信息 | ✅ |
| GET  | `/api/config` | 公开配置 (邀请码/Turnstile) | ❌ |
| POST | `/api/dashboard/password` | 修改密码 | ✅ |
| GET  | `/api/dashboard/2fa/setup` | 获取 2FA 密钥 | ✅ |
| POST | `/api/dashboard/2fa/enable` | 启用 2FA | ✅ |
| POST | `/api/dashboard/2fa/disable` | 禁用 2FA | ✅ |
| GET  | `/api/admin/users` | 用户列表 | 👑 |
| PUT  | `/api/admin/users/:id/password` | 重置用户密码 | 👑 |
| PUT  | `/api/admin/users/:id/admin` | 设/取消管理员 | 👑 |
| DELETE | `/api/admin/users/:id` | 删除用户 | 👑 |
| POST | `/api/admin/clients` | 创建 OAuth 客户端 | 👑 |
| GET  | `/api/admin/clients` | 客户端列表 | 👑 |
| DELETE | `/api/admin/clients/:id` | 删除客户端 | 👑 |
| GET  | `/api/admin/clients/:id/secret` | 重置客户端密钥 | 👑 |
| POST | `/api/admin/invite` | 生成邀请码 | 👑 |
| GET  | `/api/admin/invite/codes` | 邀请码列表 | 👑 |
| GET  | `/api/admin/settings` | 获取系统设置 | 👑 |
| PUT  | `/api/admin/settings` | 更新系统设置 | 👑 |
| GET  | `/oauth/authorize` | OAuth2 授权端点 | ✅ (登录后) |
| POST | `/oauth/token` | OAuth2 令牌端点 | ❌ |
| GET  | `/oauth/userinfo` | OAuth2 用户信息 | ✅ (Bearer Token) |

## ⚠️ 安全提示

- **生产环境务必修改 `ADMIN_PASSWORD`**，并在登录后立即通过仪表盘修改
- 所有敏感密钥（JWT_SECRET、TURNSTILE_SECRET）务必通过 `wrangler secret put` 设置
- `ADMIN_PASSWORD` 在首次启动后会哈希存储到数据库，后续可在用户仪表盘修改
- OAuth `client_secret` 通过管理员后台 "重置密钥" 功能重新生成

## 📄 License

MIT
