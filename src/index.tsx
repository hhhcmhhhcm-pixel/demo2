/**
 * ===================================================================
 * 参与通 Deal Connect — Full-Stack SPA (V2 — 筛子驱动看板)
 * ===================================================================
 * 核心逻辑：
 *   发起通(Originate) → 产生所有投资机会
 *   评估通(Assess)    → 提供多种AI筛子模型
 *   参与通(Deal)      → 投资者看板：筛后展示 + 参与决策
 *
 * 参与通用户的工作流：
 *   1. 选择/切换评估通筛子（或不选 = 看全部）
 *   2. 浏览通过筛子的机会（来自发起通）
 *   3. 对感兴趣的机会表达参与意向
 *   4. 追踪参与进度
 *
 * Brand: DEAL CONNECT / 参与通
 * Powered by Micro Connect Group
 */
import { Hono } from 'hono'

const app = new Hono()

/* ============================
   API Routes (Backend)
   ============================ */

const users: Map<string, any> = new Map()

app.post('/api/auth/register', async (c) => {
  const { username, email, password, displayName, phone, role } = await c.req.json()
  if (!username || !email || !password) return c.json({ success: false, message: '用户名、邮箱和密码为必填项' }, 400)
  if (users.has(username) || [...users.values()].find(u => u.email === email)) return c.json({ success: false, message: '用户名或邮箱已被注册' }, 409)
  const user = { id: 'U_' + Date.now(), username, email, password, displayName: displayName || username, phone, role: role || 'investor', createdAt: new Date().toISOString() }
  users.set(username, user)
  return c.json({ success: true, user: { ...user, password: undefined }, message: '注册成功' })
})

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json()
  if (!username || !password) return c.json({ success: false, message: '请输入用户名和密码' }, 400)
  const user = users.get(username) || [...users.values()].find(u => u.email === username)
  if (!user || user.password !== password) return c.json({ success: false, message: '用户名或密码错误' }, 401)
  return c.json({ success: true, user: { ...user, password: undefined }, message: '登录成功' })
})

app.post('/api/auth/logout', (c) => c.json({ success: true, message: '已安全退出' }))
app.get('/api/auth/me', (c) => c.json({ success: true, user: null }))
app.get('/api/deals', (c) => c.json({ success: true, deals: [] }))

/* ============================
   Main HTML Page (SPA)
   ============================ */
app.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>参与通 Deal Connect</title>
  <meta name="description" content="参与通 Deal Connect — 投资者的智能机会看板。基于评估通AI筛子，精准匹配发起通项目。">
  <meta name="theme-color" content="#0a2e2a">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='url(%23g)'/%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='64' y2='64'%3E%3Cstop offset='0%25' stop-color='%232EC4B6'/%3E%3Cstop offset='100%25' stop-color='%2328A696'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M20 20 L44 32 L20 44 Z' fill='white' opacity='0.95'/%3E%3C/svg%3E">
  <link rel="dns-prefetch" href="https://cdn.tailwindcss.com">
  <link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">
  <link rel="preconnect" href="https://cdn.tailwindcss.com" crossorigin>
  <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossorigin>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">
  <link href="/static/style.css" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif; line-height: 1.5; background: #f5f5f7; color: #1d1d1f; -webkit-font-smoothing: antialiased; letter-spacing: -0.01em; }
    .hidden { display: none !important; }
    .page { display: none; }
    .page.active { display: flex; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
    /* 筛子选择器专属样式 */
    .sieve-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; border: 1.5px solid rgba(0,0,0,0.08); background: white; cursor: pointer; transition: all 0.25s cubic-bezier(0.28,0.11,0.32,1); white-space: nowrap; }
    .sieve-chip:hover { border-color: rgba(93,196,179,0.4); background: rgba(93,196,179,0.04); transform: translateY(-1px); }
    .sieve-chip.active { border-color: #2EC4B6; background: linear-gradient(135deg, rgba(93,196,179,0.1), rgba(73,168,154,0.08)); color: #0f766e; box-shadow: 0 2px 8px rgba(46,196,182,0.2); }
    .sieve-chip.active i { color: #2EC4B6; }
    /* 匹配度指示条 */
    .match-bar { height: 3px; border-radius: 2px; background: #e5e7eb; overflow: hidden; }
    .match-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
    /* 来源标签 */
    .source-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; letter-spacing: 0.03em; }
    .source-originate { background: rgba(245,158,11,0.1); color: #b45309; }
    /* 筛子标签 */
    .sieve-tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 7px; border-radius: 4px; font-size: 10px; font-weight: 600; }
    .sieve-pass { background: rgba(16,185,129,0.1); color: #047857; }
    .sieve-fail { background: rgba(239,68,68,0.1); color: #b91c1c; }
    /* 用户下拉样式 */
    .user-dropdown { position: absolute; top: calc(100% + 8px); right: 0; width: 240px; background: white; border-radius: 16px; box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04); z-index: 100; opacity: 0; transform: translateY(-8px) scale(0.96); pointer-events: none; transition: all 0.2s cubic-bezier(0.28,0.11,0.32,1); }
    .user-dropdown.show { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .user-dropdown-header { padding: 16px; border-bottom: 1px solid #f1f5f9; }
    .user-dropdown-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 16px; font-size: 13px; font-weight: 500; color: #374151; transition: all 0.15s; cursor: pointer; background: none; border: none; text-align: left; }
    .user-dropdown-item:hover { background: #f8fafc; color: #0f766e; }
    .user-dropdown-item.danger:hover { background: #fef2f2; color: #dc2626; }
    .user-dropdown-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }
  </style>
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- ==================== Loading Screen ==================== -->
  <div id="app-loading">
    <div style="width:56px; height:72px; position:relative; margin-bottom:8px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 20px rgba(46,196,182,0.4); animation: pulse 2s ease-in-out infinite;"></div>
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 20px rgba(40,166,150,0.35); opacity:0.85; animation: pulse 2s ease-in-out infinite 0.3s;"></div>
    </div>
    <div class="loading-text" style="font-family:'Montserrat',sans-serif; font-weight:900; letter-spacing:0.05em;">DEAL CONNECT</div>
    <div class="loading-sub" style="font-size:14px; letter-spacing:0.15em; margin-top:4px;">参与通</div>
    <div class="loading-sub" id="loadingStatus" style="margin-top:12px;">正在初始化...</div>
    <div style="width: 200px; height: 3px; background: rgba(255,255,255,0.15); border-radius: 99px; margin-top: 16px; overflow: hidden;">
      <div id="loadingBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #2EC4B6, #3DD8CA); border-radius: 99px; transition: width 0.4s ease;"></div>
    </div>
    <div style="margin-top:24px; font-size:9px; letter-spacing:0.2em; color:rgba(255,255,255,0.4); font-family:'Montserrat',sans-serif;">POWERED BY MICRO CONNECT GROUP</div>
  </div>

  <!-- ==================== Onboarding Modal ==================== -->
  <div id="onboardingModal" class="hidden fixed inset-0 bg-black/60 onboarding-modal flex items-center justify-center z-[300]">
    <div class="onboarding-card bg-white rounded-3xl max-w-2xl w-full mx-4 overflow-hidden">
      <div class="relative h-48 overflow-hidden" style="background: linear-gradient(135deg, #5DC4B3 0%, #49A89A 50%, #32ade6 100%);">
        <div class="absolute inset-0 pattern-bg"></div>
        <button onclick="closeOnboarding()" class="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-all"><i class="fas fa-times"></i></button>
        <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
          <button onclick="goToOBStep(0)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50 active" data-step="0"></button>
          <button onclick="goToOBStep(1)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50" data-step="1"></button>
          <button onclick="goToOBStep(2)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50" data-step="2"></button>
          <button onclick="goToOBStep(3)" class="step-dot w-2.5 h-2.5 rounded-full bg-white/50" data-step="3"></button>
        </div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="animate-float"><div class="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center"><i id="obIcon" class="fas fa-filter text-white text-4xl"></i></div></div>
        </div>
      </div>
      <div class="p-8 relative overflow-hidden" style="min-height: 280px;">
        <!-- Step 0: 欢迎 -->
        <div id="obStep0" class="ob-step active text-center">
          <h2 class="text-2xl font-bold text-gray-900 mb-3">欢迎使用参与通</h2>
          <p class="text-gray-500 mb-8">投资者的智能机会看板 — 精准匹配，高效参与</p>
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-4 bg-amber-50 rounded-2xl"><div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-paper-plane text-amber-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">发起通</p><p class="text-xs text-gray-400 mt-1">机会来源</p></div>
            <div class="p-4 bg-cyan-50 rounded-2xl"><div class="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-filter text-cyan-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">评估通筛子</p><p class="text-xs text-gray-400 mt-1">AI精筛</p></div>
            <div class="p-4 bg-teal-50 rounded-2xl"><div class="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mx-auto mb-3"><i class="fas fa-hand-pointer text-teal-600 text-xl"></i></div><p class="text-sm font-medium text-gray-700">参与决策</p><p class="text-xs text-gray-400 mt-1">你的选择</p></div>
          </div>
        </div>
        <!-- Step 1: 发起通来源 -->
        <div id="obStep1" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200"><i class="fas fa-paper-plane text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-amber-600 uppercase tracking-wide">数据来源</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">机会来自发起通</h3><p class="text-gray-500 mb-4">融资方通过「发起通」上传经营数据、商业计划，生成标准化的投资机会。这些机会经过平台初筛后流入参与通。</p>
              <div class="flex items-center space-x-4 text-sm"><div class="flex items-center text-gray-400"><i class="fas fa-check-circle text-amber-500 mr-2"></i><span>标准化数据</span></div><div class="flex items-center text-gray-400"><i class="fas fa-check-circle text-amber-500 mr-2"></i><span>实时更新</span></div></div>
            </div>
          </div>
        </div>
        <!-- Step 2: 评估通筛子 -->
        <div id="obStep2" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200"><i class="fas fa-filter text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-cyan-600 uppercase tracking-wide">智能筛选</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">评估通提供AI筛子</h3><p class="text-gray-500 mb-4">评估通内置多种AI筛选模型（筛子），每个筛子有不同的评估标准。选择筛子后，只展示通过该筛子的项目；不选则看到全部。</p>
              <div class="flex flex-wrap gap-2">
                <span class="sieve-chip active"><i class="fas fa-brain"></i>行业偏好</span>
                <span class="sieve-chip"><i class="fas fa-shield-alt"></i>风控优先</span>
                <span class="sieve-chip"><i class="fas fa-chart-line"></i>高回报</span>
              </div>
            </div>
          </div>
        </div>
        <!-- Step 3: 参与决策 -->
        <div id="obStep3" class="ob-step" style="display:none;">
          <div class="flex items-start space-x-6">
            <div class="flex-shrink-0"><div class="w-16 h-16 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-200"><i class="fas fa-hand-pointer text-white text-2xl"></i></div></div>
            <div class="flex-1"><span class="text-xs font-semibold text-teal-600 uppercase tracking-wide">投资参与</span><h3 class="text-xl font-bold text-gray-900 mt-1 mb-3">筛后精准参与</h3><p class="text-gray-500 mb-4">在筛后的高质量机会中，查看详细评估报告、对比项目，对心仪项目表达参与意向。后续流入条款通和合约通。</p>
              <div class="flex items-center space-x-3">
                <div class="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-sm font-medium"><i class="fas fa-eye mr-1"></i>浏览筛后</div>
                <i class="fas fa-arrow-right text-gray-300"></i>
                <div class="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"><i class="fas fa-hand-point-up mr-1"></i>表达意向</div>
                <i class="fas fa-arrow-right text-gray-300"></i>
                <div class="px-3 py-1.5 bg-cyan-100 text-cyan-700 rounded-lg text-sm font-medium"><i class="fas fa-file-contract mr-1"></i>进入条款</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="px-8 pb-8 flex items-center justify-between">
        <button onclick="closeOnboarding()" class="text-sm text-gray-400 hover:text-gray-600 transition-colors">跳过教程</button>
        <div class="flex items-center space-x-3">
          <button id="obPrev" onclick="obPrev()" class="hidden px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-all"><i class="fas fa-arrow-left mr-2"></i>上一步</button>
          <button id="obNext" onclick="obNext()" class="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all font-medium">开始探索<i class="fas fa-arrow-right ml-2"></i></button>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 0: Login / Register ==================== -->
  <div id="pageAuth" class="page active flex-col min-h-screen cyber-bg particles-bg">
    <div class="flex-1 flex items-center justify-center p-4 relative z-10">
      <div class="bg-white rounded-3xl max-w-md w-full overflow-hidden animate-scale-in" style="box-shadow: 0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.08);">
        <div class="p-8 text-center" style="border-bottom: 1px solid rgba(0,0,0,0.06);">
          <div class="mx-auto mb-5 animate-float" style="width:52px; height:68px; position:relative;">
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6 0%, #3DD8CA 100%); position:absolute; top:0; left:4px; box-shadow: 0 4px 16px rgba(46,196,182,0.35);"></div>
            <div style="width:44px; height:44px; border-radius:50%; background:linear-gradient(135deg, #28A696 0%, #2EC4B6 100%); position:absolute; bottom:0; left:4px; box-shadow: 0 4px 16px rgba(40,166,150,0.3); opacity:0.85;"></div>
          </div>
          <h1 style="font-family:'Montserrat',sans-serif; font-weight:900; font-size:22px; letter-spacing:0.04em; color:#1a1a1a; line-height:1.15; margin-bottom:6px;">DEAL<br>CONNECT</h1>
          <div style="width:120px; height:2.5px; background:#2EC4B6; margin:8px auto 10px; border-radius:2px;"></div>
          <p style="font-family:'Montserrat',sans-serif; font-size:9px; letter-spacing:0.2em; color:#666; font-weight:500;">POWERED BY MICRO CONNECT GROUP</p>
          <p class="text-lg font-bold mt-3" style="color:#1a1a1a;">参与通</p>
          <p class="text-xs text-gray-400 mt-1">投资者的智能机会看板</p>
        </div>
        <div class="flex" style="border-bottom: 1px solid rgba(0,0,0,0.06);">
          <button onclick="switchAuthTab('login')" id="tabLogin" class="flex-1 py-3 text-center font-semibold" style="color:#2EC4B6; border-bottom: 2px solid #2EC4B6;">登录</button>
          <button onclick="switchAuthTab('register')" id="tabRegister" class="flex-1 py-3 text-center font-semibold" style="color:#86868b;">注册</button>
        </div>
        <!-- Login Form -->
        <div id="formLogin" class="p-6">
          <form onsubmit="event.preventDefault(); handleLogin();" autocomplete="on">
          <div class="space-y-4">
            <div><label class="block text-sm font-medium text-gray-700 mb-1">用户名 / 邮箱</label><input type="text" id="loginUsername" placeholder="请输入用户名或邮箱" autocomplete="username" class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500" onkeydown="if(event.key==='Enter')document.getElementById('loginPassword').focus()"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">密码</label><div class="password-wrapper" style="position:relative;"><input type="password" id="loginPassword" placeholder="请输入密码" autocomplete="current-password" class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500"><button type="button" onclick="togglePwdVis('loginPassword', this)" class="password-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#9ca3af;cursor:pointer;padding:4px;"><i class="fas fa-eye"></i></button></div></div>
            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center text-gray-600 cursor-pointer whitespace-nowrap"><input type="checkbox" id="rememberMe" class="mr-2 rounded" style="width:16px;height:16px;flex-shrink:0;"><span>记住我</span></label>
              <a href="#" class="text-teal-600 hover:text-teal-700" onclick="event.preventDefault(); showToast('info','密码重置','此功能即将上线')">忘记密码？</a>
            </div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-sign-in-alt mr-2"></i>登录</button>
            <button type="button" onclick="handleGuestLogin()" class="w-full py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"><i class="fas fa-user-secret mr-2"></i>游客模式（体验功能）</button>
          </div>
          <p id="loginError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
          <div class="mt-6 pt-6 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center mb-3">企业用户</p>
            <button onclick="showToast('info','SSO登录即将上线','企业统一认证接口已预留')" class="w-full py-3 bg-gray-100 text-gray-500 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"><i class="fas fa-building mr-2"></i>公司SSO登录（即将上线）</button>
          </div>
        </div>
        <!-- Register Form -->
        <div id="formRegister" class="hidden p-6">
          <form onsubmit="event.preventDefault(); handleRegister();" autocomplete="on">
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-3">
              <div><label class="block text-sm font-medium text-gray-700 mb-1">用户名 <span class="text-red-500">*</span></label><input type="text" id="regUsername" placeholder="用于登录" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
              <div><label class="block text-sm font-medium text-gray-700 mb-1">姓名</label><input type="text" id="regDisplayName" placeholder="显示名称" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
            </div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">邮箱 <span class="text-red-500">*</span></label><input type="email" id="regEmail" placeholder="your@email.com" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">手机号</label><input type="tel" id="regPhone" placeholder="13800138000" class="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"></div>
            <div><label class="block text-sm font-medium text-gray-700 mb-1">密码 <span class="text-red-500">*</span></label><div class="password-wrapper" style="position:relative;"><input type="password" id="regPassword" placeholder="至少6位" autocomplete="new-password" class="w-full px-4 py-2.5 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"><button type="button" onclick="togglePwdVis('regPassword', this)" class="password-toggle" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:#9ca3af;cursor:pointer;padding:4px;"><i class="fas fa-eye"></i></button></div></div>
            <button type="submit" class="w-full py-3 btn-primary rounded-xl font-medium shadow-lg"><i class="fas fa-user-plus mr-2"></i>注册</button>
          </div>
          <p id="regError" class="hidden mt-4 text-sm text-red-500 text-center"></p>
          </form>
        </div>
        <div class="px-6 pb-4 text-center"><p class="text-xs text-gray-400">&copy; 2026 参与通 Deal Connect · Micro Connect Group</p></div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 1: Dashboard (投资者看板) ==================== -->
  <div id="pageDashboard" class="page flex-col min-h-screen grid-bg">
    <!-- Navbar -->
    <nav class="px-5 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div style="width:32px; height:36px; position:relative; flex-shrink:0;">
            <div style="width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #2EC4B6, #3DD8CA); position:absolute; top:0; left:3px;"></div>
            <div style="width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg, #28A696, #2EC4B6); position:absolute; bottom:0; left:3px; opacity:0.85;"></div>
          </div>
          <div>
            <h1 class="text-base font-bold tracking-tight" style="color:#1a1a1a;">参与通</h1>
            <p class="text-xs -mt-0.5" style="color:#86868b; font-family:'Montserrat',sans-serif; letter-spacing:0.05em; font-weight:600; font-size:9px;">DEAL CONNECT</p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="showOnboarding()" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #6b7280; background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.06);" data-tip="新手引导"><i class="fas fa-question-circle text-xs"></i><span>帮助</span></button>
          <div class="h-5 mx-0.5" style="width: 1px; background: rgba(0,0,0,0.08);"></div>
          <button onclick="showToast('info','AI推荐引擎','正在基于您的筛子偏好生成推荐')" class="tooltip flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all" style="color: #49A89A; background: rgba(93,196,179,0.06); border: 1px solid rgba(93,196,179,0.12);" data-tip="AI推荐"><i class="fas fa-robot"></i><span>推荐</span></button>
          <!-- User avatar -->
          <div class="pl-1.5 ml-0.5 relative">
            <button onclick="toggleUserDD(event)" id="navUserBtn" class="flex items-center space-x-2 px-2 py-1.5 rounded-full transition-all" style="background: rgba(0,0,0,0.02);" onmouseover="this.style.background='rgba(93,196,179,0.08)'" onmouseout="this.style.background='rgba(0,0,0,0.02)'">
              <div id="navAvatar" class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83); box-shadow: 0 2px 8px rgba(93,196,179,0.3);">U</div>
              <span id="navName" class="text-xs font-semibold max-w-[70px] truncate" style="color: #374151;">用户</span>
              <i class="fas fa-chevron-down text-xs" style="color: #9ca3af; font-size: 10px;"></i>
            </button>
            <div id="userDropdown" class="user-dropdown">
              <div class="user-dropdown-header"><div class="flex items-center space-x-3"><div id="ddAvatar" class="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style="background: linear-gradient(135deg, #5DC4B3, #3D8F83);">U</div><div><div id="ddName" class="font-semibold text-gray-900 text-sm">用户</div><div id="ddRole" class="text-xs text-gray-500">投资者</div></div></div></div>
              <div class="py-1">
                <button class="user-dropdown-item" onclick="showToast('info','个人中心','功能开发中'); closeUserDD();"><i class="fas fa-user-circle"></i>个人中心</button>
                <button class="user-dropdown-item" onclick="showToast('info','筛子偏好','可在评估通中管理您的筛子模型'); closeUserDD();"><i class="fas fa-sliders-h"></i>筛子偏好设置</button>
                <button class="user-dropdown-item" onclick="showOnboarding(); closeUserDD();"><i class="fas fa-graduation-cap"></i>新手引导</button>
                <div class="user-dropdown-divider"></div>
                <button class="user-dropdown-item danger" onclick="closeUserDD(); handleLogout();"><i class="fas fa-sign-out-alt"></i>退出登录</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <div class="flex-1 p-4">
      <div class="max-w-7xl mx-auto">
        <!-- Hero Banner -->
        <div class="relative overflow-hidden rounded-2xl mb-5 p-6" style="background: linear-gradient(135deg, #0a2e2a 0%, #0f3d36 40%, #164e47 100%);">
          <div class="absolute inset-0" style="background: radial-gradient(ellipse at 70% 30%, rgba(93,196,179,0.35) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(46,196,182,0.2) 0%, transparent 50%); pointer-events:none;"></div>
          <div class="relative z-10 flex items-center justify-between">
            <div>
              <h2 class="text-xl font-bold text-white mb-1" style="letter-spacing: -0.02em;" id="welcomeText">欢迎回来</h2>
              <p class="text-sm" style="color: rgba(255,255,255,0.6);">发起通的投资机会，经您的评估通筛子精选后展示于此</p>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-right hidden sm:block">
                <p class="text-xs" style="color:rgba(255,255,255,0.4);">数据来源</p>
                <p class="text-sm font-semibold text-amber-300"><i class="fas fa-paper-plane mr-1"></i>发起通 Originate</p>
              </div>
              <div class="w-px h-10 bg-white/10 hidden sm:block"></div>
              <div class="text-right hidden sm:block">
                <p class="text-xs" style="color:rgba(255,255,255,0.4);">筛选引擎</p>
                <p class="text-sm font-semibold text-cyan-300"><i class="fas fa-filter mr-1"></i>评估通 Assess</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="stat-card animate-fade-in cursor-pointer" onclick="selectSieve('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">全部机会</p><p class="stat-value" id="statTotal">0</p><p class="text-xs text-gray-400 mt-0.5">来自发起通</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); box-shadow: 0 4px 12px rgba(245,158,11,0.3);"><i class="fas fa-paper-plane text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-100 cursor-pointer" onclick="selectSieve('all')">
            <div class="flex items-center justify-between"><div><p class="stat-label">筛后通过</p><p class="stat-value" id="statFiltered">0</p><p class="text-xs text-gray-400 mt-0.5">当前筛子匹配</p></div><div class="icon-container icon-container-sm" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); box-shadow: 0 4px 12px rgba(6,182,212,0.3);"><i class="fas fa-filter text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-200 cursor-pointer" onclick="filterByStatus('interested')">
            <div class="flex items-center justify-between"><div><p class="stat-label">已表达意向</p><p class="stat-value" id="statInterested">0</p></div><div class="icon-container icon-container-sm icon-gradient-warning"><i class="fas fa-hand-point-up text-white text-sm"></i></div></div>
          </div>
          <div class="stat-card animate-fade-in delay-300 cursor-pointer" onclick="filterByStatus('confirmed')">
            <div class="flex items-center justify-between"><div><p class="stat-label">已确认参与</p><p class="stat-value" id="statConfirmed">0</p></div><div class="icon-container icon-container-sm icon-gradient-success"><i class="fas fa-check-double text-white text-sm"></i></div></div>
          </div>
        </div>

        <!-- ===== 筛子选择器 (核心新功能) ===== -->
        <div class="bg-white rounded-2xl p-4 mb-4 border border-gray-100" style="box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center space-x-2">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center" style="background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.12));"><i class="fas fa-filter text-cyan-600 text-sm"></i></div>
              <div>
                <h3 class="text-sm font-bold text-gray-800">评估通 · AI筛子</h3>
                <p class="text-xs text-gray-400">选择筛子模型过滤机会，不选则展示全部</p>
              </div>
            </div>
            <button onclick="showSieveManager()" class="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors"><i class="fas fa-cogs mr-1"></i>管理筛子</button>
          </div>
          <div class="flex flex-wrap gap-2" id="sieveSelector">
            <!-- 动态渲染 by renderSieveSelector() -->
          </div>
          <!-- 筛子说明 -->
          <div id="sieveDescription" class="mt-3 p-3 bg-gray-50 rounded-xl text-xs text-gray-500 hidden">
            <i class="fas fa-info-circle text-cyan-500 mr-1"></i>
            <span id="sieveDescText">选择筛子后查看说明</span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-gray-800">投资机会</h2>
            <span id="filterLabel" class="text-xs text-gray-400 font-medium">· 展示全部</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center bg-white border border-gray-200 rounded-lg p-0.5">
              <button id="viewModeStore" onclick="setDashboardViewMode('store')" class="px-2.5 py-1 text-xs font-semibold rounded-md bg-teal-50 text-teal-700">门店视图</button>
              <button id="viewModeBrand" onclick="setDashboardViewMode('brand')" class="px-2.5 py-1 text-xs font-semibold rounded-md text-gray-600 hover:bg-gray-50">品牌视图</button>
            </div>
            <div class="relative"><input type="text" id="dealSearch" placeholder="搜索公司/品牌/门店/行业/地区" class="search-input px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white w-56" oninput="renderDeals()"></div>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="filterIndustry" onchange="renderDeals()">
              <option value="all">全部行业</option>
              <option value="餐饮">餐饮</option>
              <option value="零售">零售</option>
              <option value="演艺">演艺</option>
              <option value="教育">教育</option>
              <option value="健康">健康</option>
              <option value="科技">科技</option>
            </select>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="filterStatus" onchange="renderDeals()">
              <option value="all">全部状态</option>
              <option value="open">待参与</option>
              <option value="interested">已意向</option>
              <option value="confirmed">已确认</option>
              <option value="closed">已关闭</option>
              <option value="skipped">已跳过</option>
            </select>
            <select class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" id="sortBy" onchange="renderDeals()">
              <option value="push_desc">按推送时间</option>
              <option value="score_desc">按AI评分</option>
              <option value="amount_desc">按金额(高到低)</option>
              <option value="amount_asc">按金额(低到高)</option>
            </select>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mb-3"><i class="fas fa-shield-check mr-1 text-teal-500"></i>资产定向搜索仅匹配 KYB 已认证项目</p>

        <!-- Deal Grid -->
        <div id="dealGrid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"></div>

        <!-- Empty State -->
        <div id="emptyState" class="hidden py-6 animate-fade-in">
          <div class="max-w-3xl mx-auto">
            <div class="text-center mb-6">
              <div class="empty-state-icon mx-auto animate-float"><i class="fas fa-filter"></i></div>
              <h3 class="text-xl font-bold text-gray-800 mb-2" style="letter-spacing:-0.02em;">等待发起通的投资机会</h3>
              <p class="text-sm text-gray-500">机会由融资方通过发起通上传，经评估通筛子过滤后展示于此</p>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-6">
              <button onclick="loadDemoData()" class="group text-left p-5 rounded-2xl border transition-all" style="background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.06);" onmouseover="this.style.borderColor='rgba(52,199,89,0.3)';this.style.boxShadow='0 8px 32px rgba(52,199,89,0.08)';this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(0,0,0,0.06)';this.style.boxShadow='none';this.style.transform='none'">
                <div class="w-12 h-12 icon-container icon-container-lg icon-gradient-success mb-4 group-hover:scale-105 transition-transform" style="border-radius:16px;"><i class="fas fa-database text-white text-lg"></i></div>
                <h4 class="font-bold text-gray-800 mb-1 text-base">加载演示数据</h4>
                <p class="text-sm text-gray-500 leading-relaxed">体验完整功能，查看模拟的发起通项目经筛子过滤后的效果</p>
              </button>
              <div class="text-left p-5 rounded-2xl border" style="background: rgba(255,255,255,0.9); border-color: rgba(0,0,0,0.06);">
                <div class="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style="background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.12));"><i class="fas fa-filter text-cyan-600 text-lg"></i></div>
                <h4 class="font-bold text-gray-800 mb-1 text-base">配置您的筛子</h4>
                <p class="text-sm text-gray-500 leading-relaxed">在评估通中设置您的AI筛选标准，让参与通自动展示匹配机会</p>
              </div>
            </div>
            <div class="rounded-2xl p-5 border" style="background: rgba(255,255,255,0.8); border-color: rgba(0,0,0,0.04);">
              <h4 class="text-xs font-bold uppercase tracking-wider mb-4" style="color: #86868b;"><i class="fas fa-route mr-1.5" style="color: #5DC4B3;"></i>数据流向</h4>
              <div class="flex items-center justify-center gap-3 flex-wrap">
                <div class="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-xl"><i class="fas fa-paper-plane text-amber-500"></i><span class="text-sm font-semibold text-amber-700">发起通</span></div>
                <i class="fas fa-long-arrow-alt-right text-gray-300"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 bg-cyan-50 rounded-xl"><i class="fas fa-filter text-cyan-500"></i><span class="text-sm font-semibold text-cyan-700">评估通筛子</span></div>
                <i class="fas fa-long-arrow-alt-right text-gray-300"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 bg-teal-50 rounded-xl border-2 border-teal-200"><i class="fas fa-hand-pointer text-teal-500"></i><span class="text-sm font-bold text-teal-700">参与通（此页）</span></div>
                <i class="fas fa-long-arrow-alt-right text-gray-300"></i>
                <div class="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl"><i class="fas fa-file-contract text-gray-400"></i><span class="text-sm font-semibold text-gray-500">条款通</span></div>
              </div>
            </div>
            <p class="mt-4 text-xs text-gray-400"><i class="fas fa-question-circle mr-1"></i>首次使用？<button onclick="showOnboarding()" class="text-teal-500 hover:text-teal-600 underline font-medium">查看新手引导</button></p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Page 2: Project Session ==================== -->
  <div id="pageProjectSession" class="page flex-col h-screen grid-bg">
    <nav class="px-4 py-2.5 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button onclick="goToDashboard()" class="back-btn flex items-center px-2.5 py-1.5 text-gray-600 hover:text-teal-600 rounded-lg text-sm"><i class="fas fa-arrow-left mr-1.5"></i><span class="font-medium">返回看板</span></button>
          <div class="border-l border-gray-200 pl-3">
            <div class="flex items-center space-x-2"><h1 class="font-bold text-gray-900 text-sm" id="detailTitle">项目名称</h1><span id="detailStatus" class="badge badge-warning">待参与</span></div>
            <p class="text-xs text-gray-500"><span class="source-tag source-originate"><i class="fas fa-paper-plane"></i>发起通</span> <span id="detailIndustry">行业</span> · <span id="detailDate">日期</span></p>
          </div>
        </div>
        <div class="flex items-center space-x-1.5">
          <button onclick="showToast('info','分享','分享链接已复制')" class="tooltip p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm" data-tip="分享"><i class="fas fa-share-alt"></i></button>
          <button onclick="showToast('info','收藏','已添加到收藏夹')" class="tooltip p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm" data-tip="收藏"><i class="fas fa-bookmark"></i></button>
          <div class="w-px h-6 bg-gray-200 mx-1"></div>
          <button onclick="expressIntent()" id="btnExpressIntent" class="btn-primary text-xs py-1.5 px-4" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);"><i class="fas fa-hand-point-up mr-1"></i>我要参与</button>
        </div>
      </div>
    </nav>

    <!-- Session Tabs -->
    <div class="px-4 pb-2 flex-shrink-0">
      <div class="max-w-7xl mx-auto bg-white rounded-xl border border-gray-100 p-1 flex flex-wrap gap-1">
        <button id="sessionTabBtn-research" onclick="switchSessionTab('research')" class="session-tab-btn px-3 py-2 rounded-lg text-xs font-semibold bg-teal-50 text-teal-700">
          <i class="fas fa-book-open mr-1"></i>做功课
        </button>
        <button id="sessionTabBtn-workbench" onclick="switchSessionTab('workbench')" class="session-tab-btn px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <i class="fas fa-sliders-h mr-1"></i>条款工作台
        </button>
        <button id="sessionTabBtn-intent" onclick="switchSessionTab('intent')" class="session-tab-btn px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <i class="fas fa-hand-point-up mr-1"></i>表达意向
        </button>
        <button id="sessionTabBtn-negotiation" onclick="switchSessionTab('negotiation')" class="session-tab-btn px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <i class="fas fa-comments mr-1"></i>谈判
        </button>
        <button id="sessionTabBtn-timeline" onclick="switchSessionTab('timeline')" class="session-tab-btn px-3 py-2 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
          <i class="fas fa-stream mr-1"></i>时间线
        </button>
      </div>
    </div>

    <!-- Tab: 做功课 -->
    <div id="sessionTab-research" class="flex flex-1 overflow-hidden">
      <div class="w-2/5 border-r border-gray-200 flex flex-col bg-white overflow-y-auto">
        <div class="p-5" id="detailLeft">
          <div class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p class="text-sm">加载中...</p></div>
        </div>
      </div>
      <div class="w-3/5 flex flex-col bg-slate-50 overflow-y-auto">
        <div class="p-3 border-b border-gray-200 bg-white flex items-center justify-between">
          <div class="flex items-center space-x-2"><span class="text-sm font-semibold text-gray-700"><i class="fas fa-book-open mr-1.5 text-cyan-500"></i>做功课工作台</span></div>
          <div class="flex bg-gray-100 rounded-lg p-0.5">
            <button onclick="switchDetailView('onepager')" id="btnOnepager" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600"><i class="fas fa-file-lines mr-1"></i>一页纸</button>
            <button onclick="switchDetailView('comparables')" id="btnComparables" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600"><i class="fas fa-scale-balanced mr-1"></i>同行参考</button>
            <button onclick="switchDetailView('forecast')" id="btnForecast" class="px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600"><i class="fas fa-chart-line mr-1"></i>营业额预估</button>
          </div>
        </div>
        <div class="flex-1 p-5" id="detailRight">
          <div class="text-center py-16 text-gray-400"><i class="fas fa-chart-area text-4xl mb-3 opacity-40"></i><p class="text-sm">选择一个项目开始做功课</p></div>
        </div>
      </div>
    </div>

    <!-- Tab: 条款工作台 -->
    <div id="sessionTab-workbench" class="hidden flex-1 overflow-y-auto p-5">
      <div class="max-w-7xl mx-auto space-y-4">
        <div class="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 class="text-base font-bold text-gray-900 mb-2"><i class="fas fa-sliders-h mr-2 text-cyan-600"></i>RBF 条款工作台</h3>
          <p class="text-sm text-gray-500">三区分离：公共条款（双方可见）/ 私有预测（仅自己可见）/ 派生指标（仅自己可见）。</p>
          <p class="text-xs text-cyan-700 mt-3 p-2.5 rounded-lg bg-cyan-50 border border-cyan-100" id="workbenchPrefillHint">暂无从做功课带入的营业额预估值。</p>
        </div>

        <div id="workbenchPanel" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="bg-white rounded-2xl border border-gray-100 p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-bold text-gray-800"><i class="fas fa-eye mr-1.5 text-gray-500"></i>公共条款区</h4>
              <span class="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-500">双方可见</span>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">融资金额（万）</label>
                <input id="wbAmount" type="number" min="1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateWorkbenchAndRecalc()">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">分成比例（%）</label>
                <input id="wbShare" type="number" step="0.1" min="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateWorkbenchAndRecalc()">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">YITO封顶APR（%）</label>
                <input id="wbApr" type="number" step="0.1" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateWorkbenchAndRecalc()">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">合作期限（月）</label>
                <input id="wbTerm" type="number" min="1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateWorkbenchAndRecalc()">
              </div>
              <button onclick="submitWorkbenchProposal()" class="w-full mt-1 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700">提交方案（草稿）</button>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-bold text-gray-800"><i class="fas fa-lock mr-1.5 text-indigo-500"></i>私有预测区</h4>
              <span class="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-600">仅自己可见</span>
            </div>
            <div class="space-y-3">
              <div>
                <label class="block text-xs text-gray-500 mb-1">预测月均营业额来源</label>
                <select id="wbRevenueSource" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" onchange="updateWorkbenchAndRecalc()">
                  <option value="system">系统预估</option>
                  <option value="borrower">融资方预估</option>
                  <option value="self">自行填写</option>
                  <option value="research">做功课预估</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">预测月均营业额（万）</label>
                <input id="wbRevenue" type="number" step="0.1" min="0.1" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateWorkbenchAndRecalc()">
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button onclick="useResearchForecast()" class="px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-600 text-white hover:bg-cyan-700">使用做功课预估</button>
                <button onclick="updateWorkbenchAndRecalc()" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">刷新计算</button>
              </div>
              <p class="text-[11px] text-gray-400">提示：私有预测不会向融资方或下游系统透出。</p>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-bold text-gray-800"><i class="fas fa-function mr-1.5 text-amber-500"></i>派生指标区</h4>
              <span class="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">仅自己可见</span>
            </div>
            <div class="space-y-2 text-sm">
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">月回款</span><span id="wbMonthlyPayback" class="font-semibold text-gray-800">--</span></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">建议可融资金额上限</span><span id="wbSuggestAmount" class="font-semibold text-gray-800">--</span></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">建议分成比例</span><span id="wbSuggestShare" class="font-semibold text-gray-800">--</span></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">预估触达月数</span><span id="wbTouchMonths" class="font-semibold text-gray-800">--</span></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">YITO触达总回款</span><span id="wbTotalPayback" class="font-semibold text-gray-800">--</span></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">实际APR</span><span id="wbActualApr" class="font-semibold text-gray-800">--</span></div>
              <div class="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100"><span class="text-gray-500">回收倍数</span><span id="wbRecoveryMultiple" class="font-semibold text-gray-800">--</span></div>
            </div>
            <div class="grid grid-cols-1 gap-2 mt-3">
              <button onclick="applySuggestedAmount()" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">按公式倒推金额</button>
              <button onclick="applySuggestedShare()" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">按公式倒推比例</button>
              <button onclick="applyForwardTouchMonths()" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">按公式正推触达月数</button>
            </div>
            <p id="wbFormulaHint" class="text-[11px] text-gray-400 mt-2">公式状态：等待输入参数。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: 表达意向 -->
    <div id="sessionTab-intent" class="hidden flex-1 overflow-y-auto p-5">
      <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 class="text-base font-bold text-gray-900 mb-4"><i class="fas fa-hand-point-up mr-2 text-teal-600"></i>结构化意向填写</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-gray-500 mb-1">投资类型</label>
              <select id="intentInvestmentType" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" onchange="updateIntentAndPreview()">
                <option value="RBF固定">RBF固定</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">金额区间</label>
              <select id="intentAmountBand" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" onchange="updateIntentAndPreview()">
                <option value="100-300">100万 - 300万</option>
                <option value="300-500">300万 - 500万</option>
                <option value="500-800">500万 - 800万</option>
                <option value="800+">800万以上</option>
                <option value="custom">自定义区间</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1">自定义最小值（万）</label>
                <input id="intentCustomMin" type="number" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateIntentAndPreview()">
              </div>
              <div>
                <label class="block text-xs text-gray-500 mb-1">自定义最大值（万）</label>
                <input id="intentCustomMax" type="number" min="0" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateIntentAndPreview()">
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">核心关注点（可多选）</label>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-100"><input class="intent-concern" type="checkbox" value="现金流稳定性" onchange="updateIntentAndPreview()"><span>现金流稳定性</span></label>
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-100"><input class="intent-concern" type="checkbox" value="历史履约记录" onchange="updateIntentAndPreview()"><span>历史履约记录</span></label>
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-100"><input class="intent-concern" type="checkbox" value="分成比例上限" onchange="updateIntentAndPreview()"><span>分成比例上限</span></label>
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-100"><input class="intent-concern" type="checkbox" value="退出周期可控" onchange="updateIntentAndPreview()"><span>退出周期可控</span></label>
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-100"><input class="intent-concern" type="checkbox" value="门店扩张潜力" onchange="updateIntentAndPreview()"><span>门店扩张潜力</span></label>
                <label class="flex items-center gap-2 p-2 rounded-lg border border-gray-100"><input class="intent-concern" type="checkbox" value="团队执行能力" onchange="updateIntentAndPreview()"><span>团队执行能力</span></label>
              </div>
            </div>
            <div>
              <label class="block text-xs text-gray-500 mb-1">备注（可选）</label>
              <textarea id="intentNote" rows="3" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" oninput="updateIntentAndPreview()" placeholder="补充您的关注点或谈判偏好"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button onclick="generateIntentSummary()" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">生成意向摘要</button>
              <button onclick="submitIntent()" class="px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700">确认并发送意向</button>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-file-signature mr-2 text-cyan-600"></i>意向摘要确认</h3>
            <div id="intentSummaryBox" class="p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm text-gray-500">尚未生成摘要。</div>
          </div>
          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-reply mr-2 text-amber-600"></i>融资方响应</h3>
            <div id="intentResponseBox" class="p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">尚未提交意向。</div>
            <div class="grid grid-cols-2 gap-2 mt-3">
              <button onclick="mockIntentResponse('accepted')" class="px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">模拟：接受沟通</button>
              <button onclick="mockIntentResponse('rejected')" class="px-3 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700">模拟：暂不考虑</button>
            </div>
            <p class="text-[11px] text-gray-400 mt-2">验收说明：接受沟通后建议进入条款工作台；暂不考虑则项目留在列表待观察。</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab: 谈判 -->
    <div id="sessionTab-negotiation" class="hidden flex-1 overflow-y-auto p-5">
      <div class="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="xl:col-span-2 space-y-4">
          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-base font-bold text-gray-900"><i class="fas fa-comments mr-2 text-amber-600"></i>方案提交与谈判循环</h3>
              <span id="negotiationGateTip" class="text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700">建议先完成表达意向</span>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">融资金额</p><p id="negAmount" class="font-semibold text-gray-800">--</p></div>
              <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">分成比例</p><p id="negShare" class="font-semibold text-gray-800">--</p></div>
              <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">APR</p><p id="negApr" class="font-semibold text-gray-800">--</p></div>
              <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">合作期限</p><p id="negTerm" class="font-semibold text-gray-800">--</p></div>
            </div>
            <div class="mt-3">
              <label class="block text-xs text-gray-500 mb-1">提案备注</label>
              <textarea id="negProposalNote" rows="2" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="补充本次方案核心诉求"></textarea>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              <button onclick="saveNegotiationDraft('A')" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">保存草稿A</button>
              <button onclick="saveNegotiationDraft('B')" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">保存草稿B</button>
              <button onclick="saveNegotiationDraft('C')" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">保存草稿C</button>
              <button onclick="submitNegotiationProposalFromCurrent()" class="px-3 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700">提交当前方案</button>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-layer-group mr-2 text-cyan-600"></i>多方案对比（A/B/C）</h3>
            <div id="negDraftCompare" class="grid grid-cols-1 md:grid-cols-3 gap-3"></div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-paper-plane mr-2 text-teal-600"></i>谈判记录</h3>
            <div id="negProposalList" class="space-y-2 text-sm text-gray-600">暂无提案记录。</div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-file-lines mr-2 text-indigo-600"></i>沟通纪要</h3>
            <textarea id="negMemoInput" rows="4" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="记录线下会谈要点或争议点"></textarea>
            <div class="grid grid-cols-2 gap-2 mt-2">
              <button onclick="submitNegotiationMemo('pending')" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">上传纪要（待确认）</button>
              <button onclick="submitNegotiationMemo('confirmed')" class="px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">上传并确认纪要</button>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-user-plus mr-2 text-emerald-600"></i>邀请协作</h3>
            <div class="space-y-2">
              <div>
                <label class="block text-xs text-gray-500 mb-1">角色</label>
                <select id="negInviteRole" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="negotiator">谈判者</option>
                  <option value="observer">观察者</option>
                </select>
              </div>
              <button onclick="generateNegotiationInvite()" class="w-full px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">生成7天有效邀请链接</button>
              <div id="negInviteBox" class="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-500">尚未生成邀请链接。</div>
            </div>
          </div>

          <div class="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 class="text-base font-bold text-gray-900 mb-3"><i class="fas fa-file-export mr-2 text-cyan-600"></i>合约通输出预览</h3>
            <pre id="negContractPayloadBox" class="p-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] leading-5 text-gray-600 whitespace-pre-wrap">尚未达成条款，暂无输出。</pre>
            <p class="text-[11px] text-gray-400 mt-2">约束：仅公共参数会流向合约通，私有预测与派生指标不会外传。</p>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Tab: 时间线 -->
    <div id="sessionTab-timeline" class="hidden flex-1 overflow-y-auto p-5">
      <div class="max-w-7xl mx-auto space-y-4">
        <div class="bg-white rounded-2xl border border-gray-100 p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-base font-bold text-gray-900"><i class="fas fa-stream mr-2 text-indigo-600"></i>全程操作时间线</h3>
            <button onclick="renderTimelineTab()" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">刷新</button>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
            <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">事件总数</p><p id="timelineCountAll" class="font-semibold text-gray-800">0</p></div>
            <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">方案事件</p><p id="timelineCountProposal" class="font-semibold text-gray-800">0</p></div>
            <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">纪要事件</p><p id="timelineCountMemo" class="font-semibold text-gray-800">0</p></div>
            <div class="p-2.5 rounded-lg bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">最近更新</p><p id="timelineLastAt" class="font-semibold text-gray-800">--</p></div>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <label class="text-xs text-gray-500">筛选类型</label>
            <select id="timelineFilterType" class="px-3 py-1.5 border border-gray-200 rounded-lg text-xs bg-white" onchange="renderTimelineTab()">
              <option value="all">全部</option>
              <option value="proposal">提案相关</option>
              <option value="memo">纪要相关</option>
              <option value="intent">意向相关</option>
              <option value="invite">邀请相关</option>
            </select>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-gray-100 p-5">
          <div id="timelineList" class="space-y-3 text-sm text-gray-600">暂无时间线事件。</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ==================== Confirm Dialog ==================== -->
  <div id="confirmModal" class="hidden fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200]">
    <div class="bg-white rounded-2xl max-w-sm w-full mx-4 overflow-hidden animate-scale-in">
      <div class="confirm-dialog" style="padding:32px; text-align:center;">
        <div id="confirmIcon" class="confirm-icon warning" style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(245,158,11,0.1);"><i class="fas fa-exclamation-triangle" style="color:#f59e0b;font-size:24px;"></i></div>
        <h3 id="confirmTitle" class="text-lg font-bold text-gray-900 mb-2">确认操作</h3>
        <p id="confirmMessage" class="text-sm text-gray-500 mb-6">确定要执行此操作吗？</p>
        <div class="flex gap-3 justify-center"><button onclick="hideConfirm()" class="btn-secondary rounded-xl px-5 py-2">取消</button><button id="confirmAction" onclick="hideConfirm()" class="btn-primary rounded-xl px-5 py-2">确认</button></div>
      </div>
    </div>
  </div>

  <!-- ==================== AI Assistant FAB ==================== -->
  <div id="aiFab" class="ai-assistant-fab hidden" onclick="toggleAIChat()"><i class="fas fa-robot"></i></div>
  <div id="aiChat" class="ai-chat-window hidden">
    <div class="ai-chat-header"><div class="flex items-center space-x-2"><i class="fas fa-robot text-white"></i><span class="text-white font-semibold text-sm">Deal Connect AI 助手</span></div><button onclick="toggleAIChat()" class="text-white/80 hover:text-white"><i class="fas fa-times"></i></button></div>
    <div class="ai-chat-messages" id="aiMessages">
      <div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">您好！我是参与通AI助手。您可以问我关于筛子模型、项目评估、参与流程等问题。</div></div>
    </div>
    <div class="ai-chat-input" style="padding:16px; border-top:1px solid #f1f5f9;">
      <div class="flex items-center gap-2">
        <input type="text" id="aiInput" placeholder="例如：哪个筛子适合我？" class="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm" onkeydown="if(event.key==='Enter')sendAIMsg()">
        <button onclick="sendAIMsg()" class="btn-primary px-3 py-2 rounded-xl text-sm"><i class="fas fa-paper-plane"></i></button>
      </div>
    </div>
  </div>

  <!-- ==================== JavaScript ==================== -->
  <script>
    // ==================== State ====================
    let currentUser = null;
    let allDeals = [];  // 所有来自发起通的机会（原始数据）
    let dealsList = []; // 当前筛子过滤后的机会
    let currentDeal = null;
    let currentSieve = 'all'; // 当前选中的筛子
    let dashboardViewMode = 'store'; // store | brand
    let currentSessionTab = 'research'; // 项目会话当前Tab
    let researchInputsByDeal = {}; // 做功课Tab中的营业额预估草稿
    let workbenchByDeal = {}; // 条款工作台（按项目存储）
    let workbenchDerivedByDeal = {}; // 条款派生指标快照
    let intentByDeal = {}; // 表达意向（按项目存储）
    let negotiationByDeal = {}; // 谈判状态（按项目存储）
    let timelineByDeal = {}; // 时间线事件（按项目存储）
    let contractPayloadByDeal = {}; // 流向合约通的公共参数快照
    let obStep = 0;

    const INDUSTRY_COMPARABLES = {
      餐饮: {
        amountRange: '300万 - 900万',
        shareRange: '8% - 15%',
        aprRange: '10% - 18%',
        revenueRange: '120万 - 260万/月',
        cases: ['华东连锁餐饮品牌：680万 / 11% / 22个月', '华南快餐品牌：420万 / 12% / 20个月', '川渝火锅品牌：760万 / 10% / 24个月']
      },
      零售: {
        amountRange: '220万 - 780万',
        shareRange: '7% - 13%',
        aprRange: '9% - 16%',
        revenueRange: '90万 - 210万/月',
        cases: ['新消费零售品牌：510万 / 10% / 24个月', '潮玩零售门店：360万 / 12% / 18个月', '区域商超品牌：730万 / 9% / 30个月']
      },
      科技: {
        amountRange: '350万 - 1200万',
        shareRange: '10% - 16%',
        aprRange: '12% - 20%',
        revenueRange: '150万 - 360万/月',
        cases: ['企业SaaS项目：920万 / 12% / 24个月', 'AI应用项目：650万 / 14% / 20个月', '产业数字化项目：1100万 / 10% / 30个月']
      },
      default: {
        amountRange: '250万 - 850万',
        shareRange: '8% - 14%',
        aprRange: '10% - 18%',
        revenueRange: '100万 - 240万/月',
        cases: ['同类YITO案例A：520万 / 11% / 24个月', '同类YITO案例B：430万 / 12% / 21个月', '同类YITO案例C：780万 / 9% / 30个月']
      }
    };

    // ==================== 筛子库（全量可用筛子）====================
    const SIEVE_LIBRARY = {
      industry: {
        name: '行业偏好筛子', icon: 'fa-brain', color: '#8b5cf6', category: '行业',
        desc: '基于您的行业投资偏好（餐饮、零售、科技），筛选符合行业方向的项目',
        preferredIndustries: ['餐饮', '零售', '科技'],
        filter: function(deals) {
          return deals.map(d => {
            const match = this.preferredIndustries.includes(d.industry);
            return { ...d, matchScore: match ? 75 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 30), sieveResult: match ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      risk: {
        name: '风控优先筛子', icon: 'fa-shield-alt', color: '#10b981', category: '风控',
        desc: '严格风控标准：AI评分>=8.5、金额<=800万、有明确退出机制的低风险项目',
        filter: function(deals) {
          return deals.map(d => {
            const score = parseFloat(d.aiScore);
            const amt = d.amount / 10000;
            const pass = score >= 8.5 && amt <= 800;
            return { ...d, matchScore: pass ? 80 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      'return': {
        name: '高回报筛子', icon: 'fa-chart-line', color: '#f59e0b', category: '收益',
        desc: '聚焦高回报项目：分成比例>=12%、AI评分>=8.0的高潜力机会',
        filter: function(deals) {
          return deals.map(d => {
            const share = parseInt(d.revenueShare);
            const score = parseFloat(d.aiScore);
            const pass = share >= 12 && score >= 8.0;
            return { ...d, matchScore: pass ? 82 + Math.floor(Math.random() * 18) : 25 + Math.floor(Math.random() * 20), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      location: {
        name: '区域聚焦筛子', icon: 'fa-map-marker-alt', color: '#ef4444', category: '区域',
        desc: '聚焦一线城市（北京、上海、深圳、杭州）的优质项目',
        focusCities: ['北京', '上海', '深圳', '杭州'],
        filter: function(deals) {
          return deals.map(d => {
            const match = this.focusCities.includes(d.location);
            return { ...d, matchScore: match ? 70 + Math.floor(Math.random() * 30) : 10 + Math.floor(Math.random() * 25), sieveResult: match ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      composite: {
        name: '综合评估筛子', icon: 'fa-layer-group', color: '#06b6d4', category: '综合',
        desc: '多维度综合评估：AI评分、行业前景、风控等级、回报潜力的加权筛选',
        filter: function(deals) {
          return deals.map(d => {
            const score = parseFloat(d.aiScore);
            const share = parseInt(d.revenueShare);
            const composite = (score / 10) * 40 + (share / 20) * 30 + (Math.random() * 30);
            const pass = composite >= 55;
            return { ...d, matchScore: Math.min(99, Math.floor(composite)), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      // ---- 筛子库扩展筛子 ----
      growth: {
        name: '高成长筛子', icon: 'fa-seedling', color: '#22c55e', category: '成长',
        desc: '优选运营年限<=3年、月营收增速良好的高成长型早期项目',
        filter: function(deals) {
          return deals.map(d => {
            const years = parseFloat(d.operatingYears);
            const score = parseFloat(d.aiScore);
            const pass = years <= 3 && score >= 7.5;
            return { ...d, matchScore: pass ? 78 + Math.floor(Math.random() * 22) : 18 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      largeScale: {
        name: '大额项目筛子', icon: 'fa-gem', color: '#a855f7', category: '规模',
        desc: '筛选投资金额>=500万的大体量、高门槛优质项目',
        filter: function(deals) {
          return deals.map(d => {
            const amt = d.amount / 10000;
            const pass = amt >= 500;
            return { ...d, matchScore: pass ? 72 + Math.floor(Math.random() * 28) : 12 + Math.floor(Math.random() * 25), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      teamStrength: {
        name: '团队实力筛子', icon: 'fa-users', color: '#0ea5e9', category: '团队',
        desc: '优选员工>=50人、运营年限>=3年的成熟团队项目',
        filter: function(deals) {
          return deals.map(d => {
            const emp = d.employeeCount || 0;
            const years = parseFloat(d.operatingYears);
            const pass = emp >= 50 && years >= 3;
            return { ...d, matchScore: pass ? 75 + Math.floor(Math.random() * 25) : 15 + Math.floor(Math.random() * 28), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      quickReturn: {
        name: '短周期筛子', icon: 'fa-bolt', color: '#eab308', category: '周期',
        desc: '聚焦分成期限<=24个月的快速回收项目',
        filter: function(deals) {
          return deals.map(d => {
            const months = parseInt(d.period);
            const pass = months <= 24;
            return { ...d, matchScore: pass ? 80 + Math.floor(Math.random() * 20) : 20 + Math.floor(Math.random() * 22), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      },
      safeHaven: {
        name: '稳健保守筛子', icon: 'fa-umbrella', color: '#64748b', category: '风控',
        desc: '极保守策略：风控评级A及以上、AI评分>=9.0、金额<=500万',
        filter: function(deals) {
          return deals.map(d => {
            const score = parseFloat(d.aiScore);
            const amt = d.amount / 10000;
            const grade = d.riskGrade || '';
            const pass = score >= 9.0 && amt <= 500 && (grade.startsWith('A'));
            return { ...d, matchScore: pass ? 88 + Math.floor(Math.random() * 12) : 8 + Math.floor(Math.random() * 20), sieveResult: pass ? 'pass' : 'fail', sieveName: this.name };
          }).filter(d => d.sieveResult === 'pass');
        }
      }
    };

    // 「全部机会」内置筛子（不可删除）
    const SIEVE_ALL = {
      name: '全部机会', icon: 'fa-globe', color: '#6b7280',
      desc: '不使用筛子，展示发起通的所有投资机会',
      filter: (deals) => deals.map(d => ({ ...d, matchScore: null, sieveResult: 'all' }))
    };

    // 用户面板筛子（从筛子库中选取的键名列表）
    let mySieves = [];

    // 初始化用户筛子面板
    function initMySieves() {
      const saved = localStorage.getItem('ec_mySieves');
      if (saved) {
        try { mySieves = JSON.parse(saved).filter(k => SIEVE_LIBRARY[k]); } catch(e) { mySieves = []; }
      }
      if (mySieves.length === 0) {
        // 默认预装3个筛子
        mySieves = ['industry', 'risk', 'composite'];
        saveMySieves();
      }
    }
    function saveMySieves() {
      localStorage.setItem('ec_mySieves', JSON.stringify(mySieves));
    }

    // 构建当前可用的筛子模型（all + mySieves中的）
    function getActiveSieveModels() {
      const models = { all: SIEVE_ALL };
      mySieves.forEach(key => {
        if (SIEVE_LIBRARY[key]) models[key] = SIEVE_LIBRARY[key];
      });
      return models;
    }

    // ==================== Toast System ====================
    function initToastContainer() {
      if (!document.getElementById('toastContainer')) {
        const c = document.createElement('div'); c.id = 'toastContainer'; c.className = 'toast-container'; document.body.appendChild(c);
      }
    }
    function showToast(typeOrMsg, titleOrType, message, duration) {
      const validTypes = ['success', 'error', 'warning', 'info'];
      let type, title;
      if (validTypes.includes(typeOrMsg)) { type = typeOrMsg; title = titleOrType || ''; }
      else { type = validTypes.includes(titleOrType) ? titleOrType : 'info'; title = typeOrMsg || ''; message = ''; }
      initToastContainer();
      const container = document.getElementById('toastContainer');
      const icons = { success: 'fas fa-check-circle', error: 'fas fa-times-circle', warning: 'fas fa-exclamation-triangle', info: 'fas fa-info-circle' };
      duration = duration || (type === 'error' ? 5000 : 3000);
      const toast = document.createElement('div'); toast.className = 'toast toast-' + type;
      toast.innerHTML = '<div class="toast-icon"><i class="' + (icons[type]||icons.info) + '"></i></div><div class="toast-body"><div class="toast-title">' + title + '</div>' + (message ? '<div class="toast-message">' + message + '</div>' : '') + '</div><button class="toast-close" onclick="this.parentElement.classList.add(\\'toast-exit\\'); setTimeout(() => this.parentElement.remove(), 300);"><i class="fas fa-times"></i></button><div class="toast-progress" style="animation-duration: ' + duration + 'ms;"></div>';
      container.appendChild(toast);
      setTimeout(() => { if (toast.parentElement) { toast.classList.add('toast-exit'); setTimeout(() => toast.remove(), 300); } }, duration);
    }

    // ==================== Utilities ====================
    function togglePwdVis(id, btn) {
      const inp = document.getElementById(id); if (!inp) return;
      const icon = btn.querySelector('i');
      if (inp.type === 'password') { inp.type = 'text'; icon.className = 'fas fa-eye-slash'; }
      else { inp.type = 'password'; icon.className = 'fas fa-eye'; }
    }

    function switchPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const page = document.getElementById(pageId); if (page) page.classList.add('active');
      const fab = document.getElementById('aiFab'); if (fab) fab.classList.toggle('hidden', pageId === 'pageAuth');
    }

    function switchSessionTab(tab) {
      currentSessionTab = tab;
      const tabs = ['research', 'workbench', 'intent', 'negotiation', 'timeline'];
      tabs.forEach(t => {
        const panel = document.getElementById('sessionTab-' + t);
        const btn = document.getElementById('sessionTabBtn-' + t);
        if (panel) panel.classList.toggle('hidden', t !== tab);
        if (btn) {
          btn.classList.toggle('bg-teal-50', t === tab);
          btn.classList.toggle('text-teal-700', t === tab);
          btn.classList.toggle('text-gray-600', t !== tab);
          btn.classList.toggle('hover:bg-gray-50', t !== tab);
        }
      });
      if (tab === 'workbench') {
        refreshWorkbenchPrefill();
        renderWorkbench();
      }
      if (tab === 'intent') renderIntentTab();
      if (tab === 'negotiation') renderNegotiationTab();
      if (tab === 'timeline') renderTimelineTab();
    }

    function setDashboardViewMode(mode) {
      dashboardViewMode = mode;
      const storeBtn = document.getElementById('viewModeStore');
      const brandBtn = document.getElementById('viewModeBrand');
      if (storeBtn) {
        storeBtn.classList.toggle('bg-teal-50', mode === 'store');
        storeBtn.classList.toggle('text-teal-700', mode === 'store');
        storeBtn.classList.toggle('text-gray-600', mode !== 'store');
        storeBtn.classList.toggle('hover:bg-gray-50', mode !== 'store');
      }
      if (brandBtn) {
        brandBtn.classList.toggle('bg-teal-50', mode === 'brand');
        brandBtn.classList.toggle('text-teal-700', mode === 'brand');
        brandBtn.classList.toggle('text-gray-600', mode !== 'brand');
        brandBtn.classList.toggle('hover:bg-gray-50', mode !== 'brand');
      }
      renderDeals();
    }

    function saveResearchInputs() {
      localStorage.setItem('ec_researchInputsByDeal', JSON.stringify(researchInputsByDeal));
    }

    function parseWanValue(raw) {
      const normalized = String(raw || '')
        .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 65248))
        .replace(/．/g, '.')
        .replace(/，/g, ',')
        .replace(/,/g, '')
        .replace(/[^\\d.-]/g, '');
      const val = parseFloat(normalized);
      return Number.isFinite(val) ? val : 0;
    }

    function saveWorkbenchState() {
      localStorage.setItem('ec_workbenchByDeal', JSON.stringify(workbenchByDeal));
    }

    function saveIntentState() {
      localStorage.setItem('ec_intentByDeal', JSON.stringify(intentByDeal));
    }

    function ensureIntentState() {
      if (!currentDeal) return null;
      const dealId = currentDeal.id;
      if (intentByDeal[dealId]) return intentByDeal[dealId];
      intentByDeal[dealId] = {
        investmentType: 'RBF固定',
        amountBand: '300-500',
        customMin: '',
        customMax: '',
        concerns: [],
        note: '',
        summary: '',
        submittedAt: '',
        response: 'none'
      };
      saveIntentState();
      return intentByDeal[dealId];
    }

    function getIntentAmountText(state) {
      if (state.amountBand === 'custom') {
        const min = parseWanValue(state.customMin);
        const max = parseWanValue(state.customMax);
        if (min > 0 && max > 0) return min.toFixed(0) + '万 - ' + max.toFixed(0) + '万';
        return '自定义（待填写）';
      }
      if (state.amountBand === '800+') return '800万以上';
      const parts = String(state.amountBand).split('-');
      if (parts.length === 2) return parts[0] + '万 - ' + parts[1] + '万';
      return state.amountBand;
    }

    function renderIntentSummaryAndResponse(state) {
      const summaryBox = document.getElementById('intentSummaryBox');
      const responseBox = document.getElementById('intentResponseBox');
      if (summaryBox) summaryBox.textContent = state.summary || '尚未生成摘要。';
      if (!responseBox) return;
      if (!state.submittedAt) {
        responseBox.className = 'p-3 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700';
        responseBox.textContent = '尚未提交意向。';
        return;
      }
      if (state.response === 'accepted') {
        responseBox.className = 'p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-700';
        responseBox.textContent = '融资方已接受沟通，可进入条款工作台继续推进。';
        return;
      }
      if (state.response === 'rejected') {
        responseBox.className = 'p-3 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-700';
        responseBox.textContent = '融资方暂不考虑，建议保留关注并等待后续窗口。';
        return;
      }
      responseBox.className = 'p-3 rounded-xl bg-cyan-50 border border-cyan-100 text-sm text-cyan-700';
      responseBox.textContent = '意向已发送，等待融资方响应。';
    }

    function renderIntentTab() {
      if (!currentDeal) return;
      const state = ensureIntentState();
      if (!state) return;
      const typeEl = document.getElementById('intentInvestmentType');
      const bandEl = document.getElementById('intentAmountBand');
      const minEl = document.getElementById('intentCustomMin');
      const maxEl = document.getElementById('intentCustomMax');
      const noteEl = document.getElementById('intentNote');
      if (typeEl) typeEl.value = state.investmentType || 'RBF固定';
      if (bandEl) bandEl.value = state.amountBand || '300-500';
      if (minEl) minEl.value = state.customMin || '';
      if (maxEl) maxEl.value = state.customMax || '';
      if (noteEl) noteEl.value = state.note || '';
      document.querySelectorAll('.intent-concern').forEach((el) => {
        const checkbox = el;
        checkbox.checked = state.concerns.includes(checkbox.value);
      });
      renderIntentSummaryAndResponse(state);
    }

    function updateIntentAndPreview() {
      if (!currentDeal) return;
      const state = ensureIntentState();
      if (!state) return;
      state.investmentType = document.getElementById('intentInvestmentType')?.value || 'RBF固定';
      state.amountBand = document.getElementById('intentAmountBand')?.value || '300-500';
      state.customMin = document.getElementById('intentCustomMin')?.value || '';
      state.customMax = document.getElementById('intentCustomMax')?.value || '';
      state.note = document.getElementById('intentNote')?.value || '';
      state.concerns = Array.from(document.querySelectorAll('.intent-concern:checked')).map((el) => el.value);
      saveIntentState();
      renderIntentSummaryAndResponse(state);
    }

    function generateIntentSummary() {
      if (!currentDeal) return;
      updateIntentAndPreview();
      const state = ensureIntentState();
      if (!state) return;
      if (state.amountBand === 'custom') {
        const min = parseWanValue(state.customMin);
        const max = parseWanValue(state.customMax);
        if (!(min > 0 && max > 0 && max >= min)) {
          showToast('warning', '自定义区间无效', '请填写有效金额区间（最大值需>=最小值）');
          return;
        }
      }
      const concernsText = state.concerns.length > 0 ? state.concerns.join('、') : '暂无额外关注点';
      const noteText = state.note ? '备注：' + state.note : '备注：无';
      state.summary =
        '项目：' + currentDeal.name +
        '；投资类型：' + state.investmentType +
        '；意向金额：' + getIntentAmountText(state) +
        '；核心关注：' + concernsText +
        '；参考：AI评分' + currentDeal.aiScore + ' / 风控' + (currentDeal.riskGrade || 'N/A') +
        '；' + noteText;
      saveIntentState();
      renderIntentSummaryAndResponse(state);
      showToast('success', '摘要已生成', '请确认后发送给融资方');
    }

    function submitIntent() {
      if (!currentDeal) return;
      const state = ensureIntentState();
      if (!state) return;
      if (!state.summary) {
        generateIntentSummary();
        if (!state.summary) return;
      }
      state.submittedAt = new Date().toISOString();
      state.response = 'pending';
      currentDeal.status = 'interested';
      const original = allDeals.find(d => d.id === currentDeal.id);
      if (original) original.status = 'interested';
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
      saveIntentState();
      pushTimelineEvent('intent_submitted', '提交结构化意向', getPublicTermsFromWorkbench());
      renderIntentSummaryAndResponse(state);
      showToast('success', '意向已发送', '融资方将收到结构化意向摘要');
    }

    function mockIntentResponse(status) {
      if (!currentDeal) return;
      const state = ensureIntentState();
      if (!state || !state.submittedAt) {
        showToast('warning', '尚未提交意向', '请先完成意向发送');
        return;
      }
      if (status === 'accepted') {
        state.response = 'accepted';
        currentDeal.status = 'interested';
        const original = allDeals.find(d => d.id === currentDeal.id);
        if (original) original.status = 'interested';
        localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
        saveIntentState();
        pushTimelineEvent('intent_accepted', '融资方接受沟通，进入正式谈判', getPublicTermsFromWorkbench());
        renderIntentSummaryAndResponse(state);
        showToast('success', '融资方接受沟通', '已进入条款工作台');
        switchSessionTab('workbench');
        return;
      }
      if (status === 'rejected') {
        state.response = 'rejected';
        currentDeal.status = 'open';
        const original = allDeals.find(d => d.id === currentDeal.id);
        if (original) original.status = 'open';
        localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
        saveIntentState();
        pushTimelineEvent('intent_rejected', '融资方暂不考虑当前意向', getPublicTermsFromWorkbench());
        renderIntentSummaryAndResponse(state);
        showToast('info', '融资方暂不考虑', '项目已回到待参与状态');
      }
    }

    function saveNegotiationState() {
      localStorage.setItem('ec_negotiationByDeal', JSON.stringify(negotiationByDeal));
    }

    function saveTimelineState() {
      localStorage.setItem('ec_timelineByDeal', JSON.stringify(timelineByDeal));
    }

    function saveContractPayloadState() {
      localStorage.setItem('ec_contractPayloadByDeal', JSON.stringify(contractPayloadByDeal));
    }

    function getPublicTermsFromWorkbench() {
      const state = ensureWorkbenchState();
      if (!state) return null;
      return {
        amountWan: Number(state.publicAmountWan),
        sharePct: Number(state.publicSharePct),
        aprPct: Number(state.publicAprPct),
        termMonths: Number(state.publicTermMonths)
      };
    }

    function ensureTimelineState() {
      if (!currentDeal) return [];
      const dealId = currentDeal.id;
      if (!timelineByDeal[dealId]) timelineByDeal[dealId] = [];
      return timelineByDeal[dealId];
    }

    function pushTimelineEvent(type, summary, publicTerms) {
      if (!currentDeal) return;
      const list = ensureTimelineState();
      list.unshift({
        id: 'E_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        at: new Date().toISOString(),
        actor: currentUser?.displayName || currentUser?.username || '我方',
        role: 'investor',
        type,
        summary,
        publicTerms: publicTerms || null
      });
      saveTimelineState();
    }

    function ensureNegotiationState() {
      if (!currentDeal) return null;
      const dealId = currentDeal.id;
      if (negotiationByDeal[dealId]) return negotiationByDeal[dealId];
      negotiationByDeal[dealId] = {
        drafts: { A: null, B: null, C: null },
        proposals: [],
        memos: [],
        invite: null
      };
      saveNegotiationState();
      return negotiationByDeal[dealId];
    }

    function applyPublicTermsToWorkbench(terms) {
      if (!terms) return;
      const wb = ensureWorkbenchState();
      if (!wb) return;
      wb.publicAmountWan = Number(terms.amountWan);
      wb.publicSharePct = Number(terms.sharePct);
      wb.publicAprPct = Number(terms.aprPct);
      wb.publicTermMonths = Number(terms.termMonths);
      saveWorkbenchState();
      recalcWorkbench();
      renderWorkbench();
    }

    function formatTermsInline(terms) {
      if (!terms) return '--';
      return '金额 ' + Number(terms.amountWan).toFixed(1) + '万 / 比例 ' + Number(terms.sharePct).toFixed(2) + '% / APR ' + Number(terms.aprPct).toFixed(2) + '% / 期限 ' + Number(terms.termMonths).toFixed(0) + '月';
    }

    function renderNegotiationDraftCompare(state) {
      const box = document.getElementById('negDraftCompare');
      if (!box) return;
      box.innerHTML = ['A', 'B', 'C'].map((slot) => {
        const draft = state.drafts[slot];
        if (!draft) {
          return '<div class="p-3 rounded-xl border border-dashed border-gray-200 bg-gray-50">' +
            '<p class="text-sm font-semibold text-gray-700 mb-1">草稿' + slot + '</p>' +
            '<p class="text-xs text-gray-400 mb-2">暂无内容</p>' +
            '<button onclick="saveNegotiationDraft(&apos;' + slot + '&apos;)" class="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-white">保存当前参数</button>' +
          '</div>';
        }
        return '<div class="p-3 rounded-xl border border-gray-100 bg-white">' +
          '<p class="text-sm font-semibold text-gray-800 mb-1">草稿' + slot + '</p>' +
          '<p class="text-xs text-gray-500 mb-2">' + formatTermsInline(draft.terms) + '</p>' +
          '<p class="text-xs text-gray-400 mb-2">备注：' + (draft.note || '无') + '</p>' +
          '<div class="grid grid-cols-2 gap-2">' +
            '<button onclick="loadNegotiationDraft(&apos;' + slot + '&apos;)" class="px-2 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">加载</button>' +
            '<button onclick="submitNegotiationProposalFromDraft(&apos;' + slot + '&apos;)" class="px-2 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700">提交</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function getProposalStatusText(status) {
      if (status === 'pending') return '待响应';
      if (status === 'accepted') return '已接受';
      if (status === 'rejected') return '已拒绝';
      if (status === 'countered') return '反提案';
      if (status === 'withdrawn') return '已撤回';
      if (status === 'agreed') return '条款达成';
      return status || '未知';
    }

    function renderNegotiationProposals(state) {
      const list = document.getElementById('negProposalList');
      if (!list) return;
      if (!state.proposals.length && !state.memos.length) {
        list.textContent = '暂无提案记录。';
        return;
      }

      const proposalHtml = state.proposals.map((p) => {
        const actions = [];
        if (p.status === 'pending') {
          actions.push('<button onclick="respondNegotiation(&apos;' + p.id + '&apos;,&apos;accept&apos;)" class="px-2 py-1 text-[11px] rounded bg-emerald-600 text-white">模拟接受</button>');
          actions.push('<button onclick="respondNegotiation(&apos;' + p.id + '&apos;,&apos;reject&apos;)" class="px-2 py-1 text-[11px] rounded bg-rose-600 text-white">模拟拒绝</button>');
          actions.push('<button onclick="respondNegotiation(&apos;' + p.id + '&apos;,&apos;counter&apos;)" class="px-2 py-1 text-[11px] rounded bg-cyan-600 text-white">模拟反提案</button>');
          actions.push('<button onclick="withdrawNegotiationProposal(&apos;' + p.id + '&apos;)" class="px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-700">撤回</button>');
        } else if (p.status === 'accepted') {
          actions.push('<button onclick="confirmNegotiationTerms(&apos;' + p.id + '&apos;)" class="px-2 py-1 text-[11px] rounded bg-teal-600 text-white">确认条款达成</button>');
        } else if (p.status === 'countered' && p.counterTerms) {
          actions.push('<button onclick="applyCounterProposal(&apos;' + p.id + '&apos;)" class="px-2 py-1 text-[11px] rounded bg-amber-600 text-white">采纳反提案到工作台</button>');
        }

        return '<div class="p-3 rounded-xl border border-gray-100 bg-gray-50">' +
          '<div class="flex items-center justify-between mb-1"><p class="text-xs font-semibold text-gray-700">提案 ' + p.id + '</p><span class="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600">' + getProposalStatusText(p.status) + '</span></div>' +
          '<p class="text-xs text-gray-500 mb-1">' + formatTermsInline(p.terms) + '</p>' +
          '<p class="text-xs text-gray-500 mb-1">备注：' + (p.note || '无') + '</p>' +
          (p.counterTerms ? '<p class="text-xs text-cyan-700 mb-1">对方反提案：' + formatTermsInline(p.counterTerms) + '</p>' : '') +
          (actions.length ? '<div class="flex flex-wrap gap-1 mt-2">' + actions.join('') + '</div>' : '') +
        '</div>';
      }).join('');

      const memoHtml = state.memos.map((m) =>
        '<div class="p-3 rounded-xl border border-indigo-100 bg-indigo-50">' +
          '<p class="text-xs font-semibold text-indigo-700 mb-1">纪要 · ' + (m.status === 'confirmed' ? '已确认' : '待确认') + '</p>' +
          '<p class="text-xs text-indigo-700">' + m.content + '</p>' +
        '</div>'
      ).join('');

      list.innerHTML = proposalHtml + memoHtml;
    }

    function renderNegotiationTab() {
      if (!currentDeal) return;
      const state = ensureNegotiationState();
      const intent = ensureIntentState();
      const terms = getPublicTermsFromWorkbench();
      const gate = document.getElementById('negotiationGateTip');
      if (gate) {
        if (intent && intent.response === 'accepted') {
          gate.className = 'text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700';
          gate.textContent = '已建联，可正式谈判';
        } else {
          gate.className = 'text-[11px] px-2 py-0.5 rounded bg-amber-50 text-amber-700';
          gate.textContent = '建议先完成表达意向';
        }
      }
      setText('negAmount', terms ? Number(terms.amountWan).toFixed(1) + '万' : '--');
      setText('negShare', terms ? Number(terms.sharePct).toFixed(2) + '%' : '--');
      setText('negApr', terms ? Number(terms.aprPct).toFixed(2) + '%' : '--');
      setText('negTerm', terms ? Number(terms.termMonths).toFixed(0) + '月' : '--');
      renderNegotiationDraftCompare(state);
      renderNegotiationProposals(state);

      const invite = document.getElementById('negInviteBox');
      if (invite) {
        if (state.invite) invite.textContent = '链接：' + state.invite.link + '（角色：' + (state.invite.role === 'negotiator' ? '谈判者' : '观察者') + '，有效期至 ' + state.invite.expiresAt.slice(0, 10) + '）';
        else invite.textContent = '尚未生成邀请链接。';
      }

      const payloadBox = document.getElementById('negContractPayloadBox');
      if (payloadBox) {
        const payload = contractPayloadByDeal[currentDeal.id];
        payloadBox.textContent = payload ? JSON.stringify(payload, null, 2) : '尚未达成条款，暂无输出。';
      }
    }

    function saveNegotiationDraft(slot) {
      if (!currentDeal) return;
      const state = ensureNegotiationState();
      const terms = getPublicTermsFromWorkbench();
      if (!terms) return;
      const note = document.getElementById('negProposalNote')?.value || '';
      state.drafts[slot] = { terms, note, updatedAt: new Date().toISOString() };
      saveNegotiationState();
      pushTimelineEvent('draft_saved', '保存谈判草稿' + slot, terms);
      renderNegotiationTab();
      showToast('success', '草稿已保存', '草稿' + slot + ' 已更新');
    }

    function loadNegotiationDraft(slot) {
      if (!currentDeal) return;
      const state = ensureNegotiationState();
      const draft = state.drafts[slot];
      if (!draft) {
        showToast('warning', '草稿为空', '请先保存草稿' + slot);
        return;
      }
      applyPublicTermsToWorkbench(draft.terms);
      const noteEl = document.getElementById('negProposalNote');
      if (noteEl) noteEl.value = draft.note || '';
      renderNegotiationTab();
      showToast('info', '已加载草稿', '草稿' + slot + ' 已加载到当前谈判参数');
    }

    function createNegotiationProposal(terms, note, source) {
      if (!currentDeal) return null;
      const state = ensureNegotiationState();
      const proposal = {
        id: 'P_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        createdAt: new Date().toISOString(),
        source,
        terms,
        note: note || '',
        status: 'pending',
        counterTerms: null
      };
      state.proposals.unshift(proposal);
      saveNegotiationState();
      pushTimelineEvent('proposal_submitted', '提交谈判方案 ' + proposal.id, terms);
      renderNegotiationTab();
      return proposal;
    }

    function submitNegotiationProposalFromCurrent() {
      if (!currentDeal) return;
      const terms = getPublicTermsFromWorkbench();
      if (!terms) return;
      const note = document.getElementById('negProposalNote')?.value || '';
      const proposal = createNegotiationProposal(terms, note, 'current');
      if (proposal) showToast('success', '方案已提交', '提案编号：' + proposal.id);
    }

    function submitNegotiationProposalFromDraft(slot) {
      if (!currentDeal) return;
      const state = ensureNegotiationState();
      const draft = state.drafts[slot];
      if (!draft) {
        showToast('warning', '草稿为空', '请先保存草稿' + slot);
        return;
      }
      const proposal = createNegotiationProposal(draft.terms, draft.note || '', 'draft-' + slot);
      if (proposal) showToast('success', '草稿已提交', '提案编号：' + proposal.id);
    }

    function findProposalById(proposalId) {
      const state = ensureNegotiationState();
      if (!state) return null;
      return state.proposals.find((p) => p.id === proposalId) || null;
    }

    function respondNegotiation(proposalId, action) {
      if (!currentDeal) return;
      const proposal = findProposalById(proposalId);
      if (!proposal || proposal.status !== 'pending') return;
      if (action === 'accept') {
        proposal.status = 'accepted';
        pushTimelineEvent('proposal_accepted', '对方接受提案 ' + proposal.id, proposal.terms);
        showToast('success', '对方已接受', '可点击“确认条款达成”完成锁定');
      } else if (action === 'reject') {
        proposal.status = 'rejected';
        pushTimelineEvent('proposal_rejected', '对方拒绝提案 ' + proposal.id, proposal.terms);
        showToast('info', '对方已拒绝', '可调整参数后重新提交');
      } else if (action === 'counter') {
        proposal.status = 'countered';
        proposal.counterTerms = {
          amountWan: Number((proposal.terms.amountWan * 0.95).toFixed(1)),
          sharePct: Number((proposal.terms.sharePct + 0.6).toFixed(2)),
          aprPct: Number(Math.max(0, proposal.terms.aprPct - 0.5).toFixed(2)),
          termMonths: Number(Math.max(1, proposal.terms.termMonths + 2))
        };
        pushTimelineEvent('proposal_countered', '对方对提案 ' + proposal.id + ' 发起反提案', proposal.counterTerms);
        showToast('info', '收到反提案', '可一键采纳到条款工作台继续谈判');
      }
      saveNegotiationState();
      renderNegotiationTab();
    }

    function withdrawNegotiationProposal(proposalId) {
      if (!currentDeal) return;
      const proposal = findProposalById(proposalId);
      if (!proposal || proposal.status !== 'pending') {
        showToast('warning', '无法撤回', '仅“待响应”提案可撤回');
        return;
      }
      proposal.status = 'withdrawn';
      saveNegotiationState();
      pushTimelineEvent('proposal_withdrawn', '撤回提案 ' + proposal.id, proposal.terms);
      renderNegotiationTab();
      showToast('info', '提案已撤回', proposal.id);
    }

    function applyCounterProposal(proposalId) {
      if (!currentDeal) return;
      const proposal = findProposalById(proposalId);
      if (!proposal || !proposal.counterTerms) {
        showToast('warning', '无可用反提案', '请先等待对方反提案');
        return;
      }
      applyPublicTermsToWorkbench(proposal.counterTerms);
      pushTimelineEvent('counter_loaded', '已将反提案 ' + proposal.id + ' 加载到工作台', proposal.counterTerms);
      renderNegotiationTab();
      showToast('success', '反提案已加载', '请确认后再次提交方案');
    }

    function confirmNegotiationTerms(proposalId) {
      if (!currentDeal) return;
      const proposal = findProposalById(proposalId);
      if (!proposal || proposal.status !== 'accepted') {
        showToast('warning', '无法确认', '仅已接受提案可确认达成');
        return;
      }
      proposal.status = 'agreed';
      currentDeal.status = 'confirmed';
      const original = allDeals.find(d => d.id === currentDeal.id);
      if (original) original.status = 'confirmed';
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
      contractPayloadByDeal[currentDeal.id] = {
        dealId: currentDeal.id,
        projectName: currentDeal.name,
        sourceProposalId: proposal.id,
        confirmedAt: new Date().toISOString(),
        publicTerms: {
          amountWan: Number(proposal.terms.amountWan),
          sharePct: Number(proposal.terms.sharePct),
          aprPct: Number(proposal.terms.aprPct),
          termMonths: Number(proposal.terms.termMonths)
        }
      };
      saveContractPayloadState();
      saveNegotiationState();
      pushTimelineEvent('terms_confirmed', '提案 ' + proposal.id + ' 已达成并锁定公共条款', proposal.terms);
      renderNegotiationTab();
      showToast('success', '条款已达成', '项目状态已更新为已确认，且已生成合约通公共参数输出');
    }

    function submitNegotiationMemo(status) {
      if (!currentDeal) return;
      const state = ensureNegotiationState();
      const input = document.getElementById('negMemoInput');
      const text = (input?.value || '').trim();
      if (!text) {
        showToast('warning', '纪要为空', '请先填写纪要内容');
        return;
      }
      state.memos.unshift({
        id: 'M_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        at: new Date().toISOString(),
        content: text,
        status
      });
      if (input) input.value = '';
      saveNegotiationState();
      pushTimelineEvent('memo_uploaded', '上传谈判纪要（' + (status === 'confirmed' ? '已确认' : '待确认') + '）', getPublicTermsFromWorkbench());
      renderNegotiationTab();
      showToast('success', '纪要已记录', status === 'confirmed' ? '纪要已确认并同步公共条款' : '等待双方确认纪要');
    }

    function generateNegotiationInvite() {
      if (!currentDeal) return;
      const state = ensureNegotiationState();
      const role = document.getElementById('negInviteRole')?.value || 'negotiator';
      const token = Math.random().toString(36).slice(2, 10);
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
      state.invite = {
        role,
        link: 'https://deal-connect.local/invite/' + token,
        expiresAt
      };
      saveNegotiationState();
      pushTimelineEvent('invite_created', '创建协作邀请（' + (role === 'negotiator' ? '谈判者' : '观察者') + '）', getPublicTermsFromWorkbench());
      renderNegotiationTab();
      showToast('success', '邀请链接已生成', '有效期至 ' + expiresAt.slice(0, 10));
    }

    function getTimelineTypeMeta(type) {
      const map = {
        intent_submitted: { label: '提交意向', category: 'intent' },
        intent_accepted: { label: '意向接受', category: 'intent' },
        intent_rejected: { label: '意向拒绝', category: 'intent' },
        draft_saved: { label: '保存草稿', category: 'proposal' },
        proposal_submitted: { label: '提交提案', category: 'proposal' },
        proposal_accepted: { label: '提案接受', category: 'proposal' },
        proposal_rejected: { label: '提案拒绝', category: 'proposal' },
        proposal_countered: { label: '反提案', category: 'proposal' },
        proposal_withdrawn: { label: '撤回提案', category: 'proposal' },
        counter_loaded: { label: '加载反提案', category: 'proposal' },
        timeline_reloaded: { label: '回填历史版本', category: 'proposal' },
        terms_confirmed: { label: '条款达成', category: 'proposal' },
        memo_uploaded: { label: '上传纪要', category: 'memo' },
        invite_created: { label: '创建邀请', category: 'invite' }
      };
      return map[type] || { label: type || '未知事件', category: 'all' };
    }

    function getTimelineEventsForCurrentDeal() {
      if (!currentDeal) return [];
      return timelineByDeal[currentDeal.id] || [];
    }

    function renderTimelineTab() {
      if (!currentDeal) return;
      const allEvents = getTimelineEventsForCurrentDeal();
      const filterVal = document.getElementById('timelineFilterType')?.value || 'all';
      const filteredEvents = allEvents.filter((e) => {
        if (filterVal === 'all') return true;
        return getTimelineTypeMeta(e.type).category === filterVal;
      });

      const proposalCount = allEvents.filter((e) => getTimelineTypeMeta(e.type).category === 'proposal').length;
      const memoCount = allEvents.filter((e) => getTimelineTypeMeta(e.type).category === 'memo').length;
      setText('timelineCountAll', String(allEvents.length));
      setText('timelineCountProposal', String(proposalCount));
      setText('timelineCountMemo', String(memoCount));
      setText('timelineLastAt', allEvents[0]?.at ? allEvents[0].at.slice(0, 16).replace('T', ' ') : '--');

      const list = document.getElementById('timelineList');
      if (!list) return;
      if (!filteredEvents.length) {
        list.textContent = '暂无符合筛选条件的时间线事件。';
        return;
      }

      list.innerHTML = filteredEvents.map((e) => {
        const meta = getTimelineTypeMeta(e.type);
        const terms = e.publicTerms ? formatTermsInline(e.publicTerms) : '无公共参数';
        const actor = (e.actor || '我方') + '（' + (e.role || 'investor') + '）';
        const at = e.at ? e.at.slice(0, 19).replace('T', ' ') : '--';
        return '<div class="p-3 rounded-xl border border-gray-100 bg-gray-50">' +
          '<div class="flex items-center justify-between mb-1">' +
            '<div class="flex items-center gap-2"><span class="text-[11px] px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-600">' + meta.label + '</span><span class="text-xs text-gray-500">' + at + '</span></div>' +
            (e.publicTerms ? '<button onclick="loadTimelineTermsToWorkbench(&apos;' + e.id + '&apos;)" class="px-2 py-1 text-[11px] rounded border border-gray-200 text-gray-700 hover:bg-white">基于此版修改</button>' : '') +
          '</div>' +
          '<p class="text-xs text-gray-700 mb-1">操作人：' + actor + '</p>' +
          '<p class="text-xs text-gray-700 mb-1">摘要：' + (e.summary || '无') + '</p>' +
          '<p class="text-xs text-gray-500">公共参数：' + terms + '</p>' +
        '</div>';
      }).join('');
    }

    function loadTimelineTermsToWorkbench(eventId) {
      if (!currentDeal) return;
      const events = getTimelineEventsForCurrentDeal();
      const event = events.find((e) => e.id === eventId);
      if (!event || !event.publicTerms) {
        showToast('warning', '无法加载版本', '该事件无公共参数快照');
        return;
      }
      applyPublicTermsToWorkbench(event.publicTerms);
      pushTimelineEvent('timeline_reloaded', '基于时间线事件 ' + eventId + ' 回填条款参数', event.publicTerms);
      showToast('success', '已回填到工作台', '你可以在条款工作台继续修改并提交');
      switchSessionTab('workbench');
    }

    function ensureWorkbenchState() {
      if (!currentDeal) return null;
      const dealId = currentDeal.id;
      if (workbenchByDeal[dealId]) return workbenchByDeal[dealId];
      const savedResearch = researchInputsByDeal[dealId];
      const defaultRevenue = savedResearch?.predictedMonthlyRevenue || parseWanValue(currentDeal.monthlyRevenue) || 100;
      workbenchByDeal[dealId] = {
        publicAmountWan: Number((currentDeal.amount / 10000).toFixed(1)),
        publicSharePct: parseFloat(String(currentDeal.revenueShare || '').replace('%', '')) || 10,
        publicAprPct: 14,
        publicTermMonths: parseInt(currentDeal.period, 10) || 24,
        privateRevenueWan: Number(defaultRevenue.toFixed(1)),
        privateSource: savedResearch?.predictedMonthlyRevenue ? 'research' : 'system'
      };
      saveWorkbenchState();
      return workbenchByDeal[dealId];
    }

    function formatWan(v) {
      return Number.isFinite(v) ? v.toFixed(1) + ' 万' : '--';
    }

    function formatPct(v) {
      return Number.isFinite(v) ? v.toFixed(2) + '%' : '--';
    }

    function formatMonths(v) {
      return Number.isFinite(v) ? v.toFixed(1) + ' 个月' : '--';
    }

    function setText(id, text) {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    }

    function computeWorkbenchDerived(state) {
      const amountWan = state.publicAmountWan;
      const sharePct = state.publicSharePct;
      const aprPct = state.publicAprPct;
      const termMonths = state.publicTermMonths;
      const revenueWan = state.privateRevenueWan;

      const shareRatio = sharePct / 100;
      const aprRatio = aprPct / 100;
      const monthlyPaybackWan = revenueWan * shareRatio;

      const suggestAmountDen = 1 + (aprRatio * termMonths / 12);
      const suggestedAmountWan = (monthlyPaybackWan > 0 && termMonths > 0 && suggestAmountDen > 0)
        ? (monthlyPaybackWan * termMonths / suggestAmountDen)
        : NaN;

      const suggestedSharePct = (amountWan > 0 && revenueWan > 0 && termMonths > 0)
        ? (amountWan * (1 + aprRatio * termMonths / 12) / (revenueWan * termMonths) * 100)
        : NaN;

      const touchDen = monthlyPaybackWan - amountWan * aprRatio / 12;
      const touchMonths = (amountWan > 0 && touchDen > 0) ? (amountWan / touchDen) : NaN;

      const validMonths = Number.isFinite(touchMonths) && touchMonths > 0 ? touchMonths : termMonths;
      const totalPaybackWan = Number.isFinite(validMonths) && validMonths > 0 ? monthlyPaybackWan * validMonths : NaN;
      const actualAprPct = (amountWan > 0 && Number.isFinite(totalPaybackWan) && validMonths > 0)
        ? (((totalPaybackWan / amountWan) - 1) * 12 / validMonths * 100)
        : NaN;
      const recoveryMultiple = (amountWan > 0 && Number.isFinite(totalPaybackWan))
        ? (totalPaybackWan / amountWan)
        : NaN;

      return {
        monthlyPaybackWan,
        suggestedAmountWan,
        suggestedSharePct,
        touchMonths,
        totalPaybackWan,
        actualAprPct,
        recoveryMultiple,
        touchDen
      };
    }

    function recalcWorkbench() {
      const state = ensureWorkbenchState();
      if (!state || !currentDeal) return;
      const derived = computeWorkbenchDerived(state);
      workbenchDerivedByDeal[currentDeal.id] = derived;

      setText('wbMonthlyPayback', formatWan(derived.monthlyPaybackWan));
      setText('wbSuggestAmount', formatWan(derived.suggestedAmountWan));
      setText('wbSuggestShare', formatPct(derived.suggestedSharePct));
      setText('wbTouchMonths', formatMonths(derived.touchMonths));
      setText('wbTotalPayback', formatWan(derived.totalPaybackWan));
      setText('wbActualApr', formatPct(derived.actualAprPct));
      setText('wbRecoveryMultiple', Number.isFinite(derived.recoveryMultiple) ? derived.recoveryMultiple.toFixed(2) + 'x' : '--');

      if (derived.touchDen <= 0) {
        setText('wbFormulaHint', '公式状态：当前参数下无法触达回本（分母<=0），建议提高分成比例或降低融资金额。');
      } else {
        setText('wbFormulaHint', '公式状态：已基于当前公共条款与私有预测完成倒推/正推计算。');
      }
    }

    function renderWorkbench() {
      if (!currentDeal) return;
      const state = ensureWorkbenchState();
      if (!state) return;
      const amount = document.getElementById('wbAmount');
      const share = document.getElementById('wbShare');
      const apr = document.getElementById('wbApr');
      const term = document.getElementById('wbTerm');
      const revenue = document.getElementById('wbRevenue');
      const source = document.getElementById('wbRevenueSource');
      if (amount) amount.value = String(state.publicAmountWan);
      if (share) share.value = String(state.publicSharePct);
      if (apr) apr.value = String(state.publicAprPct);
      if (term) term.value = String(state.publicTermMonths);
      if (revenue) revenue.value = String(state.privateRevenueWan);
      if (source) source.value = state.privateSource;
      recalcWorkbench();
    }

    function updateWorkbenchAndRecalc() {
      const state = ensureWorkbenchState();
      if (!state) return;
      state.publicAmountWan = parseWanValue(document.getElementById('wbAmount')?.value || state.publicAmountWan);
      const share = parseFloat(document.getElementById('wbShare')?.value || String(state.publicSharePct));
      const apr = parseFloat(document.getElementById('wbApr')?.value || String(state.publicAprPct));
      const term = parseInt(document.getElementById('wbTerm')?.value || String(state.publicTermMonths), 10);
      state.publicSharePct = Number.isFinite(share) ? share : state.publicSharePct;
      state.publicAprPct = Number.isFinite(apr) ? apr : state.publicAprPct;
      state.publicTermMonths = Number.isFinite(term) ? term : state.publicTermMonths;
      state.privateRevenueWan = parseWanValue(document.getElementById('wbRevenue')?.value || state.privateRevenueWan);
      const sourceVal = document.getElementById('wbRevenueSource')?.value || state.privateSource;
      state.privateSource = sourceVal;
      saveWorkbenchState();
      recalcWorkbench();
    }

    function applySuggestedAmount() {
      if (!currentDeal) return;
      updateWorkbenchAndRecalc();
      const derived = workbenchDerivedByDeal[currentDeal.id];
      if (!derived || !Number.isFinite(derived.suggestedAmountWan) || derived.suggestedAmountWan <= 0) {
        showToast('warning', '无法倒推金额', '请先检查营业额、比例、APR、期限参数。');
        return;
      }
      const amount = document.getElementById('wbAmount');
      if (amount) amount.value = derived.suggestedAmountWan.toFixed(1);
      updateWorkbenchAndRecalc();
      showToast('success', '已应用倒推金额', '公共融资金额已更新为建议值。');
    }

    function applySuggestedShare() {
      if (!currentDeal) return;
      updateWorkbenchAndRecalc();
      const derived = workbenchDerivedByDeal[currentDeal.id];
      if (!derived || !Number.isFinite(derived.suggestedSharePct) || derived.suggestedSharePct <= 0) {
        showToast('warning', '无法倒推比例', '请先检查金额、营业额、APR、期限参数。');
        return;
      }
      const share = document.getElementById('wbShare');
      if (share) share.value = derived.suggestedSharePct.toFixed(2);
      updateWorkbenchAndRecalc();
      showToast('success', '已应用倒推比例', '公共分成比例已更新为建议值。');
    }

    function applyForwardTouchMonths() {
      if (!currentDeal) return;
      updateWorkbenchAndRecalc();
      const derived = workbenchDerivedByDeal[currentDeal.id];
      if (!derived || !Number.isFinite(derived.touchMonths) || derived.touchMonths <= 0) {
        showToast('warning', '无法正推触达月数', '当前参数下分母<=0，请调整金额或比例。');
        return;
      }
      const term = document.getElementById('wbTerm');
      if (term) term.value = Math.max(1, Math.round(derived.touchMonths)).toString();
      updateWorkbenchAndRecalc();
      showToast('success', '已应用正推触达月数', '公共合作期限已同步为触达月数。');
    }

    function useResearchForecast() {
      if (!currentDeal) return;
      const saved = researchInputsByDeal[currentDeal.id];
      if (!saved || !saved.predictedMonthlyRevenue) {
        showToast('warning', '无可用预估', '请先在做功课中完成营业额预估。');
        return;
      }
      const revenue = document.getElementById('wbRevenue');
      const source = document.getElementById('wbRevenueSource');
      if (revenue) revenue.value = saved.predictedMonthlyRevenue.toFixed(1);
      if (source) source.value = 'research';
      updateWorkbenchAndRecalc();
      showToast('success', '已带入做功课预估', '私有预测月营收已更新。');
    }

    function submitWorkbenchProposal() {
      if (!currentDeal) return;
      updateWorkbenchAndRecalc();
      const state = ensureWorkbenchState();
      const drafts = JSON.parse(localStorage.getItem('ec_workbenchDrafts') || '{}');
      drafts[currentDeal.id] = {
        savedAt: new Date().toISOString(),
        publicAmountWan: state.publicAmountWan,
        publicSharePct: state.publicSharePct,
        publicAprPct: state.publicAprPct,
        publicTermMonths: state.publicTermMonths
      };
      localStorage.setItem('ec_workbenchDrafts', JSON.stringify(drafts));
      showToast('success', '方案草稿已保存', '公共参数已记录，可在谈判Tab继续提交。');
    }

    function refreshWorkbenchPrefill() {
      const hint = document.getElementById('workbenchPrefillHint');
      if (!hint) return;
      const saved = currentDeal ? researchInputsByDeal[currentDeal.id] : null;
      if (!currentDeal || !saved || !saved.predictedMonthlyRevenue) {
        hint.textContent = '暂无从做功课带入的营业额预估值。';
        return;
      }
      hint.textContent = '已带入「' + currentDeal.name + '」营业额预估：' + saved.predictedMonthlyRevenue.toFixed(1) + '万/月。下一步将用于条款工作台派生指标计算。';
    }

    // ==================== Auth ====================
    function switchAuthTab(tab) {
      const tl = document.getElementById('tabLogin'), tr = document.getElementById('tabRegister');
      const fl = document.getElementById('formLogin'), fr = document.getElementById('formRegister');
      if (tab === 'login') {
        tl.style.color = '#2EC4B6'; tl.style.borderBottom = '2px solid #2EC4B6';
        tr.style.color = '#86868b'; tr.style.borderBottom = 'none';
        fl.classList.remove('hidden'); fr.classList.add('hidden');
      } else {
        tr.style.color = '#2EC4B6'; tr.style.borderBottom = '2px solid #2EC4B6';
        tl.style.color = '#86868b'; tl.style.borderBottom = 'none';
        fr.classList.remove('hidden'); fl.classList.add('hidden');
      }
    }

    async function handleLogin() {
      const username = document.getElementById('loginUsername').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!username || !password) { showToast('warning', '请填写完整', '用户名和密码不能为空'); return; }
      try {
        const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await res.json();
        if (data.success) { currentUser = data.user; onLoginSuccess(); }
        else { showToast('error', '登录失败', data.message); }
      } catch (e) { showToast('error', '网络错误', '请检查网络连接'); }
    }

    async function handleRegister() {
      const username = document.getElementById('regUsername').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const password = document.getElementById('regPassword').value;
      const displayName = document.getElementById('regDisplayName').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      if (!username || !email || !password) { showToast('warning', '请填写必填项'); return; }
      if (password.length < 6) { showToast('warning', '密码过短', '密码至少6位'); return; }
      try {
        const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password, displayName, phone, role: 'investor' }) });
        const data = await res.json();
        if (data.success) { showToast('success', '注册成功', '欢迎加入参与通！'); switchAuthTab('login'); document.getElementById('loginUsername').value = username; }
        else { showToast('error', '注册失败', data.message); }
      } catch (e) { showToast('error', '网络错误'); }
    }

    function handleGuestLogin() {
      currentUser = { id: 'guest', username: 'guest', displayName: '游客', email: 'guest@demo.com', role: 'investor' };
      loadDemoData();
      onLoginSuccess();
      showToast('info', '游客模式', '已加载 ' + allDeals.length + ' 个发起通项目');
    }

    function onLoginSuccess() {
      const name = currentUser?.displayName || currentUser?.username || '用户';
      const initial = name.charAt(0).toUpperCase();
      document.getElementById('navAvatar').textContent = initial;
      document.getElementById('navName').textContent = name;
      document.getElementById('ddAvatar').textContent = initial;
      document.getElementById('ddName').textContent = name;
      document.getElementById('ddRole').textContent = '投资者';
      document.getElementById('welcomeText').textContent = '欢迎回来，' + name;
      switchPage('pageDashboard');
      initMySieves();
      renderSieveSelector();
      setDashboardViewMode(dashboardViewMode);
      selectSieve('all');
      showToast('success', '登录成功', '欢迎回来，' + name);
      if (!localStorage.getItem('ec_onboarded')) { setTimeout(showOnboarding, 800); }
    }

    function handleLogout() { currentUser = null; switchPage('pageAuth'); showToast('info', '已退出', '您已安全退出账号'); }

    // ==================== User Dropdown ====================
    function toggleUserDD(e) { e.stopPropagation(); document.getElementById('userDropdown').classList.toggle('show'); }
    function closeUserDD() { document.getElementById('userDropdown').classList.remove('show'); }
    document.addEventListener('click', (e) => { if (!e.target.closest('#navUserBtn') && !e.target.closest('#userDropdown')) closeUserDD(); });

    // ==================== Demo Data (模拟发起通数据) ====================
    function loadDemoData() {
      const industries = ['餐饮','零售','演艺','教育','健康','科技','餐饮','零售','科技','餐饮','教育','健康'];
      const storeNames = [
        '星巴克杭州新店','瑞幸深圳旗舰店','周杰伦2026巡演','新东方AI学堂',
        '美年健康体检中心','字节跳动AI Lab','海底捞成都总店','泡泡玛特北京旗舰',
        '喜茶上海概念店','太二酸菜鱼广州店','猿辅导天津中心','和睦家北京诊所'
      ];
      const brandNames = ['星巴克','瑞幸','杰威尔文化','新东方','美年健康','字节跳动','海底捞','泡泡玛特','喜茶','太二','猿辅导','和睦家'];
      const companyNames = ['杭州星巴克运营有限公司','深圳瑞幸品牌管理有限公司','杰威尔演艺经纪有限公司','新东方教育科技集团','美年大健康产业集团','字节跳动科技有限公司','海底捞餐饮管理集团','泡泡玛特文化创意有限公司','喜茶餐饮管理有限公司','太二餐饮管理有限公司','猿辅导在线教育科技','和睦家医疗投资管理'];
      const locations = ['杭州','深圳','全国','北京','上海','北京','成都','北京','上海','广州','天津','北京'];
      const originators = ['杭州星巴克运营方','深圳瑞幸加盟商','演艺经纪公司','新东方教育集团','美年大健康集团','字节跳动投融部','海底捞运营总部','泡泡玛特品牌方','喜茶(深圳)公司','太二餐饮管理','猿辅导科技','和睦家医疗'];
      const disclosureStates = ['disclosed', 'undisclosed', 'none'];

      allDeals = storeNames.map((storeName, i) => ({
        id: 'D_' + (1000 + i),
        name: storeName,
        companyName: companyNames[i],
        brandName: brandNames[i],
        storeName,
        industry: industries[i],
        amount: (200 + Math.floor(Math.random() * 800)) * 10000,
        aiScore: (7.0 + Math.random() * 3.0).toFixed(1),
        status: 'open',
        skipped: false,
        revenueShare: (6 + Math.floor(Math.random() * 16)) + '%',
        period: (18 + Math.floor(Math.random() * 42)) + '个月',
        location: locations[i],
        originator: originators[i],
        kybVerified: i % 4 !== 1,
        historyDisclosure: disclosureStates[i % 3],
        originateDate: new Date(Date.now() - Math.random() * 30 * 86400000).toISOString().slice(0, 10),
        description: '由「' + originators[i] + '」通过发起通提交的' + industries[i] + '行业投资机会。已通过平台基础审核。',
        riskGrade: ['A+','A','A','A-','B+','A+','A-','B+','A','B+','A-','A'][i],
        monthlyRevenue: (50 + Math.floor(Math.random() * 200)) + '万',
        employeeCount: (20 + Math.floor(Math.random() * 80)),
        operatingYears: (1 + Math.floor(Math.random() * 8)).toFixed(1)
      }));
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
    }

    // ==================== 动态渲染筛子选择器 ====================
    function renderSieveSelector() {
      const container = document.getElementById('sieveSelector');
      if (!container) return;
      const models = getActiveSieveModels();
      let html = '<button onclick="selectSieve(&apos;all&apos;)" class="sieve-chip' + (currentSieve === 'all' ? ' active' : '') + '" data-sieve="all"><i class="fas fa-globe text-gray-400"></i>全部机会</button>';
      mySieves.forEach(key => {
        const s = SIEVE_LIBRARY[key];
        if (!s) return;
        html += '<button onclick="selectSieve(&apos;' + key + '&apos;)" class="sieve-chip' + (currentSieve === key ? ' active' : '') + '" data-sieve="' + key + '"><i class="fas ' + s.icon + '" style="color:' + s.color + ';"></i>' + s.name + '</button>';
      });
      container.innerHTML = html;
    }

    // ==================== 筛子管理弹窗 ====================
    function showSieveManager() {
      // 移除旧弹窗
      const old = document.getElementById('sieveManagerModal'); if (old) old.remove();

      const libraryKeys = Object.keys(SIEVE_LIBRARY);
      const availableKeys = libraryKeys.filter(k => !mySieves.includes(k));

      const modal = document.createElement('div');
      modal.id = 'sieveManagerModal';
      modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300]';
      modal.style.animation = 'fadeIn 0.2s ease';
      modal.onclick = (e) => { if (e.target === modal) closeSieveManager(); };

      modal.innerHTML = '<div style="animation: scaleIn 0.25s cubic-bezier(0.28,0.11,0.32,1);" class="bg-white rounded-3xl max-w-3xl w-full mx-4 overflow-hidden" style="box-shadow: 0 24px 80px rgba(0,0,0,0.2);">' +
        // Header
        '<div class="p-5 border-b border-gray-100" style="background: linear-gradient(135deg, rgba(6,182,212,0.06), rgba(14,165,233,0.04));">' +
          '<div class="flex items-center justify-between">' +
            '<div class="flex items-center gap-3"><div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: linear-gradient(135deg, #06b6d4, #0ea5e9); box-shadow: 0 4px 12px rgba(6,182,212,0.3);"><i class="fas fa-cogs text-white"></i></div><div><h2 class="text-lg font-bold text-gray-900">管理我的筛子</h2><p class="text-xs text-gray-400">从筛子库添加，或移除已有筛子</p></div></div>' +
            '<button onclick="closeSieveManager()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"><i class="fas fa-times"></i></button>' +
          '</div>' +
        '</div>' +
        // Body — 双栏
        '<div class="flex" style="min-height: 380px; max-height: 70vh;">' +
          // 左栏：筛子库
          '<div class="w-1/2 border-r border-gray-100 flex flex-col">' +
            '<div class="p-4 border-b border-gray-50 flex items-center justify-between"><h3 class="text-sm font-bold text-gray-700"><i class="fas fa-warehouse mr-1.5 text-cyan-500"></i>筛子库</h3><span class="text-xs text-gray-400">' + libraryKeys.length + ' 个可用</span></div>' +
            '<div class="flex-1 overflow-y-auto p-3 space-y-2" id="sieveLibraryList">' +
              renderLibraryItems(libraryKeys) +
            '</div>' +
          '</div>' +
          // 右栏：我的筛子
          '<div class="w-1/2 flex flex-col" style="background: #fafbfc;">' +
            '<div class="p-4 border-b border-gray-50 flex items-center justify-between"><h3 class="text-sm font-bold text-gray-700"><i class="fas fa-star mr-1.5 text-amber-500"></i>我的筛子</h3><span class="text-xs text-gray-400" id="mySieveCount">' + mySieves.length + ' 个已添加</span></div>' +
            '<div class="flex-1 overflow-y-auto p-3 space-y-2" id="mySieveList">' +
              renderMySieveItems() +
            '</div>' +
          '</div>' +
        '</div>' +
        // Footer
        '<div class="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">' +
          '<p class="text-xs text-gray-400"><i class="fas fa-info-circle mr-1"></i>「全部机会」为内置项，始终可用无需添加</p>' +
          '<button onclick="closeSieveManager()" class="px-5 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl text-sm font-medium hover:from-teal-700 hover:to-cyan-700 shadow-lg shadow-teal-200 transition-all"><i class="fas fa-check mr-1.5"></i>完成</button>' +
        '</div>' +
      '</div>';

      document.body.appendChild(modal);
    }

    function renderLibraryItems(keys) {
      if (!keys) keys = Object.keys(SIEVE_LIBRARY);
      return keys.map(key => {
        const s = SIEVE_LIBRARY[key];
        const isAdded = mySieves.includes(key);
        return '<div class="flex items-center gap-3 p-3 rounded-xl border transition-all ' + (isAdded ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-cyan-200 hover:shadow-sm') + '" id="lib_' + key + '">' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + s.color + '15;"><i class="fas ' + s.icon + '" style="color:' + s.color + '; font-size:14px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center gap-1.5"><p class="text-sm font-semibold text-gray-800 truncate">' + s.name + '</p><span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">' + (s.category || '') + '</span></div>' +
            '<p class="text-xs text-gray-400 truncate mt-0.5">' + s.desc + '</p>' +
          '</div>' +
          (isAdded
            ? '<span class="text-xs text-gray-400 flex-shrink-0 px-2 py-1"><i class="fas fa-check"></i> 已添加</span>'
            : '<button onclick="addSieve(&apos;' + key + '&apos;)" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-cyan-600 bg-cyan-50 hover:bg-cyan-100 rounded-lg transition-colors"><i class="fas fa-plus mr-1"></i>添加</button>') +
        '</div>';
      }).join('');
    }

    function renderMySieveItems() {
      if (mySieves.length === 0) {
        return '<div class="text-center py-8"><div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"><i class="fas fa-inbox text-gray-300 text-lg"></i></div><p class="text-sm text-gray-400">暂无筛子</p><p class="text-xs text-gray-300 mt-1">从左侧筛子库中添加</p></div>';
      }
      return mySieves.map((key, idx) => {
        const s = SIEVE_LIBRARY[key];
        if (!s) return '';
        return '<div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-red-200 group transition-all" id="my_' + key + '">' +
          '<div class="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-100 flex-shrink-0">' + (idx + 1) + '</div>' +
          '<div class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + s.color + '15;"><i class="fas ' + s.icon + '" style="color:' + s.color + '; font-size:14px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<p class="text-sm font-semibold text-gray-800 truncate">' + s.name + '</p>' +
            '<p class="text-xs text-gray-400 truncate">' + (s.category || '') + '</p>' +
          '</div>' +
          '<button onclick="removeSieve(&apos;' + key + '&apos;)" class="flex-shrink-0 px-3 py-1.5 text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><i class="fas fa-trash-alt mr-1"></i>移除</button>' +
        '</div>';
      }).join('');
    }

    function addSieve(key) {
      if (mySieves.includes(key)) return;
      mySieves.push(key);
      saveMySieves();
      refreshSieveManager();
      renderSieveSelector();
      showToast('success', '已添加', SIEVE_LIBRARY[key].name + ' 已添加到您的筛子面板');
    }

    function removeSieve(key) {
      mySieves = mySieves.filter(k => k !== key);
      saveMySieves();
      // 如果移除的是当前选中的筛子，回到全部
      if (currentSieve === key) {
        currentSieve = 'all';
        selectSieve('all');
      }
      refreshSieveManager();
      renderSieveSelector();
      showToast('info', '已移除', SIEVE_LIBRARY[key].name + ' 已从您的面板移除');
    }

    function refreshSieveManager() {
      const libList = document.getElementById('sieveLibraryList');
      const myList = document.getElementById('mySieveList');
      const myCount = document.getElementById('mySieveCount');
      if (libList) libList.innerHTML = renderLibraryItems();
      if (myList) myList.innerHTML = renderMySieveItems();
      if (myCount) myCount.textContent = mySieves.length + ' 个已添加';
    }

    function closeSieveManager() {
      const modal = document.getElementById('sieveManagerModal');
      if (modal) { modal.style.opacity = '0'; setTimeout(() => modal.remove(), 200); }
    }

    // ==================== 筛子选择 ====================
    function selectSieve(sieveKey) {
      currentSieve = sieveKey;
      // 更新UI
      document.querySelectorAll('#sieveSelector .sieve-chip').forEach(el => {
        el.classList.toggle('active', el.dataset.sieve === sieveKey);
      });
      // 获取当前可用筛子模型
      const models = getActiveSieveModels();
      const sieve = models[sieveKey];
      if (sieve) {
        dealsList = sieve.filter(allDeals);
        // 更新筛子说明
        const descEl = document.getElementById('sieveDescription');
        const descText = document.getElementById('sieveDescText');
        if (sieveKey === 'all') {
          descEl.classList.add('hidden');
        } else {
          descEl.classList.remove('hidden');
          descText.textContent = sieve.desc;
        }
        // 更新标签
        const label = document.getElementById('filterLabel');
        if (sieveKey === 'all') {
          label.textContent = '· 展示全部 ' + allDeals.length + ' 个机会';
        } else {
          label.textContent = '· ' + sieve.name + ' — 通过 ' + dealsList.length + '/' + allDeals.length;
        }
      }
      renderDeals();
      if (sieveKey !== 'all' && dealsList.length > 0) {
        showToast('success', sieve.name, '筛选出 ' + dealsList.length + ' 个匹配机会');
      }
    }

    // ==================== Render Deals ====================
    function renderDeals() {
      const grid = document.getElementById('dealGrid');
      const empty = document.getElementById('emptyState');
      const searchVal = (document.getElementById('dealSearch')?.value || '').toLowerCase();
      const filterVal = document.getElementById('filterStatus')?.value || 'all';
      const industryVal = document.getElementById('filterIndustry')?.value || 'all';
      const sortVal = document.getElementById('sortBy')?.value || 'push_desc';

      let filtered = dealsList.filter(d => {
        if (industryVal !== 'all' && d.industry !== industryVal) return false;
        if (filterVal === 'skipped' && !d.skipped) return false;
        if (filterVal !== 'all' && filterVal !== 'skipped' && d.status !== filterVal) return false;
        if (searchVal) {
          // 仅 KYB 已认证项目可参与资产定向搜索
          if (!d.kybVerified) return false;
          const searchFields = [d.companyName, d.brandName, d.storeName, d.name, d.industry, d.location]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!searchFields.includes(searchVal)) return false;
        }
        return true;
      });
      filtered = filtered.sort((a, b) => {
        if (sortVal === 'score_desc') return parseFloat(b.aiScore) - parseFloat(a.aiScore);
        if (sortVal === 'amount_desc') return b.amount - a.amount;
        if (sortVal === 'amount_asc') return a.amount - b.amount;
        return (new Date(b.originateDate).getTime()) - (new Date(a.originateDate).getTime());
      });

      // Update stats
      document.getElementById('statTotal').textContent = allDeals.length;
      document.getElementById('statFiltered').textContent = dealsList.length;
      document.getElementById('statInterested').textContent = allDeals.filter(d => d.status === 'interested').length;
      document.getElementById('statConfirmed').textContent = allDeals.filter(d => d.status === 'confirmed').length;

      if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
      empty.classList.add('hidden');

      const statusMap = {
        open: { label: '待参与', cls: 'badge-warning', icon: 'fa-clock' },
        interested: { label: '已意向', cls: 'badge-primary', icon: 'fa-hand-point-up' },
        confirmed: { label: '已确认', cls: 'badge-success', icon: 'fa-check-double' },
        closed: { label: '已关闭', cls: 'badge-danger', icon: 'fa-lock' }
      };
      const disclosureMap = {
        disclosed: { label: '历史履约: 已披露', cls: 'bg-emerald-50 text-emerald-700' },
        undisclosed: { label: '历史履约: 未披露', cls: 'bg-amber-50 text-amber-700' },
        none: { label: '历史履约: 无历史数据', cls: 'bg-gray-100 text-gray-600' }
      };

      grid.innerHTML = filtered.map(d => {
        const st = statusMap[d.status] || statusMap.open;
        const disclosure = disclosureMap[d.historyDisclosure || 'none'] || disclosureMap.none;
        const hasMatch = d.matchScore !== null && d.matchScore !== undefined;
        const matchColor = hasMatch ? (d.matchScore >= 80 ? '#10b981' : d.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#6b7280';
        const title = dashboardViewMode === 'brand' ? (d.brandName || d.name) : (d.storeName || d.name);
        const subtitle = dashboardViewMode === 'brand'
          ? (d.companyName || d.originator || '融资主体') + ' · ' + d.industry + ' · ' + d.location
          : (d.brandName || '品牌') + ' · ' + d.industry + ' · ' + d.location;

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(\\'' + d.id + '\\')">' +
          // Header: name + status
          '<div class="flex items-center justify-between mb-2">' +
            '<div class="flex items-center space-x-2 min-w-0">' +
              '<div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style="background: linear-gradient(135deg, rgba(93,196,179,0.12), rgba(73,168,154,0.12));"><i class="fas fa-briefcase" style="color: #5DC4B3;"></i></div>' +
              '<div class="min-w-0"><h3 class="font-bold text-gray-900 text-sm group-hover:text-teal-600 transition-colors truncate">' + title + '</h3><p class="text-xs text-gray-500 truncate">' + subtitle + '</p></div>' +
            '</div>' +
            '<div class="flex items-center gap-1.5"><span class="badge ' + st.cls + ' flex-shrink-0"><i class="fas ' + st.icon + ' mr-1"></i>' + st.label + '</span>' +
            (d.skipped ? '<span class="badge badge-danger"><i class="fas fa-forward mr-1"></i>已跳过</span>' : '') + '</div>' +
          '</div>' +
          // 来源标签 + 披露标签 + 筛子标签
          '<div class="flex flex-wrap items-center gap-1.5 mb-2">' +
            '<span class="source-tag source-originate"><i class="fas fa-paper-plane" style="font-size:8px;"></i>发起通</span>' +
            '<span class="text-[10px] px-2 py-0.5 rounded ' + disclosure.cls + '">' + disclosure.label + '</span>' +
            '<span class="text-[10px] px-2 py-0.5 rounded ' + (d.kybVerified ? 'bg-cyan-50 text-cyan-700' : 'bg-rose-50 text-rose-700') + '">' + (d.kybVerified ? 'KYB已认证' : 'KYB未认证') + '</span>' +
            (hasMatch ? '<span class="sieve-tag sieve-pass"><i class="fas fa-check" style="font-size:8px;"></i>' + (d.sieveName || '筛子') + '</span>' : '') +
            (hasMatch ? '<span class="text-xs font-bold" style="color:' + matchColor + ';">' + d.matchScore + '%匹配</span>' : '') +
          '</div>' +
          // 匹配度条
          (hasMatch ? '<div class="match-bar mb-2"><div class="match-bar-fill" style="width:' + d.matchScore + '%; background: ' + matchColor + ';"></div></div>' : '') +
          // Metrics
          '<div class="flex items-center justify-between text-xs">' +
            '<div class="flex items-center space-x-3">' +
              '<span class="text-gray-500"><i class="fas fa-yen-sign mr-1 text-teal-500"></i>' + (d.amount/10000).toFixed(0) + '万</span>' +
              '<span class="text-gray-500"><i class="fas fa-percentage mr-1 text-amber-500"></i>' + d.revenueShare + '</span>' +
              '<span class="text-gray-500"><i class="fas fa-calendar mr-1 text-cyan-500"></i>' + d.period + '</span>' +
            '</div>' +
            '<div class="flex items-center"><i class="fas fa-star text-amber-400 mr-1"></i><span class="font-bold text-gray-700">' + d.aiScore + '</span></div>' +
          '</div>' +
          // Footer
          '<div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">' +
            '<span class="text-xs text-gray-400"><i class="fas fa-paper-plane mr-1 text-amber-300"></i>' + d.originateDate + '</span>' +
            '<div class="flex items-center gap-3">' +
              '<button onclick="event.stopPropagation(); toggleSkip(\\'' + d.id + '\\')" class="text-xs font-medium ' + (d.skipped ? 'text-rose-600' : 'text-gray-400 hover:text-rose-600') + ' transition-colors"><i class="fas fa-forward mr-1"></i>' + (d.skipped ? '取消跳过' : '标记跳过') + '</button>' +
              '<button onclick="event.stopPropagation(); toggleIntent(\\'' + d.id + '\\')" class="text-xs font-medium ' + (d.status === 'interested' || d.status === 'confirmed' ? 'text-teal-600' : 'text-gray-400 hover:text-teal-600') + ' transition-colors"><i class="fas fa-hand-point-up mr-1"></i>' + (d.status === 'interested' ? '已有意向' : d.status === 'confirmed' ? '已确认' : '表达意向') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    function filterByStatus(status) {
      const sel = document.getElementById('filterStatus');
      if (sel) { sel.value = status; renderDeals(); }
    }

    function toggleIntent(id) {
      const deal = allDeals.find(d => d.id === id);
      if (!deal) return;
      if (deal.status === 'open') { deal.status = 'interested'; showToast('success', '已表达意向', deal.name); }
      else if (deal.status === 'interested') { deal.status = 'open'; showToast('info', '已取消意向', deal.name); }
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
      // 重新应用筛子
      selectSieve(currentSieve);
    }

    function toggleSkip(id) {
      const deal = allDeals.find(d => d.id === id);
      if (!deal) return;
      deal.skipped = !deal.skipped;
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
      selectSieve(currentSieve);
      showToast(deal.skipped ? 'warning' : 'info', deal.skipped ? '已标记跳过' : '已取消跳过', deal.name);
    }

    function runRevenueForecast() {
      if (!currentDeal) return;
      const baseInput = document.getElementById('forecastBase');
      const rawBase = baseInput ? baseInput.value : '';
      const typedBase = parseWanValue(rawBase);
      const fallbackBase = parseWanValue(currentDeal.monthlyRevenue);
      const base = typedBase > 0 ? typedBase : fallbackBase;

      const growthRaw = parseFloat(document.getElementById('forecastGrowth')?.value || '0');
      const seasonalityRaw = parseFloat(document.getElementById('forecastSeasonality')?.value || '0');
      const growth = Number.isFinite(growthRaw) ? growthRaw : 0;
      const seasonality = Number.isFinite(seasonalityRaw) ? seasonalityRaw : 0;

      if (!base || base <= 0) {
        showToast('warning', '请输入营业额基准值', '建议输入最近3个月平均月营收（单位：万），例如 120.5');
        return;
      }
      if (baseInput && typedBase <= 0 && fallbackBase > 0) baseInput.value = String(fallbackBase);
      const predicted = Math.max(1, base * (1 + growth / 100) * (1 + seasonality / 100));
      const shareRatio = parseFloat(String(currentDeal.revenueShare || '').replace('%', '')) / 100 || 0.1;
      const monthlyPayback = predicted * shareRatio;
      const amountWan = currentDeal.amount / 10000;
      const paybackMonths = monthlyPayback > 0 ? (amountWan / monthlyPayback) : 0;

      researchInputsByDeal[currentDeal.id] = {
        base,
        growth,
        seasonality,
        predictedMonthlyRevenue: predicted,
        paybackMonths
      };
      saveResearchInputs();

      const resultEl = document.getElementById('forecastResult');
      if (resultEl) {
        resultEl.innerHTML =
          '<div class="p-3 rounded-xl bg-teal-50 border border-teal-100">' +
            '<p class="text-xs text-teal-700">预测月均营业额</p>' +
            '<p class="text-lg font-bold text-teal-700 mt-0.5">' + predicted.toFixed(1) + '万/月</p>' +
            '<p class="text-xs text-teal-600 mt-1">按当前分成比例估算，回本约 ' + paybackMonths.toFixed(1) + ' 个月</p>' +
          '</div>';
      }
      showToast('success', '预测完成', '已生成营业额预估，可带入条款工作台');
    }

    function applyForecastToWorkbench() {
      if (!currentDeal) return;
      const saved = researchInputsByDeal[currentDeal.id];
      if (!saved || !saved.predictedMonthlyRevenue) {
        showToast('warning', '尚未生成预测', '请先在营业额预估工作台点击“计算预估”');
        return;
      }
      currentDeal.forecastMonthlyRevenue = saved.predictedMonthlyRevenue.toFixed(1) + '万/月';
      const original = allDeals.find(d => d.id === currentDeal.id);
      if (original) original.forecastMonthlyRevenue = currentDeal.forecastMonthlyRevenue;
      const wb = ensureWorkbenchState();
      if (wb) {
        wb.privateRevenueWan = Number(saved.predictedMonthlyRevenue.toFixed(1));
        wb.privateSource = 'research';
        saveWorkbenchState();
      }
      localStorage.setItem('ec_allDeals', JSON.stringify(allDeals));
      switchSessionTab('workbench');
      showToast('success', '已带入条款工作台', '预测值：' + currentDeal.forecastMonthlyRevenue);
    }

    // ==================== Detail Page ====================
    function openDetail(id) {
      currentDeal = dealsList.find(d => d.id === id) || allDeals.find(d => d.id === id);
      if (!currentDeal) return;
      document.getElementById('detailTitle').textContent = currentDeal.name;
      const statusMap = { open: { label: '待参与', cls: 'badge-warning' }, interested: { label: '已意向', cls: 'badge-primary' }, confirmed: { label: '已确认', cls: 'badge-success' }, closed: { label: '已关闭', cls: 'badge-danger' } };
      const st = statusMap[currentDeal.status] || statusMap.open;
      document.getElementById('detailStatus').className = 'badge ' + st.cls;
      document.getElementById('detailStatus').textContent = st.label;
      document.getElementById('detailIndustry').textContent = currentDeal.industry;
      document.getElementById('detailDate').textContent = currentDeal.originateDate;

      // 更新参与按钮
      const btn = document.getElementById('btnExpressIntent');
      if (currentDeal.status === 'confirmed') {
        btn.innerHTML = '<i class="fas fa-check-double mr-1"></i>已确认参与';
        btn.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
      } else if (currentDeal.status === 'interested') {
        btn.innerHTML = '<i class="fas fa-file-signature mr-1"></i>查看意向';
        btn.style.background = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
      } else {
        btn.innerHTML = '<i class="fas fa-hand-point-up mr-1"></i>表达意向';
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      }

      // Left panel — 项目信息（来自发起通）
      document.getElementById('detailLeft').innerHTML =
        '<div class="mb-5">' +
          '<div class="p-3 bg-amber-50 rounded-xl border border-amber-100 mb-4 flex items-center gap-2"><i class="fas fa-paper-plane text-amber-500"></i><div><p class="text-xs font-bold text-amber-700">来自发起通</p><p class="text-xs text-amber-600">发起方：' + (currentDeal.originator || '未知') + '</p></div></div>' +
          '<div class="flex items-center space-x-3 mb-4"><div class="w-14 h-14 rounded-2xl flex items-center justify-center" style="background: linear-gradient(135deg, rgba(93,196,179,0.15), rgba(73,168,154,0.15));"><i class="fas fa-briefcase text-2xl" style="color: #5DC4B3;"></i></div><div><h2 class="text-lg font-bold text-gray-900">' + currentDeal.name + '</h2><p class="text-sm text-gray-500">' + currentDeal.industry + ' · ' + currentDeal.location + '</p></div></div>' +
          '<p class="text-sm text-gray-600 leading-relaxed mb-4">' + currentDeal.description + '</p>' +
        '</div>' +
        '<div class="grid grid-cols-2 gap-3 mb-5">' +
          '<div class="p-3 bg-teal-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">投资金额</p><p class="text-lg font-bold text-teal-600">¥' + (currentDeal.amount/10000).toFixed(0) + '万</p></div>' +
          '<div class="p-3 bg-amber-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">分成比例</p><p class="text-lg font-bold text-amber-600">' + currentDeal.revenueShare + '</p></div>' +
          '<div class="p-3 bg-cyan-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">分成期限</p><p class="text-lg font-bold text-cyan-600">' + currentDeal.period + '</p></div>' +
          '<div class="p-3 bg-emerald-50 rounded-xl"><p class="text-xs text-gray-500 mb-1">AI评分</p><p class="text-lg font-bold text-emerald-600">' + currentDeal.aiScore + '<span class="text-xs text-gray-400">/10</span></p></div>' +
        '</div>' +
        '<div class="space-y-3"><h3 class="text-sm font-semibold text-gray-700 mb-2"><i class="fas fa-store mr-1.5 text-amber-500"></i>经营数据（发起通提供）</h3>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">月均营收</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.monthlyRevenue || '暂无') + '</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">员工人数</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.employeeCount || '暂无') + '人</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">运营年限</span><span class="text-xs font-bold text-gray-800">' + (currentDeal.operatingYears || '暂无') + '年</span></div></div>' +
          '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><span class="text-xs font-medium text-gray-600">风控评级</span><span class="text-xs font-bold text-emerald-600">' + (currentDeal.riskGrade || 'N/A') + '</span></div></div>' +
        '</div>';

      // Right panel — 做功课内容
      const hasMatch = currentDeal.matchScore !== null && currentDeal.matchScore !== undefined;
      const matchColor = hasMatch ? (currentDeal.matchScore >= 80 ? '#10b981' : currentDeal.matchScore >= 60 ? '#f59e0b' : '#ef4444') : '#6b7280';
      const industryRef = INDUSTRY_COMPARABLES[currentDeal.industry] || INDUSTRY_COMPARABLES.default;
      const savedResearch = researchInputsByDeal[currentDeal.id] || {};
      const defaultBase = savedResearch.base || parseWanValue(currentDeal.monthlyRevenue) || 100;
      const defaultGrowth = Number.isFinite(savedResearch.growth) ? savedResearch.growth : 6;
      const defaultSeasonality = Number.isFinite(savedResearch.seasonality) ? savedResearch.seasonality : 0;
      const onePagerSummary = '项目「' + currentDeal.name + '」属于' + currentDeal.industry + '行业，当前AI评分' + currentDeal.aiScore + '，分成比例' + currentDeal.revenueShare + '，拟融资' + (currentDeal.amount/10000).toFixed(0) + '万。结合运营年限' + currentDeal.operatingYears + '年与风控评级' + (currentDeal.riskGrade || 'N/A') + '，建议重点核验现金流稳定性和季节波动。';
      const riskHint = parseFloat(currentDeal.aiScore) >= 8.5 ? '风险整体可控，建议重点关注扩张节奏与回款稳定性。' : '建议加强风控复核，重点校验营收波动与团队执行力。';
      const forecastPreview = savedResearch.predictedMonthlyRevenue
        ? '<div class="p-3 rounded-xl bg-teal-50 border border-teal-100"><p class="text-xs text-teal-700">上次预测</p><p class="text-base font-bold text-teal-700">' + savedResearch.predictedMonthlyRevenue.toFixed(1) + '万/月</p><p class="text-xs text-teal-600 mt-1">预估回本：' + ((savedResearch.paybackMonths || 0).toFixed(1)) + '个月</p></div>'
        : '<p class="text-xs text-gray-400">尚未计算，填写参数后点击“计算预估”。</p>';

      // 生成各筛子的评估结果（只评估用户面板中的筛子）
      let sieveResults = '';
      mySieves.forEach(key => {
        const sieve = SIEVE_LIBRARY[key];
        if (!sieve) return;
        const testResult = sieve.filter([currentDeal]);
        const passed = testResult.length > 0;
        const score = passed ? testResult[0].matchScore : Math.floor(Math.random() * 35 + 10);
        const barColor = passed ? '#10b981' : '#ef4444';
        sieveResults += '<div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">' +
          '<div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background: ' + (passed ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)') + ';"><i class="fas ' + sieve.icon + '" style="color:' + (passed ? '#10b981' : '#ef4444') + '; font-size:12px;"></i></div>' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex items-center justify-between mb-1"><span class="text-xs font-semibold text-gray-700">' + sieve.name + '</span><span class="sieve-tag ' + (passed ? 'sieve-pass' : 'sieve-fail') + '">' + (passed ? '<i class="fas fa-check" style="font-size:8px;"></i>通过' : '<i class="fas fa-times" style="font-size:8px;"></i>未通过') + '</span></div>' +
            '<div class="match-bar"><div class="match-bar-fill" style="width:' + score + '%; background:' + barColor + ';"></div></div>' +
            '<p class="text-xs text-gray-400 mt-1">' + score + '% 匹配度</p>' +
          '</div></div>';
      });
      if (mySieves.length === 0) {
        sieveResults = '<div class="text-center py-4"><p class="text-sm text-gray-400">暂未添加筛子</p><button onclick="goToDashboard(); setTimeout(showSieveManager, 300);" class="text-xs text-cyan-600 mt-1 hover:underline">去管理筛子</button></div>';
      }

      const comparableCases = industryRef.cases.map((item, idx) =>
        '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100">' +
          '<p class="text-xs text-gray-500 mb-1">案例 ' + (idx + 1) + '</p>' +
          '<p class="text-sm font-medium text-gray-700">' + item + '</p>' +
        '</div>'
      ).join('');

      document.getElementById('detailRight').innerHTML =
        '<div class="space-y-5">' +
          // 一页纸
          '<div id="sectionOnepager" class="bg-white rounded-2xl p-5 border border-gray-100">' +
            '<h3 class="text-sm font-bold text-gray-800 mb-3"><i class="fas fa-file-lines mr-1.5 text-cyan-500"></i>项目一页纸</h3>' +
            '<p class="text-sm text-gray-600 leading-relaxed mb-4">' + onePagerSummary + '</p>' +
            '<div class="grid grid-cols-2 gap-3 mb-4">' +
              '<div class="p-3 rounded-xl bg-cyan-50"><p class="text-xs text-gray-500">近12月月营收趋势</p><p class="text-sm font-bold text-cyan-700 mt-1">' + (currentDeal.monthlyRevenue || '暂无') + '</p></div>' +
              '<div class="p-3 rounded-xl bg-teal-50"><p class="text-xs text-gray-500">净利润率（估）</p><p class="text-sm font-bold text-teal-700 mt-1">' + (8 + Math.floor(parseFloat(currentDeal.aiScore) || 7)) + '%</p></div>' +
              '<div class="p-3 rounded-xl bg-amber-50"><p class="text-xs text-gray-500">主体信息</p><p class="text-sm font-bold text-amber-700 mt-1">' + (currentDeal.companyName || currentDeal.originator || '融资主体') + '</p></div>' +
              '<div class="p-3 rounded-xl bg-rose-50"><p class="text-xs text-gray-500">风险标注</p><p class="text-sm font-bold text-rose-700 mt-1">' + riskHint + '</p></div>' +
            '</div>' +
            (hasMatch ? '<div class="p-3 bg-gray-50 rounded-xl border border-gray-100"><div class="flex items-center justify-between"><p class="text-xs font-medium text-gray-600">当前筛子匹配度</p><p class="text-sm font-bold" style="color:' + matchColor + ';">' + currentDeal.matchScore + '%</p></div><div class="match-bar mt-2"><div class="match-bar-fill" style="width:' + currentDeal.matchScore + '%; background:' + matchColor + ';"></div></div></div>' : '') +
          '</div>' +
          // 同行业成交参考
          '<div id="sectionComparables" class="bg-white rounded-2xl p-5 border border-gray-100">' +
            '<h3 class="text-sm font-bold text-gray-800 mb-4"><i class="fas fa-scale-balanced mr-1.5 text-amber-500"></i>同行业成交参考</h3>' +
            '<div class="grid grid-cols-2 gap-3 mb-4">' +
              '<div class="p-3 rounded-xl bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">融资金额区间</p><p class="text-sm font-semibold text-gray-700 mt-1">' + industryRef.amountRange + '</p></div>' +
              '<div class="p-3 rounded-xl bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">分成比例区间</p><p class="text-sm font-semibold text-gray-700 mt-1">' + industryRef.shareRange + '</p></div>' +
              '<div class="p-3 rounded-xl bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">封顶APR区间</p><p class="text-sm font-semibold text-gray-700 mt-1">' + industryRef.aprRange + '</p></div>' +
              '<div class="p-3 rounded-xl bg-gray-50 border border-gray-100"><p class="text-xs text-gray-500">同行业门店月营收</p><p class="text-sm font-semibold text-gray-700 mt-1">' + industryRef.revenueRange + '</p></div>' +
            '</div>' +
            '<div class="space-y-2">' + comparableCases + '</div>' +
          '</div>' +
          // 营业额预估入口
          '<div id="sectionForecast" class="bg-white rounded-2xl p-5 border border-gray-100">' +
            '<h3 class="text-sm font-bold text-gray-800 mb-4"><i class="fas fa-chart-line mr-1.5 text-teal-500"></i>营业额预估工作台</h3>' +
            '<div class="grid grid-cols-3 gap-3 mb-4">' +
              '<div><label class="block text-xs text-gray-500 mb-1">月营收基准（万）</label><input id="forecastBase" type="text" inputmode="decimal" value="' + defaultBase + '" placeholder="例如 120.5" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>' +
              '<div><label class="block text-xs text-gray-500 mb-1">增长率（%）</label><input id="forecastGrowth" type="number" value="' + defaultGrowth + '" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>' +
              '<div><label class="block text-xs text-gray-500 mb-1">季节修正（%）</label><input id="forecastSeasonality" type="number" value="' + defaultSeasonality + '" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"></div>' +
            '</div>' +
            '<div id="forecastResult" class="mb-4">' + forecastPreview + '</div>' +
            '<div class="flex items-center gap-2">' +
              '<button onclick="runRevenueForecast()" class="px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700">计算预估</button>' +
              '<button onclick="applyForecastToWorkbench()" class="px-3 py-2 text-xs font-semibold rounded-lg bg-cyan-600 text-white hover:bg-cyan-700">带入条款工作台</button>' +
              '<button onclick="switchSessionTab(&apos;workbench&apos;)" class="px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">前往条款工作台</button>' +
            '</div>' +
          '</div>' +
          // 筛子评估结果（辅助）
          '<div class="bg-white rounded-2xl p-5 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-4"><i class="fas fa-filter mr-1.5 text-cyan-500"></i>筛子评估（辅助参考）</h3><div class="space-y-3">' + sieveResults + '</div>' +
          '<p class="text-xs text-gray-400 mt-3">说明：做功课阶段建议优先结合一页纸和同行参考，再用筛子结果做交叉验证。</p></div>' +
          // 项目流向
          '<div class="bg-white rounded-2xl p-5 border border-gray-100"><h3 class="text-sm font-bold text-gray-800 mb-4"><i class="fas fa-route mr-1.5 text-amber-500"></i>项目流向</h3><div class="space-y-4">' +
          [
            { icon: 'fa-paper-plane', color: 'amber', title: '发起通 — 项目提交', desc: currentDeal.originator + ' · ' + currentDeal.originateDate },
            { icon: 'fa-filter', color: 'cyan', title: '评估通 — AI筛选', desc: '通过 ' + (hasMatch ? currentDeal.matchScore + '% 匹配' : '基础审核') },
            { icon: 'fa-book-open', color: 'teal', title: '参与通 — 做功课', desc: '一页纸 + 同行参考 + 营业额预估' },
            { icon: 'fa-file-contract', color: 'gray', title: '条款通 → 合约通', desc: '确认参与后进入条款协商' }
          ].map(t => '<div class="flex items-start space-x-3"><div class="w-8 h-8 rounded-lg bg-' + t.color + '-100 flex items-center justify-center flex-shrink-0"><i class="fas ' + t.icon + ' text-' + t.color + '-600 text-xs"></i></div><div><p class="text-sm font-medium text-gray-700">' + t.title + '</p><p class="text-xs text-gray-400">' + t.desc + '</p></div></div>').join('') +
          '</div></div>' +
        '</div>';

      switchDetailView('onepager');

      switchPage('pageProjectSession');
      switchSessionTab('research');
    }

    function goToDashboard() { switchPage('pageDashboard'); renderDeals(); }

    function expressIntent() {
      if (!currentDeal) return;
      if (currentDeal.status === 'confirmed') {
        showToast('info', '已确认参与', '此项目已在条款通处理中');
        return;
      }
      switchSessionTab('intent');
      showToast('info', '进入表达意向', '请先填写结构化意向并确认发送');
    }

    function switchDetailView(view) {
      const mapping = {
        onepager: { btn: 'btnOnepager', section: 'sectionOnepager' },
        comparables: { btn: 'btnComparables', section: 'sectionComparables' },
        forecast: { btn: 'btnForecast', section: 'sectionForecast' }
      };
      Object.keys(mapping).forEach(k => {
        const btn = document.getElementById(mapping[k].btn);
        if (!btn) return;
        btn.className = k === view
          ? 'px-2.5 py-1 rounded-md text-xs font-semibold bg-white shadow text-teal-600'
          : 'px-2.5 py-1 rounded-md text-xs font-semibold text-gray-600';
      });
      const target = mapping[view] ? document.getElementById(mapping[view].section) : null;
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // ==================== Modals ====================
    function showConfirm(title, msg, cb) {
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = msg;
      document.getElementById('confirmAction').onclick = () => { hideConfirm(); cb && cb(); };
      document.getElementById('confirmModal').classList.remove('hidden');
    }
    function hideConfirm() { document.getElementById('confirmModal').classList.add('hidden'); }

    // ==================== Onboarding ====================
    function showOnboarding() { document.getElementById('onboardingModal').classList.remove('hidden'); obStep = 0; updateOBStep(); }
    function closeOnboarding() { document.getElementById('onboardingModal').classList.add('hidden'); localStorage.setItem('ec_onboarded', '1'); }
    function updateOBStep() {
      const icons = ['fa-filter', 'fa-paper-plane', 'fa-filter', 'fa-hand-pointer'];
      document.getElementById('obIcon').className = 'fas ' + icons[obStep] + ' text-white text-4xl';
      for (let i = 0; i < 4; i++) {
        const el = document.getElementById('obStep' + i); if (el) el.style.display = i === obStep ? 'block' : 'none';
      }
      document.querySelectorAll('.step-dot').forEach((d, i) => d.classList.toggle('active', i === obStep));
      document.getElementById('obPrev').classList.toggle('hidden', obStep === 0);
      document.getElementById('obNext').innerHTML = obStep === 3 ? '开始使用<i class="fas fa-check ml-2"></i>' : '下一步<i class="fas fa-arrow-right ml-2"></i>';
    }
    function obNext() { if (obStep < 3) { obStep++; updateOBStep(); } else { closeOnboarding(); } }
    function obPrev() { if (obStep > 0) { obStep--; updateOBStep(); } }
    function goToOBStep(s) { obStep = s; updateOBStep(); }

    // ==================== AI Chat ====================
    function toggleAIChat() { document.getElementById('aiChat').classList.toggle('hidden'); }
    function sendAIMsg() {
      const input = document.getElementById('aiInput');
      const msg = input.value.trim(); if (!msg) return;
      const msgs = document.getElementById('aiMessages');
      msgs.innerHTML += '<div class="ai-message user"><div class="ai-message-avatar"><i class="fas fa-user"></i></div><div class="ai-message-content">' + msg + '</div></div>';
      input.value = '';
      setTimeout(() => {
        const responses = [
          '当前筛子「' + (getActiveSieveModels()[currentSieve]?.name || '全部') + '」筛选出 ' + dealsList.length + ' 个机会。如需调整标准，可切换其他筛子模型或在「管理筛子」中添加新筛子。',
          '「风控优先筛子」适合保守型投资者，它要求AI评分>=8.5、金额<=800万。「高回报筛子」则聚焦分成>=12%的高潜力项目。',
          '所有机会均来自发起通，经过平台基础审核。评估通筛子在此基础上做二次精筛，帮您找到最匹配的项目。',
          '建议先用「综合评估筛子」做全面筛选，再针对感兴趣的项目切换「风控优先」做安全性验证。',
          '表达参与意向后，项目将流向条款通进行交易条款协商。整个过程透明可追踪。'
        ];
        msgs.innerHTML += '<div class="ai-message assistant"><div class="ai-message-avatar"><i class="fas fa-robot"></i></div><div class="ai-message-content">' + responses[Math.floor(Math.random() * responses.length)] + '</div></div>';
        msgs.scrollTop = msgs.scrollHeight;
      }, 800);
    }

    // ==================== Init ====================
    function initApp() {
      const bar = document.getElementById('loadingBar');
      const status = document.getElementById('loadingStatus');
      const steps = [
        { p: 25, t: '连接发起通数据...' },
        { p: 50, t: '加载评估通筛子...' },
        { p: 75, t: '初始化参与通看板...' },
        { p: 100, t: '准备就绪' }
      ];
      let i = 0;
      const tick = setInterval(() => {
        if (i >= steps.length) {
          clearInterval(tick);
          setTimeout(() => {
            document.getElementById('app-loading').classList.add('fade-out');
            setTimeout(() => document.getElementById('app-loading').style.display = 'none', 500);
          }, 300);
          return;
        }
        bar.style.width = steps[i].p + '%'; status.textContent = steps[i].t; i++;
      }, 400);

      // 尝试从 localStorage 恢复
      const saved = localStorage.getItem('ec_allDeals');
      if (saved) { try { allDeals = JSON.parse(saved); } catch(e) {} }
      const savedResearch = localStorage.getItem('ec_researchInputsByDeal');
      if (savedResearch) { try { researchInputsByDeal = JSON.parse(savedResearch); } catch(e) {} }
      const savedWorkbench = localStorage.getItem('ec_workbenchByDeal');
      if (savedWorkbench) { try { workbenchByDeal = JSON.parse(savedWorkbench); } catch(e) {} }
      const savedIntent = localStorage.getItem('ec_intentByDeal');
      if (savedIntent) { try { intentByDeal = JSON.parse(savedIntent); } catch(e) {} }
      const savedNegotiation = localStorage.getItem('ec_negotiationByDeal');
      if (savedNegotiation) { try { negotiationByDeal = JSON.parse(savedNegotiation); } catch(e) {} }
      const savedTimeline = localStorage.getItem('ec_timelineByDeal');
      if (savedTimeline) { try { timelineByDeal = JSON.parse(savedTimeline); } catch(e) {} }
      const savedContractPayload = localStorage.getItem('ec_contractPayloadByDeal');
      if (savedContractPayload) { try { contractPayloadByDeal = JSON.parse(savedContractPayload); } catch(e) {} }
    }

    document.addEventListener('DOMContentLoaded', initApp);
  </script>
</body>
</html>`)
})

// Favicon SVG
app.get('/favicon.svg', (c) => {
  return new Response(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64"><stop offset="0%" stop-color="#2EC4B6"/><stop offset="100%" stop-color="#28A696"/></linearGradient></defs><path d="M20 20 L44 32 L20 44 Z" fill="white" opacity="0.95"/></svg>',
    { headers: { 'Content-Type': 'image/svg+xml' } }
  )
})

export default app
