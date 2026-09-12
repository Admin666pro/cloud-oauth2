// 前端 HTML 页面

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
         background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
         min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .container { background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); 
               padding: 40px; width: 100%; max-width: 480px; }
  h1 { font-size: 24px; margin-bottom: 8px; color: #333; }
  h2 { font-size: 20px; margin-bottom: 20px; color: #333; }
  p.subtitle { color: #888; margin-bottom: 24px; font-size: 14px; }
  .form-group { margin-bottom: 16px; }
  label { display: block; font-size: 13px; color: #555; margin-bottom: 6px; font-weight: 500; }
  input, select, textarea { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; 
                            font-size: 14px; transition: border-color 0.2s; }
  input:focus, select:focus { outline: none; border-color: #667eea; }
  button { width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
           color: white; border: none; border-radius: 8px; font-size: 15px; font-weight: 600;
           cursor: pointer; transition: transform 0.2s; }
  button:hover { transform: translateY(-1px); }
  button:disabled { opacity: 0.6; cursor: not-allowed; }
  .btn-secondary { background: #f0f0f0; color: #333; }
  .btn-danger { background: #ef4444; }
  .link { text-align: center; margin-top: 16px; font-size: 14px; color: #667eea; cursor: pointer; text-decoration: none; }
  .link:hover { text-decoration: underline; }
  .error { background: #fee2e2; color: #dc2626; padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 12px; display: none; }
  .success { background: #dcfce7; color: #16a34a; padding: 10px; border-radius: 8px; font-size: 14px; margin-bottom: 12px; display: none; }
  .admin-bar { background: #1f2937; color: white; padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; }
  .admin-bar a { color: white; text-decoration: none; margin-left: 16px; }
  .admin-container { background: white; padding: 30px; }
  .card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
  .row { display: flex; gap: 12px; align-items: center; }
  .row button { width: auto; padding: 8px 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
  th { background: #f9fafb; font-weight: 600; color: #555; }
  .badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; }
  .badge-admin { background: #fef3c7; color: #92400e; }
  .badge-2fa { background: #dbeafe; color: #1e40af; }
  .code-display { background: #f3f4f6; padding: 12px; border-radius: 8px; font-family: monospace; 
                  font-size: 18px; text-align: center; letter-spacing: 2px; word-break: break-all; }
  .qr-placeholder { text-align: center; }
  .settings-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
  .toggle { position: relative; width: 48px; height: 26px; background: #ddd; border-radius: 13px; cursor: pointer; transition: background 0.2s; }
  .toggle.on { background: #667eea; }
  .toggle::after { content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; 
                   background: white; border-radius: 50%; transition: left 0.2s; }
  .toggle.on::after { left: 25px; }
  .page-wrap { width: 100%; max-width: 1000px; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
`;

function page(title: string, body: string, extraScripts: string = ''): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  ${body}
  ${extraScripts}
  <script>
    async function api(path, options = {}) {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
      if (token) headers['Authorization'] = 'Bearer ' + token;
      const res = await fetch(path, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '请求失败');
      return data;
    }
    function showError(el, msg) { el.textContent = msg; el.style.display = 'block'; }
    function hideError(el) { el.style.display = 'none'; }
    function showSuccess(el, msg) { el.textContent = msg; el.style.display = 'block'; setTimeout(() => hideError(el), 3000); }
  </script>
</body>
</html>`;
}

// ==== 首页 ====
export function html_home(): string {
  return page('OAuth2 Tool', `
    <div class="container" style="text-align:center;">
      <h1>🚀 OAuth2 Tool</h1>
      <p class="subtitle">一个轻量的 Cloudflare Workers OAuth2 身份提供方</p>
      <div style="margin-top: 30px; display: flex; flex-direction: column; gap: 12px;">
        <a href="/login" style="text-decoration:none;"><button>登录</button></a>
        <a href="/register" style="text-decoration:none;"><button class="btn-secondary">注册</button></a>
        <a href="/dashboard" class="link">用户仪表盘</a>
        <a href="/admin" class="link">管理员后台</a>
      </div>
    </div>
  `);
}

// ==== 登录页 ====
export function html_login(): string {
  return page('登录', `
    <div class="container">
      <h1>欢迎回来 👋</h1>
      <p class="subtitle">登录你的账户</p>
      <div class="error" id="err"></div>
      <form id="loginForm">
        <div class="form-group">
          <label>邮箱</label>
          <input type="email" name="email" required autocomplete="email">
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" name="password" required autocomplete="current-password">
        </div>
        <div class="form-group" id="totpGroup" style="display:none;">
          <label>2FA 验证码</label>
          <input type="text" name="totp_code" placeholder="6位验证码">
        </div>
        <button type="submit">登录</button>
      </form>
      <a href="/register" class="link">没有账户？去注册</a>
    </div>
  `, `
    <script>
      const form = document.getElementById('loginForm');
      const errEl = document.getElementById('err');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); hideError(errEl);
        const data = Object.fromEntries(new FormData(form));
        try {
          const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          const params = new URLSearchParams(location.search);
          const redirect = params.get('redirect');
          if (res.user.is_admin) {
            location.href = redirect || '/admin';
          } else {
            location.href = redirect || '/dashboard';
          }
        } catch (err) {
          if (err.message.includes('需要 TOTP')) {
            document.getElementById('totpGroup').style.display = 'block';
            form.querySelector('[name="totp_code"]').required = true;
            document.querySelector('[name="password"]').dataset.tried = '1';
          } else {
            showError(errEl, err.message);
          }
        }
      });
    </script>
  `);
}

// ==== 注册页 ====
export function html_register(): string {
  return page('注册', `
    <div class="container">
      <h1>创建账户 ✨</h1>
      <p class="subtitle">加入 OAuth2 Tool</p>
      <div class="error" id="err"></div>
      <div class="success" id="ok"></div>
      <form id="regForm">
        <div class="form-group">
          <label>邮箱</label>
          <input type="email" name="email" required autocomplete="email">
        </div>
        <div class="form-group">
          <label>名称 (可选)</label>
          <input type="text" name="name" autocomplete="name">
        </div>
        <div class="form-group">
          <label>密码</label>
          <input type="password" name="password" required minlength="6" autocomplete="new-password">
        </div>
        <div class="form-group" id="inviteGroup" style="display:none;">
          <label>邀请码</label>
          <input type="text" name="invite_code" placeholder="请输入邀请码">
        </div>
        <div class="form-group" id="turnstileGroup" style="display:none;">
          <div id="turnstileWidget"></div>
        </div>
        <button type="submit">注册</button>
      </form>
      <a href="/login" class="link">已有账户？去登录</a>
    </div>
  `, `
    <script>
      let config = {};
      let turnstileToken = '';

      async function init() {
        const cfg = await fetch('/api/config').then(r => r.json());
        config = cfg;
        if (cfg.require_invite) {
          document.getElementById('inviteGroup').style.display = 'block';
        }
        if (cfg.turnstile_enabled && cfg.turnstile_site_key) {
          document.getElementById('turnstileGroup').style.display = 'block';
          const s = document.createElement('script');
          s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
          document.head.appendChild(s);
          setTimeout(() => {
            if (window.turnstile) {
              window.turnstile.render('#turnstileWidget', {
                sitekey: cfg.turnstile_site_key,
                callback: (tok) => { turnstileToken = tok; }
              });
            }
          }, 500);
        }
      }
      init();

      const form = document.getElementById('regForm');
      const errEl = document.getElementById('err');
      const okEl = document.getElementById('ok');
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); hideError(errEl); hideError(okEl);
        const data = Object.fromEntries(new FormData(form));
        if (config.turnstile_enabled) data.turnstile_token = turnstileToken;
        try {
          const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
          localStorage.setItem('token', res.token);
          localStorage.setItem('user', JSON.stringify(res.user));
          showSuccess(okEl, '注册成功！');
          setTimeout(() => location.href = '/dashboard', 1000);
        } catch (err) {
          showError(errEl, err.message);
        }
      });
    </script>
  `);
}

// ==== 用户仪表盘 ====
export function html_dashboard(): string {
  return page('用户仪表盘', `
    <div class="page-wrap">
      <div class="admin-bar">
        <span>用户仪表盘</span>
        <div>
          <a href="/">首页</a>
          <a href="#" id="logout">登出</a>
        </div>
      </div>
      <div class="admin-container">
        <div class="card">
          <h2>👋 欢迎，<span id="userName">...</span></h2>
          <p style="color:#888;" id="userEmail">...</p>
        </div>

        <div class="card">
          <h3>🔐 修改密码</h3>
          <div class="error" id="pwdErr"></div>
          <div class="success" id="pwdOk"></div>
          <div class="form-group">
            <label>当前密码</label>
            <input type="password" id="curPwd">
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input type="password" id="newPwd">
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input type="password" id="confirmPwd">
          </div>
          <button onclick="changePassword()">更新密码</button>
        </div>

        <div class="card">
          <h3>🛡️ 两步验证 (2FA)</h3>
          <div id="2faStatus">加载中...</div>
          <div id="2faSetup" style="display:none; margin-top:16px;">
            <p style="margin-bottom:12px; color:#666;">请使用 Google Authenticator / 1Password 等应用扫描二维码</p>
            <div class="qr-placeholder">
              <div class="code-display" id="otpauthUrl" style="font-size:12px; word-break:break-all;"></div>
              <p style="margin:12px 0; color:#888;">或手动输入密钥：</p>
              <div class="code-display" id="secretKey"></div>
            </div>
            <div style="margin-top:16px;">
              <div class="form-group">
                <label>输入 6 位验证码</label>
                <input type="text" id="setupCode" placeholder="6位验证码">
              </div>
              <div class="row">
                <button onclick="enable2FA()">启用 2FA</button>
                <button class="btn-secondary" onclick="document.getElementById('2faSetup').style.display='none'">取消</button>
              </div>
            </div>
          </div>
          <div id="2faDisable" style="display:none; margin-top:16px;">
            <div class="form-group">
              <label>当前密码</label>
              <input type="password" id="disablePwd">
            </div>
            <div class="form-group">
              <label>当前 2FA 验证码</label>
              <input type="text" id="disableCode" placeholder="6位验证码">
            </div>
            <button class="btn-danger" onclick="disable2FA()">禁用 2FA</button>
          </div>
        </div>
      </div>
    </div>
  `, `
    <script>
      let user = null;
      async function init() {
        try {
          const res = await api('/api/auth/me');
          user = res;
          document.getElementById('userName').textContent = res.name || res.email.split('@')[0];
          document.getElementById('userEmail').textContent = res.email;
          update2FAStatus();
        } catch {
          if (localStorage.getItem('token')) localStorage.removeItem('token');
          location.href = '/login';
        }
      }

      document.getElementById('logout').onclick = () => {
        localStorage.removeItem('token');
        location.href = '/login';
      };

      async function changePassword() {
        const cur = document.getElementById('curPwd').value;
        const n = document.getElementById('newPwd').value;
        const c = document.getElementById('confirmPwd').value;
        if (!cur || !n) return showError(document.getElementById('pwdErr'), '请填写完整');
        if (n !== c) return showError(document.getElementById('pwdErr'), '两次密码不一致');
        if (n.length < 6) return showError(document.getElementById('pwdErr'), '密码至少6位');
        hideError(document.getElementById('pwdErr'));
        try {
          await api('/api/dashboard/password', { method: 'POST', body: JSON.stringify({ current_password: cur, new_password: n }) });
          showSuccess(document.getElementById('pwdOk'), '密码已更新！');
          document.getElementById('curPwd').value = '';
          document.getElementById('newPwd').value = '';
          document.getElementById('confirmPwd').value = '';
        } catch (err) { showError(document.getElementById('pwdErr'), err.message); }
      }

      async function update2FAStatus() {
        const el = document.getElementById('2faStatus');
        if (user.two_factor_enabled) {
          el.innerHTML = '<span style="color:#16a34a; font-weight:600;">✅ 已启用</span>';
          document.getElementById('2faDisable').style.display = 'block';
        } else {
          el.innerHTML = '<span style="color:#888;">未启用</span> <button style="width:auto; padding:6px 12px; margin-left:12px;" onclick="setup2FA()">设置 2FA</button>';
        }
      }

      async function setup2FA() {
        try {
          const res = await api('/api/dashboard/2fa/setup');
          document.getElementById('otpauthUrl').textContent = res.otpauth;
          document.getElementById('secretKey').textContent = res.secret;
          document.getElementById('2faSetup').style.display = 'block';
        } catch (err) { alert(err.message); }
      }

      async function enable2FA() {
        const code = document.getElementById('setupCode').value;
        if (!code) return alert('请输入验证码');
        try {
          await api('/api/dashboard/2fa/enable', { method: 'POST', body: JSON.stringify({ code }) });
          alert('2FA 已启用！');
          user.two_factor_enabled = true;
          document.getElementById('2faSetup').style.display = 'none';
          update2FAStatus();
        } catch (err) { alert(err.message); }
      }

      async function disable2FA() {
        const password = document.getElementById('disablePwd').value;
        const code = document.getElementById('disableCode').value;
        if (!password) return alert('请输入密码');
        try {
          await api('/api/dashboard/2fa/disable', { method: 'POST', body: JSON.stringify({ password, code }) });
          alert('2FA 已禁用');
          user.two_factor_enabled = false;
          document.getElementById('2faDisable').style.display = 'none';
          update2FAStatus();
        } catch (err) { alert(err.message); }
      }

      init();
    </script>
  `);
}

// ==== 管理员后台 ====
export function html_admin(): string {
  return page('管理员后台', `
    <div class="page-wrap">
      <div class="admin-bar">
        <span>🛠️ 管理员后台</span>
        <div>
          <a href="/">首页</a>
          <a href="#" id="logout">登出</a>
        </div>
      </div>
      <div class="admin-container" id="adminContent">加载中...</div>
    </div>
  `, `
    <script>
      async function init() {
        let me;
        try {
          me = await api('/api/auth/me');
          if (!me.is_admin) throw new Error('需要管理员权限');
        } catch {
          if (localStorage.getItem('token')) localStorage.removeItem('token');
          location.href = '/login?redirect=/admin';
          return;
        }
        render();
      }

      document.getElementById('logout').onclick = () => {
        localStorage.removeItem('token');
        location.href = '/login';
      };

      async function render() {
        const content = document.getElementById('adminContent');
        const [users, clients, codes, settings] = await Promise.all([
          api('/api/admin/users').then(r => r.users),
          api('/api/admin/clients').then(r => r.clients),
          api('/api/admin/invite/codes').then(r => r.codes),
          api('/api/admin/settings'),
        ]);

        let html = '';

        // 系统设置
        html += \`
          <div class="card">
            <h2>⚙️ 系统设置</h2>
            <div class="settings-item">
              <div>
                <strong>注册需要邀请码</strong>
                <div style="font-size:12px; color:#888;">开启后新用户必须使用邀请码才能注册</div>
              </div>
              <div class="toggle \${settings.require_invite ? 'on' : ''}" data-key="require_invite"></div>
            </div>
            <div class="settings-item">
              <div>
                <strong>启用 Turnstile 人机验证</strong>
                <div style="font-size:12px; color:#888;">需要已配置 TURNSTILE_SITE_KEY 和 TURNSTILE_SECRET</div>
              </div>
              <div class="toggle \${settings.turnstile_enabled ? 'on' : ''}" data-key="turnstile_enabled"></div>
            </div>
            <div style="margin-top:12px; font-size:12px; color:#888;">
              管理员邮箱: \${settings.admin_email}<br>
              Turnstile Site Key: \${settings.turnstile_site_key || '未设置'}<br>
              Turnstile Secret: \${settings.has_turnstile_secret ? '已配置' : '未配置'}
            </div>
          </div>
        \`;

        // 邀请码管理
        html += \`
          <div class="card">
            <h2>🎟️ 邀请码管理</h2>
            <div class="row" style="margin-bottom:16px;">
              <button onclick="createInviteCode()">生成新邀请码</button>
              <button class="btn-secondary" onclick="createInviteCode(30)">生成(30天有效)</button>
            </div>
            <table>
              <thead><tr><th>邀请码</th><th>状态</th><th>使用者</th><th>创建时间</th></tr></thead>
              <tbody>
                \${codes.length === 0 ? '<tr><td colspan="4" style="text-align:center; color:#888;">暂无邀请码</td></tr>' : 
                  codes.map(c => '<tr><td><code>' + c.code + '</code></td><td>' + (c.used ? '已使用' : '未使用') + '</td><td>' + (c.used_by || '-') + '</td><td>' + new Date(c.created_at * 1000).toLocaleString() + '</td></tr>').join('')}
              </tbody>
            </table>
          </div>
        \`;

        // 用户管理
        html += \`
          <div class="card">
            <h2>👥 用户管理 (\${users.length})</h2>
            <table>
              <thead><tr><th>ID</th><th>邮箱</th><th>名称</th><th>角色</th><th>2FA</th><th>创建时间</th><th>操作</th></tr></thead>
              <tbody>
                \${users.map(u => '<tr>' +
                  '<td>' + u.id + '</td>' +
                  '<td>' + u.email + '</td>' +
                  '<td>' + (u.name || '-') + '</td>' +
                  '<td>' + (u.is_admin ? '<span class="badge badge-admin">管理员</span>' : '用户') + '</td>' +
                  '<td>' + (u.two_factor_enabled ? '<span class="badge badge-2fa">已启用</span>' : '-') + '</td>' +
                  '<td>' + new Date(u.created_at * 1000).toLocaleString() + '</td>' +
                  '<td>' +
                    '<button style="padding:4px 8px;" onclick="resetPwd(' + u.id + ')">重置密码</button> ' +
                    (u.two_factor_enabled ? '<button style="padding:4px 8px;" class="btn-secondary" onclick="disable2fa(' + u.id + ')">禁用2FA</button> ' : '') +
                    (!u.is_admin ? '<button style="padding:4px 8px;" onclick="toggleAdmin(' + u.id + ', ' + (u.is_admin ? 'false' : 'true') + ')">设为管理员</button> ' : '') +
                    (!u.is_admin ? '<button style="padding:4px 8px;" class="btn-danger" onclick="delUser(' + u.id + ')">删除</button>' : '') +
                  '</td></tr>').join('')}
              </tbody>
            </table>
          </div>
        \`;

        // OAuth 客户端
        html += \`
          <div class="card">
            <h2>🔑 OAuth 客户端</h2>
            <div class="row" style="margin-bottom:16px;">
              <input id="clientName" placeholder="客户端名称" style="width:auto;">
              <input id="clientUri" placeholder="重定向 URL" style="width:auto; flex:1;">
              <button onclick="createClient()">创建客户端</button>
            </div>
            <table>
              <thead><tr><th>名称</th><th>Client ID</th><th>重定向 URL</th><th>创建时间</th><th>操作</th></tr></thead>
              <tbody>
                \${clients.length === 0 ? '<tr><td colspan="5" style="text-align:center; color:#888;">暂无客户端</td></tr>' :
                  clients.map(c => '<tr>' +
                    '<td>' + c.name + '</td>' +
                    '<td><code>' + c.client_id + '</code></td>' +
                    '<td>' + c.redirect_uri + '</td>' +
                    '<td>' + new Date(c.created_at * 1000).toLocaleString() + '</td>' +
                    '<td>' +
                      '<button style="padding:4px 8px;" onclick="showSecret(' + c.id + ')">重置密钥</button> ' +
                      '<button style="padding:4px 8px;" class="btn-danger" onclick="delClient(' + c.id + ')">删除</button>' +
                    '</td></tr>').join('')}
              </tbody>
            </table>
          </div>
        \`;

        content.innerHTML = html;
        bindToggles(settings);
      }

      function bindToggles(settings) {
        document.querySelectorAll('.toggle').forEach(el => {
          el.onclick = async () => {
            const key = el.dataset.key;
            const newVal = !el.classList.contains('on');
            el.classList.toggle('on');
            await api('/api/admin/settings', { method: 'PUT', body: JSON.stringify({ [key]: newVal }) });
          };
        });
      }

      async function createInviteCode(days) {
        const res = await api('/api/admin/invite', { method: 'POST', body: JSON.stringify({ expires_days: days || null }) });
        alert('新邀请码: ' + res.code);
        render();
      }

      async function createClient() {
        const name = document.getElementById('clientName').value;
        const uri = document.getElementById('clientUri').value;
        if (!name || !uri) return alert('请填写完整');
        const res = await api('/api/admin/clients', { method: 'POST', body: JSON.stringify({ name, redirect_uri: uri }) });
        alert('创建成功！\\nClient ID: ' + res.client.client_id + '\\nClient Secret: ' + res.client.client_secret);
        document.getElementById('clientName').value = '';
        document.getElementById('clientUri').value = '';
        render();
      }

      async function delClient(id) {
        if (!confirm('确定删除此客户端？')) return;
        await api('/api/admin/clients/' + id, { method: 'DELETE' });
        render();
      }

      async function showSecret(id) {
        const res = await api('/api/admin/clients/' + id + '/secret');
        alert('Client ID: ' + res.client_id + '\\n新 Client Secret: ' + res.client_secret + '\\n(旧密钥已失效)');
      }

      async function resetPwd(userId) {
        const pwd = prompt('输入新密码 (至少6位):');
        if (!pwd || pwd.length < 6) return alert('密码至少6位');
        await api('/api/admin/users/' + userId + '/password', { method: 'PUT', body: JSON.stringify({ new_password: pwd }) });
        alert('密码已重置');
      }

      async function toggleAdmin(userId, isAdmin) {
        if (!confirm('确定修改此用户的管理员状态？')) return;
        await api('/api/admin/users/' + userId + '/admin', { method: 'PUT', body: JSON.stringify({ is_admin: isAdmin }) });
        render();
      }

      async function disable2fa(userId) {
        if (!confirm('确定禁用此用户的 2FA？')) return;
        await api('/api/admin/users/' + userId + '/2fa', { method: 'PUT', body: JSON.stringify({}) });
        render();
      }

      async function delUser(userId) {
        if (!confirm('确定删除此用户？此操作不可恢复！')) return;
        await api('/api/admin/users/' + userId, { method: 'DELETE' });
        render();
      }

      init();
    </script>
  `);
}
