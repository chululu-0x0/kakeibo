(() => {
  'use strict';

  const VERSION = 'v1.0';
  const DB_NAME = 'kotsukotsu-kakeibo-db';
  const DB_VERSION = 1;
  const STORE_NAME = 'app';
  const STATE_KEY = 'state';

  const DEFAULT_STATE = {
    version: VERSION,
    budget: 80000,
    savings: { balance: 0, goal: 1500000 },
    fixedCosts: [],
    transactions: []
  };

  const CATEGORIES = [
    { id: 'food', name: '食費', icon: iconBowl() },
    { id: 'daily', name: '日用品', icon: iconBottle() },
    { id: 'hobby', name: '趣味', icon: iconGame() },
    { id: 'creative', name: '創作', icon: iconPen() },
    { id: 'beauty', name: '衣類・美容', icon: iconRibbon() },
    { id: 'transport', name: '交通', icon: iconTrain() },
    { id: 'medical', name: '医療', icon: iconCross() },
    { id: 'fixed', name: '固定費', icon: iconHouse() },
    { id: 'subscription', name: 'サブスク', icon: iconLoop() },
    { id: 'other', name: 'その他', icon: iconDots() },
    { id: 'salary', name: '給料', icon: iconWallet(), incomeOnly: true },
    { id: 'refund', name: '返金', icon: iconReturn(), incomeOnly: true }
  ];

  const dom = {};
  let state = structuredClone(DEFAULT_STATE);
  let db = null;
  let activeTransactionType = 'expense';
  let selectedCategoryId = 'food';
  let historyCursor = startOfMonth(new Date());
  let pendingConfirmAction = null;
  let toastTimer = null;

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheDom();
    setTodayDefaults();
    bindGlobalZoomGuards();
    bindNavigation();
    bindModals();
    bindForms();
    bindDataActions();
    renderCategoryPicker();

    try {
      db = await openDatabase();
      const saved = await dbGet(STATE_KEY);
      if (saved && typeof saved === 'object') state = normalizeState(saved);
      else await persistState();
    } catch (error) {
      console.warn('IndexedDB unavailable. Falling back to localStorage.', error);
      const fallback = safeParse(localStorage.getItem('kotsukotsu-kakeibo-state'));
      if (fallback) state = normalizeState(fallback);
    }

    historyCursor = startOfMonth(new Date());
    renderAll();
  }

  function cacheDom() {
    [
      'mainContent','monthLabel','budgetDonut','remainingAmount','remainingPercent','budgetAmount','spentAmount','dailyAllowance','incomeAmount','balanceAmount','todayTransactionList','categorySummary','homeSavingsBalance','homeSavingsProgress','homeSavingsCaption','historyMonthLabel','historyExpenseTotal','historyIncomeTotal','historyTransactionList','budgetInput','saveBudgetBtn','fixedCostList','fixedCostTotal','savingsBalanceDisplay','savingsGoalDisplay','savingsRemainingDisplay','savingsDonut','savingsPercent','savingsBalanceInput','savingsGoalInput','transactionModal','transactionForm','transactionAmount','transactionDate','paymentMethod','transactionMemo','transactionTypeControl','categoryPicker','fixedCostModal','fixedCostForm','fixedCostName','fixedCostAmount','confirmModal','confirmTitle','confirmMessage','confirmCancelBtn','confirmOkBtn','toast','importJsonInput'
    ].forEach(id => dom[id] = document.getElementById(id));
  }

  function bindNavigation() {
    document.querySelectorAll('[data-page-target]').forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.pageTarget));
    });
    document.querySelectorAll('[data-go-page]').forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.goPage));
    });
    document.getElementById('openSettingsBtn').addEventListener('click', () => switchPage('settings'));
    document.getElementById('openTransactionBtn').addEventListener('click', () => openTransactionModal());
    document.getElementById('editBudgetFromHome').addEventListener('click', () => switchPage('budget'));
    document.getElementById('addFixedCostBtn').addEventListener('click', () => openModal('fixedCostModal'));
    document.getElementById('prevHistoryMonth').addEventListener('click', () => {
      historyCursor = new Date(historyCursor.getFullYear(), historyCursor.getMonth() - 1, 1);
      renderHistory();
    });
    document.getElementById('nextHistoryMonth').addEventListener('click', () => {
      historyCursor = new Date(historyCursor.getFullYear(), historyCursor.getMonth() + 1, 1);
      renderHistory();
    });
  }

  function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.toggle('is-active', page.dataset.page === pageName));
    document.querySelectorAll('.nav-button[data-page-target]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.pageTarget === pageName));
    dom.mainContent.scrollTop = 0;
    if (pageName === 'history') renderHistory();
    if (pageName === 'budget') renderBudgetPage();
    if (pageName === 'savings') renderSavings();
  }

  function bindModals() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', event => {
        if (event.target === backdrop && backdrop.id !== 'confirmModal') closeModal(backdrop.id);
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        const open = document.querySelector('.modal-backdrop.is-open');
        if (open && open.id !== 'confirmModal') closeModal(open.id);
      }
    });

    dom.confirmCancelBtn.addEventListener('click', closeConfirm);
    dom.confirmOkBtn.addEventListener('click', async () => {
      const action = pendingConfirmAction;
      closeConfirm();
      if (action) await action();
    });
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function showConfirm(title, message, action, okLabel = '削除する') {
    dom.confirmTitle.textContent = title;
    dom.confirmMessage.textContent = message;
    dom.confirmOkBtn.textContent = okLabel;
    pendingConfirmAction = action;
    openModal('confirmModal');
  }

  function closeConfirm() {
    pendingConfirmAction = null;
    closeModal('confirmModal');
  }

  function bindForms() {
    dom.transactionTypeControl.addEventListener('click', event => {
      const btn = event.target.closest('[data-type]');
      if (!btn) return;
      activeTransactionType = btn.dataset.type;
      dom.transactionTypeControl.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === btn));
      selectedCategoryId = activeTransactionType === 'expense' ? 'food' : 'salary';
      renderCategoryPicker();
    });

    document.getElementById('quickAmounts').addEventListener('click', event => {
      const btn = event.target.closest('[data-add-amount]');
      if (!btn) return;
      const next = parseMoney(dom.transactionAmount.value) + Number(btn.dataset.addAmount);
      dom.transactionAmount.value = formatInputMoney(next);
      pulse(btn);
    });

    dom.transactionAmount.addEventListener('input', moneyFieldFormatter);
    dom.fixedCostAmount.addEventListener('input', moneyFieldFormatter);
    dom.budgetInput.addEventListener('input', moneyFieldFormatter);
    dom.savingsBalanceInput.addEventListener('input', moneyFieldFormatter);
    dom.savingsGoalInput.addEventListener('input', moneyFieldFormatter);

    dom.transactionForm.addEventListener('submit', async event => {
      event.preventDefault();
      const amount = parseMoney(dom.transactionAmount.value);
      if (!amount) return showToast('金額を入力してね');
      const category = getCategory(selectedCategoryId);
      const item = {
        id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type: activeTransactionType,
        amount,
        categoryId: category?.id || (activeTransactionType === 'expense' ? 'other' : 'refund'),
        date: dom.transactionDate.value || todayIso(),
        payment: dom.paymentMethod.value,
        memo: dom.transactionMemo.value.trim(),
        createdAt: new Date().toISOString()
      };
      state.transactions.push(item);
      await persistState();
      closeModal('transactionModal');
      resetTransactionForm();
      renderAll();
      showToast(activeTransactionType === 'expense' ? '支出を登録したよ' : '収入を登録したよ');
    });

    dom.saveBudgetBtn.addEventListener('click', async () => {
      const value = parseMoney(dom.budgetInput.value);
      if (value < 0) return;
      state.budget = value;
      await persistState();
      renderAll();
      showToast('月間予算を保存したよ');
    });

    dom.fixedCostForm.addEventListener('submit', async event => {
      event.preventDefault();
      const name = dom.fixedCostName.value.trim();
      const amount = parseMoney(dom.fixedCostAmount.value);
      if (!name || !amount) return showToast('名前と金額を入力してね');
      state.fixedCosts.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name, amount });
      await persistState();
      dom.fixedCostForm.reset();
      closeModal('fixedCostModal');
      renderBudgetPage();
      showToast('固定費を追加したよ');
    });

    dom.saveSavingsBtn.addEventListener('click', async () => {
      state.savings.balance = parseMoney(dom.savingsBalanceInput.value);
      state.savings.goal = Math.max(0, parseMoney(dom.savingsGoalInput.value));
      await persistState();
      renderSavings();
      renderHome();
      showToast('貯金情報を保存したよ');
    });
  }

  function openTransactionModal() {
    activeTransactionType = 'expense';
    selectedCategoryId = 'food';
    dom.transactionTypeControl.querySelectorAll('button').forEach(btn => btn.classList.toggle('is-active', btn.dataset.type === 'expense'));
    dom.transactionDate.value = todayIso();
    renderCategoryPicker();
    openModal('transactionModal');
    setTimeout(() => dom.transactionAmount.focus({ preventScroll: true }), 180);
  }

  function resetTransactionForm() {
    dom.transactionForm.reset();
    dom.transactionDate.value = todayIso();
    activeTransactionType = 'expense';
    selectedCategoryId = 'food';
    renderCategoryPicker();
  }

  function renderCategoryPicker() {
    const list = CATEGORIES.filter(category => activeTransactionType === 'income' ? category.incomeOnly : !category.incomeOnly);
    if (!list.some(c => c.id === selectedCategoryId)) selectedCategoryId = list[0]?.id || 'other';
    dom.categoryPicker.innerHTML = list.map(category => `
      <button class="category-choice bounce-button ${category.id === selectedCategoryId ? 'is-selected' : ''}" type="button" data-category-id="${category.id}" aria-label="${escapeHtml(category.name)}">
        ${category.icon}<span>${escapeHtml(category.name)}</span>
      </button>`).join('');
    dom.categoryPicker.querySelectorAll('[data-category-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedCategoryId = btn.dataset.categoryId;
        dom.categoryPicker.querySelectorAll('.category-choice').forEach(b => b.classList.toggle('is-selected', b === btn));
        pulse(btn);
      });
    });
  }

  function renderAll() {
    renderHome();
    renderHistory();
    renderBudgetPage();
    renderSavings();
  }

  function renderHome() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthTransactions = state.transactions.filter(t => isSameMonth(parseLocalDate(t.date), now));
    const expenses = monthTransactions.filter(t => t.type === 'expense');
    const incomes = monthTransactions.filter(t => t.type === 'income');
    const spent = sum(expenses.map(t => t.amount));
    const income = sum(incomes.map(t => t.amount));
    const budget = Math.max(0, state.budget || 0);
    const remaining = budget - spent;
    const usedRatio = budget > 0 ? Math.min(spent / budget, 1) : 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1);
    const daily = Math.max(0, remaining) / remainingDays;

    dom.monthLabel.textContent = `${year}年${month + 1}月`;
    dom.budgetAmount.textContent = yen(budget);
    dom.spentAmount.textContent = yen(spent);
    dom.remainingAmount.textContent = remaining >= 0 ? yen(remaining) : `-${yen(Math.abs(remaining))}`;
    dom.remainingPercent.textContent = budget > 0 ? `${Math.max(0, Math.round((1 - usedRatio) * 100))}%` : '—';
    dom.dailyAllowance.textContent = yen(Math.floor(daily));
    dom.incomeAmount.textContent = yen(income);
    dom.balanceAmount.textContent = signedYen(income - spent);
    dom.budgetDonut.style.setProperty('--progress', `${usedRatio * 360}deg`);

    const todays = state.transactions
      .filter(t => t.date === todayIso())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    renderTransactionList(dom.todayTransactionList, todays, true);

    const categoryTotals = expenses.reduce((acc, item) => {
      acc[item.categoryId] = (acc[item.categoryId] || 0) + item.amount;
      return acc;
    }, {});
    const entries = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
    if (!entries.length) {
      dom.categorySummary.innerHTML = '<div class="empty-state">まだ支出がないよ。＋から記録してみてね。</div>';
    } else {
      const max = Math.max(...entries.map(([,v]) => v), 1);
      dom.categorySummary.innerHTML = entries.map(([id, value]) => {
        const category = getCategory(id);
        return `<div class="category-summary-row"><span class="name">${escapeHtml(category?.name || 'その他')}</span><div class="category-bar"><span style="width:${Math.max(8, value / max * 100)}%"></span></div><strong>${yen(value)}</strong></div>`;
      }).join('');
    }

    const goal = Math.max(0, state.savings.goal || 0);
    const balance = Math.max(0, state.savings.balance || 0);
    const ratio = goal > 0 ? Math.min(balance / goal, 1) : 0;
    dom.homeSavingsBalance.textContent = yen(balance);
    dom.homeSavingsCaption.textContent = goal > 0 ? `目標 ${yen(goal)}` : '目標未設定';
    dom.homeSavingsProgress.style.width = `${ratio * 100}%`;
  }

  function renderHistory() {
    const monthTransactions = state.transactions
      .filter(t => isSameMonth(parseLocalDate(t.date), historyCursor))
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const expense = sum(monthTransactions.filter(t => t.type === 'expense').map(t => t.amount));
    const income = sum(monthTransactions.filter(t => t.type === 'income').map(t => t.amount));
    dom.historyMonthLabel.textContent = `${historyCursor.getFullYear()}年${historyCursor.getMonth() + 1}月`;
    dom.historyExpenseTotal.textContent = yen(expense);
    dom.historyIncomeTotal.textContent = yen(income);
    renderTransactionList(dom.historyTransactionList, monthTransactions, false);
  }

  function renderTransactionList(container, items, compact) {
    if (!items.length) {
      container.innerHTML = `<div class="empty-state">${compact ? '今日はまだ記録がないよ。' : 'この月の記録はまだないよ。'}</div>`;
      return;
    }
    container.innerHTML = items.map(item => {
      const category = getCategory(item.categoryId) || getCategory('other');
      const label = item.memo || category.name;
      const meta = `${formatShortDate(item.date)} ・ ${item.payment || '未設定'} ・ ${category.name}`;
      return `<article class="transaction-row" data-transaction-id="${item.id}">
        <div class="transaction-icon">${category.icon}</div>
        <div class="transaction-copy"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(meta)}</span></div>
        <div class="transaction-amount ${item.type}">${item.type === 'income' ? '+' : '-'}${yen(item.amount)}</div>
        ${compact ? '' : '<button class="delete-row bounce-button" type="button">削除</button>'}
      </article>`;
    }).join('');
    if (!compact) {
      container.querySelectorAll('.delete-row').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.closest('[data-transaction-id]').dataset.transactionId;
          const item = state.transactions.find(t => t.id === id);
          showConfirm('この記録を削除する？', item ? `${item.memo || getCategory(item.categoryId)?.name || '記録'} ${yen(item.amount)}` : 'この記録を削除します。', async () => {
            state.transactions = state.transactions.filter(t => t.id !== id);
            await persistState();
            renderAll();
            showToast('記録を削除したよ');
          });
        });
      });
    }
  }

  function renderBudgetPage() {
    dom.budgetInput.value = formatInputMoney(state.budget || 0);
    if (!state.fixedCosts.length) {
      dom.fixedCostList.innerHTML = '<div class="empty-state">固定費はまだないよ。「＋ 追加」から登録できます。</div>';
    } else {
      dom.fixedCostList.innerHTML = state.fixedCosts.map(item => `<div class="fixed-cost-row" data-fixed-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><span>${yen(item.amount)}</span><button class="bounce-button" type="button">削除</button></div>`).join('');
      dom.fixedCostList.querySelectorAll('[data-fixed-id] button').forEach(btn => btn.addEventListener('click', () => {
        const id = btn.closest('[data-fixed-id]').dataset.fixedId;
        const item = state.fixedCosts.find(f => f.id === id);
        showConfirm('固定費を削除する？', item ? `${item.name} ${yen(item.amount)}` : 'この固定費を削除します。', async () => {
          state.fixedCosts = state.fixedCosts.filter(f => f.id !== id);
          await persistState();
          renderBudgetPage();
          showToast('固定費を削除したよ');
        });
      }));
    }
    dom.fixedCostTotal.textContent = yen(sum(state.fixedCosts.map(f => f.amount)));
  }

  function renderSavings() {
    const balance = Math.max(0, state.savings.balance || 0);
    const goal = Math.max(0, state.savings.goal || 0);
    const ratio = goal > 0 ? Math.min(balance / goal, 1) : 0;
    dom.savingsBalanceDisplay.textContent = yen(balance);
    dom.savingsGoalDisplay.textContent = yen(goal);
    dom.savingsRemainingDisplay.textContent = goal > 0 ? `あと ${yen(Math.max(0, goal - balance))}` : '目標を設定してね';
    dom.savingsPercent.textContent = goal > 0 ? `${Math.round(ratio * 100)}%` : '—';
    dom.savingsDonut.style.setProperty('--progress', `${ratio * 360}deg`);
    dom.savingsBalanceInput.value = formatInputMoney(balance);
    dom.savingsGoalInput.value = formatInputMoney(goal);
  }

  function bindDataActions() {
    document.getElementById('exportJsonBtn').addEventListener('click', () => {
      const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString(), version: VERSION }, null, 2);
      const blob = new Blob([payload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${VERSION}_kakeibo_backup_${todayIso()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('JSONを書き出したよ');
    });

    dom.importJsonInput.addEventListener('change', async event => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const imported = normalizeState(JSON.parse(text));
        showConfirm('バックアップを読み込む？', '現在の端末内データは、読み込んだ内容で置き換わります。', async () => {
          state = imported;
          await persistState();
          renderAll();
          showToast('バックアップを読み込んだよ');
        }, '読み込む');
      } catch (error) {
        console.error(error);
        showToast('JSONを読み込めなかったよ');
      }
    });

    document.getElementById('resetDataBtn').addEventListener('click', () => {
      showConfirm('すべて初期化する？', '支出・収入・予算・固定費・貯金のデータが、この端末から削除されます。', async () => {
        state = structuredClone(DEFAULT_STATE);
        await persistState();
        historyCursor = startOfMonth(new Date());
        renderAll();
        showToast('初期状態に戻したよ');
      }, '初期化する');
    });
  }

  function bindGlobalZoomGuards() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', event => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300 && !isTextInput(event.target)) event.preventDefault();
      lastTouchEnd = now;
    }, { passive: false });

    document.addEventListener('gesturestart', event => event.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', event => event.preventDefault(), { passive: false });
    document.addEventListener('gestureend', event => event.preventDefault(), { passive: false });
    document.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) event.preventDefault();
    }, { passive: false });
  }

  function isTextInput(target) {
    return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
  }

  function pulse(el) {
    el.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(.88)' },
      { transform: 'scale(1.08)' },
      { transform: 'scale(1)' }
    ], { duration: 300, easing: 'ease-out' });
  }

  function moneyFieldFormatter(event) {
    const value = parseMoney(event.target.value);
    event.target.value = value ? formatInputMoney(value) : '';
  }

  function parseMoney(value) {
    const digits = String(value ?? '').replace(/[^0-9]/g, '');
    return digits ? Number(digits) : 0;
  }

  function formatInputMoney(value) {
    const number = Number(value) || 0;
    return number.toLocaleString('ja-JP');
  }

  function yen(value) {
    return `¥${Math.round(Number(value) || 0).toLocaleString('ja-JP')}`;
  }

  function signedYen(value) {
    const n = Math.round(Number(value) || 0);
    if (n > 0) return `+${yen(n)}`;
    if (n < 0) return `-${yen(Math.abs(n))}`;
    return yen(0);
  }

  function sum(values) { return values.reduce((total, value) => total + (Number(value) || 0), 0); }
  function getCategory(id) { return CATEGORIES.find(c => c.id === id); }

  function todayIso() {
    const now = new Date();
    return localIso(now);
  }

  function localIso(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseLocalDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function formatShortDate(iso) {
    const date = parseLocalDate(iso);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function isSameMonth(a, b) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth(); }
  function startOfMonth(date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
  function setTodayDefaults() { if (dom.transactionDate) dom.transactionDate.value = todayIso(); }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  function safeParse(text) {
    try { return text ? JSON.parse(text) : null; } catch { return null; }
  }

  function normalizeState(input) {
    const normalized = structuredClone(DEFAULT_STATE);
    if (!input || typeof input !== 'object') return normalized;
    normalized.version = VERSION;
    normalized.budget = Number.isFinite(Number(input.budget)) ? Math.max(0, Number(input.budget)) : DEFAULT_STATE.budget;
    normalized.savings = {
      balance: Math.max(0, Number(input.savings?.balance) || 0),
      goal: Math.max(0, Number(input.savings?.goal) || DEFAULT_STATE.savings.goal)
    };
    normalized.fixedCosts = Array.isArray(input.fixedCosts) ? input.fixedCosts.map(item => ({
      id: String(item.id || `${Date.now()}-${Math.random()}`),
      name: String(item.name || '固定費').slice(0, 30),
      amount: Math.max(0, Number(item.amount) || 0)
    })).filter(item => item.amount > 0) : [];
    normalized.transactions = Array.isArray(input.transactions) ? input.transactions.map(item => ({
      id: String(item.id || `${Date.now()}-${Math.random()}`),
      type: item.type === 'income' ? 'income' : 'expense',
      amount: Math.max(0, Number(item.amount) || 0),
      categoryId: getCategory(String(item.categoryId)) ? String(item.categoryId) : (item.type === 'income' ? 'refund' : 'other'),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date)) ? String(item.date) : todayIso(),
      payment: String(item.payment || '現金').slice(0, 30),
      memo: String(item.memo || '').slice(0, 80),
      createdAt: String(item.createdAt || new Date().toISOString())
    })).filter(item => item.amount > 0) : [];
    return normalized;
  }

  async function persistState() {
    state.version = VERSION;
    try {
      if (db) await dbPut(STATE_KEY, state);
      else localStorage.setItem('kotsukotsu-kakeibo-state', JSON.stringify(state));
    } catch (error) {
      console.warn('Persist failed, using localStorage.', error);
      localStorage.setItem('kotsukotsu-kakeibo-state', JSON.stringify(state));
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function dbGet(key) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function dbPut(key, value) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add('is-show');
    toastTimer = setTimeout(() => dom.toast.classList.remove('is-show'), 1900);
  }

  function svg(paths) {
    return `<svg viewBox="0 0 32 32" role="img" aria-hidden="true" focusable="false">${paths}</svg>`;
  }
  const stroke = `fill="none" stroke="#6a523d" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"`;
  const fill = `fill="#f3d770" stroke="#6a523d" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;

  function iconBowl(){return svg(`<path ${fill} d="M6 14h20c0 7-4.6 11-10 11S6 21 6 14Z"/><path ${stroke} d="M10 10c1.4-3 3.1-3 4.5 0M17 9c1.3-2.5 2.8-2.5 4 0M9 27h14"/>`)}
  function iconBottle(){return svg(`<path ${fill} d="M12 5h8v5c2 1.6 3 4 3 7v8H9v-8c0-3 1-5.4 3-7V5Z"/><path ${stroke} d="M11 14h10M13 4h6"/>`)}
  function iconGame(){return svg(`<path ${fill} d="M9 11h14c3 0 5 2.3 5 5.2v4.2c0 3.2-3 4.2-5 2.2l-2.2-2.2h-9.6L9 22.6c-2 2-5 1-5-2.2v-4.2C4 13.3 6 11 9 11Z"/><path ${stroke} d="M10 15v5M7.5 17.5h5M21 16.2h.1M24 19h.1"/>`)}
  function iconPen(){return svg(`<path ${fill} d="m8 23 2-6L21 6l5 5-11 11-7 1Z"/><path ${stroke} d="m18 9 5 5M8 23l5-1-3-3-2 4Z"/>`)}
  function iconRibbon(){return svg(`<path ${fill} d="M16 14c-2-5-8-7-10-3-1.7 3 2 7 10 5M16 14c2-5 8-7 10-3 1.7 3-2 7-10 5Z"/><path ${fill} d="m13 16-5 10 7-3 1-6m3-1 5 10-7-3-1-6"/><circle ${fill} cx="16" cy="15" r="3"/>`)}
  function iconTrain(){return svg(`<rect ${fill} x="8" y="5" width="16" height="20" rx="5"/><path ${stroke} d="M11 9h10v7H11zM12 28l2-3m6 3-2-3M11 20h.1M21 20h.1"/>`)}
  function iconCross(){return svg(`<rect ${fill} x="5" y="5" width="22" height="22" rx="7"/><path ${stroke} d="M16 10v12M10 16h12"/>`)}
  function iconHouse(){return svg(`<path ${fill} d="m5 15 11-9 11 9v12H5V15Z"/><path ${stroke} d="M12 27v-8h8v8M9 14h.1"/>`)}
  function iconLoop(){return svg(`<path ${stroke} d="M8 11a10 10 0 0 1 16 1l2 3M24 21a10 10 0 0 1-16-1l-2-3"/><path ${fill} d="m24 9 2 6-6-1m-12 9-2-6 6 1"/>`)}
  function iconDots(){return svg(`<rect ${fill} x="5" y="5" width="22" height="22" rx="7"/><circle fill="#6a523d" cx="11" cy="16" r="2"/><circle fill="#6a523d" cx="16" cy="16" r="2"/><circle fill="#6a523d" cx="21" cy="16" r="2"/>`)}
  function iconWallet(){return svg(`<path ${fill} d="M6 9h18c2 0 3 1 3 3v12H7c-2 0-3-1.5-3-3V9c0-2 1.6-4 4-4h13v4"/><path ${stroke} d="M21 15h6v6h-6a3 3 0 0 1 0-6Z"/>`)}
  function iconReturn(){return svg(`<path ${fill} d="M9 7 4 12l5 5v-3h7c6 0 10 3 11 9-2-3-5-5-10-5H9v4l-5-5 5-5V7Z"/>`)}
})();
