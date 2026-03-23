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
      toast.innerHTML = '<div class="toast-icon"><i class="' + (icons[type]||icons.info) + '"></i></div><div class="toast-body"><div class="toast-title">' + title + '</div>' + (message ? '<div class="toast-message">' + message + '</div>' : '') + '</div><button class="toast-close" onclick="this.parentElement.classList.add(\'toast-exit\'); setTimeout(() => this.parentElement.remove(), 300);"><i class="fas fa-times"></i></button><div class="toast-progress" style="animation-duration: ' + duration + 'ms;"></div>';
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

        return '<div class="project-card group cursor-pointer animate-fade-in" onclick="openDetail(\'' + d.id + '\')">' +
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
              '<button onclick="event.stopPropagation(); toggleSkip(\'' + d.id + '\')" class="text-xs font-medium ' + (d.skipped ? 'text-rose-600' : 'text-gray-400 hover:text-rose-600') + ' transition-colors"><i class="fas fa-forward mr-1"></i>' + (d.skipped ? '取消跳过' : '标记跳过') + '</button>' +
              '<button onclick="event.stopPropagation(); toggleIntent(\'' + d.id + '\')" class="text-xs font-medium ' + (d.status === 'interested' || d.status === 'confirmed' ? 'text-teal-600' : 'text-gray-400 hover:text-teal-600') + ' transition-colors"><i class="fas fa-hand-point-up mr-1"></i>' + (d.status === 'interested' ? '已有意向' : d.status === 'confirmed' ? '已确认' : '表达意向') + '</button>' +
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
