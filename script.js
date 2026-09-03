'use strict';

const DB_NAME = 'kotsukotsu-kakeibo';
const DB_VERSION = 1;
const STORE_NAME = 'app';
const STATE_KEY = 'state';
const APP_VERSION = '1.2';

const DEFAULT_STATE = {
  budget: 80000,
  transactions: [],
  fixedCosts: [],
  savings: { balance: 0, goal: 1500000 }
};

const icon = (body, bg = '#fff3bf') => `
<svg viewBox="0 0 48 48" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <rect x="2" y="2" width="44" height="44" rx="12" fill="${bg}"/>
  ${body}
</svg>`;

const CATEGORIES = [
  { id:'food', name:'食費', icon:icon('<path d="M13 25h22v3a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9v-3Z" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M17 22c1-5 3-8 7-10M24 22c0-5 1-8 4-11M30 22c0-4 2-6 5-8" fill="none" stroke="#604c39" stroke-width="2" stroke-linecap="round"/>') },
  { id:'daily', name:'日用品', icon:icon('<rect x="13" y="17" width="22" height="20" rx="5" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M18 17v-3h12v3M18 24h12M18 29h8" fill="none" stroke="#604c39" stroke-width="2" stroke-linecap="round"/>','#f8edc9') },
  { id:'transport', name:'交通', icon:icon('<rect x="12" y="12" width="24" height="24" rx="6" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M16 18h16v9H16zM18 34v2M30 34v2" fill="none" stroke="#604c39" stroke-width="2"/><circle cx="19" cy="30" r="2" fill="#604c39"/><circle cx="29" cy="30" r="2" fill="#604c39"/>','#eef2de') },
  { id:'beauty', name:'衣類・美容', icon:icon('<path d="M18 14h12l5 6-5 4v13H18V24l-5-4 5-6Z" fill="#fff" stroke="#604c39" stroke-width="2" stroke-linejoin="round"/><path d="M21 14c0 4 6 4 6 0" fill="none" stroke="#604c39" stroke-width="2"/>','#fbe8df') },
  { id:'medical', name:'医療', icon:icon('<rect x="13" y="13" width="22" height="22" rx="7" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M24 18v12M18 24h12" stroke="#b86d60" stroke-width="3" stroke-linecap="round"/>','#f8e7e3') },
  { id:'hobby', name:'趣味', icon:icon('<path d="M24 36s-12-7-12-15a7 7 0 0 1 12-5 7 7 0 0 1 12 5c0 8-12 15-12 15Z" fill="#fff" stroke="#604c39" stroke-width="2"/>','#f3e5f2') },
  { id:'game', name:'ゲーム', icon:icon('<path d="M16 20h16a7 7 0 0 1 6 9l-2 6a4 4 0 0 1-6 2l-4-3h-4l-4 3a4 4 0 0 1-6-2l-2-6a7 7 0 0 1 6-9Z" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M18 27h6M21 24v6" stroke="#604c39" stroke-width="2" stroke-linecap="round"/><circle cx="30" cy="26" r="1.5" fill="#604c39"/><circle cx="33" cy="30" r="1.5" fill="#604c39"/>','#e9edf8') },
  { id:'creative', name:'創作', icon:icon('<path d="m14 34 5-14 10-8 7 7-8 10-14 5Z" fill="#fff" stroke="#604c39" stroke-width="2" stroke-linejoin="round"/><path d="m19 20 9 9M29 12l7 7" stroke="#604c39" stroke-width="2"/><circle cx="18" cy="30" r="2" fill="#604c39"/>','#e6f3ef') },
  { id:'subscription', name:'サブスク', icon:icon('<rect x="12" y="15" width="24" height="19" rx="5" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M17 20h14M18 27h5M27 27h3" stroke="#604c39" stroke-width="2" stroke-linecap="round"/>','#f3eadb') },
  { id:'fixed', name:'固定費', icon:icon('<path d="M11 23 24 12l13 11v14H11V23Z" fill="#fff" stroke="#604c39" stroke-width="2" stroke-linejoin="round"/><path d="M20 37V27h8v10" fill="none" stroke="#604c39" stroke-width="2"/>','#f7ecc5') },
  { id:'gift', name:'交際・贈り物', icon:icon('<rect x="12" y="21" width="24" height="16" rx="3" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M24 21v16M10 21h28v-6H10v6ZM24 15c-5 0-7-2-6-5 3-1 6 1 6 5Zm0 0c5 0 7-2 6-5-3-1-6 1-6 5Z" fill="#fff" stroke="#604c39" stroke-width="2" stroke-linejoin="round"/>','#f9e7e1') },
  { id:'other', name:'その他', icon:icon('<circle cx="16" cy="24" r="3" fill="#604c39"/><circle cx="24" cy="24" r="3" fill="#604c39"/><circle cx="32" cy="24" r="3" fill="#604c39"/>','#eee9df') },
  { id:'salary', name:'給料', incomeOnly:true, icon:icon('<rect x="11" y="15" width="26" height="19" rx="4" fill="#fff" stroke="#604c39" stroke-width="2"/><circle cx="24" cy="24.5" r="5" fill="none" stroke="#668b74" stroke-width="2"/><path d="M14 19h4M30 30h4" stroke="#604c39" stroke-width="2" stroke-linecap="round"/>','#e5f1e7') },
  { id:'sideincome', name:'臨時収入', incomeOnly:true, icon:icon('<path d="M24 10 28 20l10 4-10 4-4 10-4-10-10-4 10-4 4-10Z" fill="#fff" stroke="#604c39" stroke-width="2" stroke-linejoin="round"/>','#edf5df') },
  { id:'refund', name:'返金', incomeOnly:true, icon:icon('<path d="M15 18h18v17H15z" fill="#fff" stroke="#604c39" stroke-width="2"/><path d="M18 14h12M19 22h10M24 19v12M19 27h10" fill="none" stroke="#604c39" stroke-width="2" stroke-linecap="round"/>','#e5f1e7') },
  { id:'otherincome', name:'その他収入', incomeOnly:true, icon:icon('<circle cx="16" cy="24" r="3" fill="#668b74"/><circle cx="24" cy="24" r="3" fill="#668b74"/><circle cx="32" cy="24" r="3" fill="#668b74"/>','#e8f2ea') }
];

let state = structuredCloneSafe(DEFAULT_STATE);
let db = null;
let activePage = 'home';
let previousPage = 'home';
let activeTransactionType = 'expense';
let selectedCategoryId = 'food';
let historyCursor = startOfMonth(new Date());
let selectedCalendarDate = todayIso();
let confirmAction = null;
let toastTimer = null;

const $ = id => document.getElementById(id);
const dom = {};

window.addEventListener('DOMContentLoaded', init);

async function init(){
  cacheDom();
  preventZoomGestures();
  bindEvents();
  await initStorage();
  const loaded = await loadState();
  state = normalizeState(loaded || DEFAULT_STATE);
  $('transactionDate').value = todayIso();
  renderCategoryPicker();
  renderAll();
  registerServiceWorker();
}

function cacheDom(){
  document.querySelectorAll('[id]').forEach(el => { dom[el.id] = el; });
}

function bindEvents(){
  document.querySelectorAll('[data-page-target]').forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.pageTarget)));
  document.querySelectorAll('[data-go-page]').forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.goPage)));
  dom.openSettingsBtn.addEventListener('click', () => { previousPage = activePage === 'settings' ? 'home' : activePage; switchPage('settings'); });
  dom.closeSettingsPageBtn.addEventListener('click', () => switchPage(previousPage || 'home'));
  dom.openTransactionBtn.addEventListener('click', openTransactionModal);
  dom.editBudgetFromHome.addEventListener('click', () => switchPage('budget'));
  dom.prevHistoryMonth.addEventListener('click', () => moveHistoryMonth(-1));
  dom.nextHistoryMonth.addEventListener('click', () => moveHistoryMonth(1));
  dom.jumpTodayBtn.addEventListener('click', () => { historyCursor = startOfMonth(new Date()); selectedCalendarDate = todayIso(); renderHistory(); });
  dom.addFixedCostBtn.addEventListener('click', () => openModal('fixedCostModal'));

  document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', e => { if(e.target === backdrop && backdrop.id !== 'confirmModal') closeModal(backdrop.id); }));

  dom.transactionTypeControl.addEventListener('click', e => {
    const btn = e.target.closest('[data-type]'); if(!btn) return;
    activeTransactionType = btn.dataset.type;
    selectedCategoryId = activeTransactionType === 'expense' ? 'food' : 'salary';
    dom.transactionTypeControl.querySelectorAll('[data-type]').forEach(b => b.classList.toggle('is-active', b === btn));
    renderCategoryPicker(); pop(btn);
  });
  dom.categoryPicker.addEventListener('click', e => {
    const btn = e.target.closest('[data-category-id]'); if(!btn) return;
    selectedCategoryId = btn.dataset.categoryId;
    dom.categoryPicker.querySelectorAll('[data-category-id]').forEach(b => b.classList.toggle('is-selected', b === btn)); pop(btn);
  });
  document.querySelector('.quick-amounts').addEventListener('click', e => {
    const btn = e.target.closest('[data-add-amount]'); if(!btn) return;
    dom.transactionAmount.value = formatInputMoney(parseMoney(dom.transactionAmount.value) + Number(btn.dataset.addAmount)); pop(btn);
  });

  [dom.transactionAmount, dom.fixedCostAmount, dom.budgetInput, dom.savingsBalanceInput, dom.savingsGoalInput].forEach(el => el.addEventListener('input', moneyFieldFormatter));
  dom.transactionForm.addEventListener('submit', saveTransaction);
  dom.saveBudgetBtn.addEventListener('click', saveBudget);
  dom.fixedCostForm.addEventListener('submit', saveFixedCost);
  dom.saveSavingsBtn.addEventListener('click', saveSavings);
  dom.calendarGrid.addEventListener('click', e => {
    const cell = e.target.closest('[data-date]'); if(!cell) return;
    selectedCalendarDate = cell.dataset.date;
    const d = parseLocalDate(selectedCalendarDate);
    if(d.getMonth() !== historyCursor.getMonth() || d.getFullYear() !== historyCursor.getFullYear()) historyCursor = startOfMonth(d);
    renderHistory(); pop(cell);
  });
  document.addEventListener('click', e => {
    const txDelete = e.target.closest('[data-delete-transaction]');
    if(txDelete){ askConfirm('この記録を削除する？','削除すると元には戻せません。', async () => { state.transactions = state.transactions.filter(t => t.id !== txDelete.dataset.deleteTransaction); await persistState(); renderAll(); showToast('記録を削除したよ'); }); return; }
    const fixedDelete = e.target.closest('[data-delete-fixed]');
    if(fixedDelete){ askConfirm('この固定費を削除する？','固定費一覧から削除します。残り使える金額も自動で再計算されます。', async () => { state.fixedCosts = state.fixedCosts.filter(x => x.id !== fixedDelete.dataset.deleteFixed); await persistState(); renderHome(); renderBudgetPage(); showToast('固定費を削除したよ'); }); }
  });
  dom.confirmCancelBtn.addEventListener('click', () => { confirmAction = null; closeModal('confirmModal'); });
  dom.confirmOkBtn.addEventListener('click', async () => { const fn = confirmAction; confirmAction = null; closeModal('confirmModal'); if(fn) await fn(); });
  dom.exportJsonBtn.addEventListener('click', exportJson);
  dom.importJsonInput.addEventListener('change', importJson);
  dom.resetDataBtn.addEventListener('click', () => askConfirm('全部初期化する？','支出・収入・予算・固定費・貯金のデータをこの端末から削除します。', resetAllData));
  document.addEventListener('keydown', e => { if(e.key === 'Escape'){ const open = [...document.querySelectorAll('.modal-backdrop.is-open')].pop(); if(open && open.id !== 'confirmModal') closeModal(open.id); } });
}

function preventZoomGestures(){
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => { const now = Date.now(); if(now-lastTouchEnd <= 300) e.preventDefault(); lastTouchEnd = now; }, {passive:false});
  ['gesturestart','gesturechange','gestureend'].forEach(name => document.addEventListener(name, e => e.preventDefault(), {passive:false}));
  document.addEventListener('wheel', e => { if(e.ctrlKey || e.metaKey) e.preventDefault(); }, {passive:false});
}

function switchPage(page){
  if(!document.querySelector(`[data-page="${page}"]`)) return;
  activePage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('is-active', p.dataset.page === page));
  document.querySelectorAll('[data-page-target]').forEach(b => b.classList.toggle('is-active', b.dataset.pageTarget === page));
  dom.openSettingsBtn.style.display = (page === 'settings' || page === 'history') ? 'none' : 'grid';
  window.scrollTo({top:0,behavior:'auto'});
  if(page === 'history') renderHistory();
  if(page === 'budget') renderBudgetPage();
  if(page === 'savings') renderSavings();
}

function openTransactionModal(){
  activeTransactionType = 'expense'; selectedCategoryId = 'food';
  dom.transactionTypeControl.querySelectorAll('[data-type]').forEach(b => b.classList.toggle('is-active', b.dataset.type === 'expense'));
  dom.transactionDate.value = selectedCalendarDate && activePage === 'history' ? selectedCalendarDate : todayIso();
  dom.transactionAmount.value = ''; dom.transactionMemo.value = ''; dom.paymentMethod.value = '現金';
  renderCategoryPicker(); openModal('transactionModal');
  setTimeout(() => dom.transactionAmount.focus({preventScroll:true}),220);
}

function renderCategoryPicker(){
  const items = CATEGORIES.filter(c => activeTransactionType === 'income' ? c.incomeOnly : !c.incomeOnly);
  if(!items.some(c => c.id === selectedCategoryId)) selectedCategoryId = items[0]?.id || 'other';
  dom.categoryPicker.innerHTML = items.map(c => `<button class="category-choice pop-button ${c.id===selectedCategoryId?'is-selected':''}" type="button" data-category-id="${c.id}">${c.icon}<span>${escapeHtml(c.name)}</span></button>`).join('');
}

async function saveTransaction(e){
  e.preventDefault();
  const amount = parseMoney(dom.transactionAmount.value);
  if(amount <= 0) return showToast('金額を入力してね');
  const item = { id:uid(), type:activeTransactionType, amount, categoryId:selectedCategoryId, date:dom.transactionDate.value || todayIso(), payment:dom.paymentMethod.value, memo:dom.transactionMemo.value.trim(), createdAt:new Date().toISOString() };
  state.transactions.push(item);
  await persistState();
  selectedCalendarDate = item.date;
  closeModal('transactionModal'); renderAll();
  showToast(item.type === 'expense' ? '支出を登録したよ' : '収入を登録したよ');
}

async function saveBudget(){
  state.budget = Math.max(0, parseMoney(dom.budgetInput.value)); await persistState(); renderAll(); showToast('予算を保存したよ');
}
async function saveFixedCost(e){
  e.preventDefault(); const name = dom.fixedCostName.value.trim(); const amount = parseMoney(dom.fixedCostAmount.value);
  if(!name || amount<=0) return showToast('名前と金額を入力してね');
  state.fixedCosts.push({id:uid(),name,amount}); await persistState(); dom.fixedCostForm.reset(); closeModal('fixedCostModal'); renderHome(); renderBudgetPage(); showToast('固定費を追加したよ');
}
async function saveSavings(){
  state.savings.balance = Math.max(0,parseMoney(dom.savingsBalanceInput.value)); state.savings.goal = Math.max(0,parseMoney(dom.savingsGoalInput.value)); await persistState(); renderHome(); renderSavings(); showToast('貯金情報を保存したよ');
}

function moveHistoryMonth(delta){
  historyCursor = new Date(historyCursor.getFullYear(),historyCursor.getMonth()+delta,1);
  const today = new Date();
  selectedCalendarDate = historyCursor.getFullYear()===today.getFullYear() && historyCursor.getMonth()===today.getMonth() ? todayIso() : localIso(new Date(historyCursor.getFullYear(),historyCursor.getMonth(),1));
  renderHistory();
}

function renderAll(){ renderHome(); renderHistory(); renderBudgetPage(); renderSavings(); }

function renderHome(){
  const now = new Date();
  const monthItems = transactionsForMonth(now);
  const expenses = monthItems.filter(t=>t.type==='expense'); const incomes = monthItems.filter(t=>t.type==='income');
  const spent = sum(expenses.map(t=>t.amount)); const income = sum(incomes.map(t=>t.amount)); const fixedReserved = sum(state.fixedCosts.map(x=>x.amount)); const budget = Math.max(0,state.budget||0); const reservedAndSpent = fixedReserved + spent; const remaining = budget-reservedAndSpent; const usedRatio = budget>0 ? Math.min(reservedAndSpent/budget,1) : 0;
  const daysInMonth = new Date(now.getFullYear(),now.getMonth()+1,0).getDate(); const remainingDays = Math.max(1,daysInMonth-now.getDate()+1); const daily = Math.max(0,remaining)/remainingDays;
  dom.monthLabel.textContent = `${now.getFullYear()}年${now.getMonth()+1}月`;
  dom.budgetAmount.textContent = yen(budget); dom.spentAmount.textContent = yen(spent); dom.fixedReservedAmount.textContent = yen(fixedReserved); dom.remainingAmount.textContent = signedRemaining(remaining); dom.remainingPercent.textContent = budget>0 ? `${Math.max(0,Math.round((remaining/budget)*100))}%` : '—'; dom.dailyAllowance.textContent = yen(Math.floor(daily)); dom.incomeAmount.textContent = yen(income); dom.balanceAmount.textContent = signedYen(income-spent); dom.budgetDonut.style.setProperty('--progress',`${usedRatio*360}deg`);
  renderTransactionList(dom.todayTransactionList,state.transactions.filter(t=>t.date===todayIso()).sort(sortNewest),true);
  const totals={}; expenses.forEach(t=>totals[t.categoryId]=(totals[t.categoryId]||0)+t.amount); const entries=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,6);
  if(!entries.length) dom.categorySummary.innerHTML='<div class="empty-state">まだ支出がないよ。＋から記録してみてね。</div>';
  else { const max=Math.max(...entries.map(([,v])=>v),1); dom.categorySummary.innerHTML=entries.map(([id,v])=>`<div class="category-summary-row"><span class="name">${escapeHtml(getCategory(id)?.name||'その他')}</span><div class="category-bar"><span style="width:${Math.max(8,v/max*100)}%"></span></div><strong>${yen(v)}</strong></div>`).join(''); }
  const goal=Math.max(0,state.savings.goal||0), balance=Math.max(0,state.savings.balance||0), ratio=goal>0?Math.min(balance/goal,1):0; dom.homeSavingsBalance.textContent=yen(balance); dom.homeSavingsCaption.textContent=goal>0?`目標 ${yen(goal)}`:'目標未設定'; dom.homeSavingsProgress.style.width=`${ratio*100}%`;
}

function renderHistory(){
  dom.historyMonthLabel.textContent = `${historyCursor.getFullYear()}年${historyCursor.getMonth()+1}月`;
  renderCalendarGrid(); renderSelectedDate();
}

function renderCalendarGrid(){
  const year=historyCursor.getFullYear(), month=historyCursor.getMonth(); const first=new Date(year,month,1); const start=new Date(year,month,1-first.getDay()); const cells=[];
  for(let i=0;i<42;i++){
    const d=new Date(start.getFullYear(),start.getMonth(),start.getDate()+i); const date=localIso(d); const dayItems=state.transactions.filter(t=>t.date===date); const expense=sum(dayItems.filter(t=>t.type==='expense').map(t=>t.amount)); const income=sum(dayItems.filter(t=>t.type==='income').map(t=>t.amount)); const outside=d.getMonth()!==month; const isToday=date===todayIso(); const isSelected=date===selectedCalendarDate;
    cells.push(`<button class="calendar-day pop-button ${outside?'outside':''} ${isToday?'is-today':''} ${isSelected?'is-selected':''}" type="button" data-date="${date}" aria-label="${d.getMonth()+1}月${d.getDate()}日"><span class="day-num">${d.getDate()}</span><span class="calendar-day-money">${expense?`<span class="expense">−${compactYen(expense)}</span>`:''}${income?`<span class="income">＋${compactYen(income)}</span>`:''}</span></button>`);
  }
  dom.calendarGrid.innerHTML=cells.join('');
}

function renderSelectedDate(){
  const d=parseLocalDate(selectedCalendarDate); const items=state.transactions.filter(t=>t.date===selectedCalendarDate).sort(sortNewest); const expense=sum(items.filter(t=>t.type==='expense').map(t=>t.amount)); const income=sum(items.filter(t=>t.type==='income').map(t=>t.amount));
  const todayTag=selectedCalendarDate===todayIso()?'・今日':''; dom.selectedDateLabel.textContent=`${d.getMonth()+1}月${d.getDate()}日${todayTag}`; dom.selectedExpenseTotal.textContent=yen(expense); dom.selectedIncomeTotal.textContent=yen(income); renderTransactionList(dom.selectedDateTransactionList,items,false);
}

function renderBudgetPage(){
  dom.budgetInput.value=formatInputMoney(state.budget||0); const total=sum(state.fixedCosts.map(x=>x.amount)); dom.fixedCostTotal.textContent=yen(total);
  dom.fixedCostList.innerHTML = state.fixedCosts.length ? state.fixedCosts.map(x=>`<div class="fixed-cost-row"><div><strong>${escapeHtml(x.name)}</strong><small>毎月</small></div><div><strong>${yen(x.amount)}</strong><button type="button" data-delete-fixed="${x.id}" aria-label="削除">×</button></div></div>`).join('') : '<div class="empty-state">固定費はまだ登録されていないよ。</div>';
}

function renderSavings(){
  const balance=Math.max(0,state.savings.balance||0),goal=Math.max(0,state.savings.goal||0),ratio=goal>0?Math.min(balance/goal,1):0; dom.savingsBalanceDisplay.textContent=yen(balance); dom.savingsGoalDisplay.textContent=yen(goal); dom.savingsRemainingDisplay.textContent=`あと ${yen(Math.max(0,goal-balance))}`; dom.savingsPercent.textContent=goal>0?`${Math.round(ratio*100)}%`:'—'; dom.savingsDonut.style.setProperty('--progress',`${ratio*360}deg`); dom.savingsBalanceInput.value=formatInputMoney(balance); dom.savingsGoalInput.value=formatInputMoney(goal);
}

function renderTransactionList(container,items,compact){
  if(!items.length){ container.innerHTML=`<div class="empty-state">${compact?'今日はまだ記録がないよ。':'この日の記録はまだないよ。'}</div>`; return; }
  container.innerHTML=items.map(item=>{ const c=getCategory(item.categoryId); const memo=item.memo||c?.name||'記録'; const sub=[c?.name,item.payment,item.date].filter(Boolean).join(' ・ '); return `<div class="transaction-row"><div class="tx-icon">${c?.icon||getCategory('other').icon}</div><div class="tx-main"><strong>${escapeHtml(memo)}</strong><small>${escapeHtml(sub)}</small></div><strong class="tx-amount ${item.type}">${item.type==='income'?'+':'−'}${yen(item.amount)}</strong><button class="tx-delete pop-button" type="button" data-delete-transaction="${item.id}" aria-label="削除">×</button></div>`; }).join('');
}

function openModal(id){ const el=dom[id]||$(id); if(!el)return; el.classList.add('is-open'); el.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; }
function closeModal(id){ const el=dom[id]||$(id); if(!el)return; el.classList.remove('is-open'); el.setAttribute('aria-hidden','true'); if(!document.querySelector('.modal-backdrop.is-open')) document.body.style.overflow=''; }
function askConfirm(title,message,action){ dom.confirmTitle.textContent=title; dom.confirmMessage.textContent=message; confirmAction=action; openModal('confirmModal'); }
function pop(el){ el.classList.remove('is-popping'); void el.offsetWidth; el.classList.add('is-popping'); setTimeout(()=>el.classList.remove('is-popping'),360); }
function showToast(message){ clearTimeout(toastTimer); dom.toast.textContent=message; dom.toast.classList.add('is-show'); toastTimer=setTimeout(()=>dom.toast.classList.remove('is-show'),1900); }

async function exportJson(){
  const payload={app:'kotsukotsu-kakeibo',version:APP_VERSION,exportedAt:new Date().toISOString(),data:state}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`kakeibo-backup-${todayIso()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),500); showToast('JSONを書き出したよ');
}
async function importJson(e){
  const file=e.target.files?.[0]; if(!file)return; try{ const parsed=JSON.parse(await file.text()); const candidate=parsed.data||parsed; state=normalizeState(candidate); await persistState(); renderAll(); showToast('バックアップを読み込んだよ'); }catch(err){ console.error(err); showToast('JSONを読み込めなかったよ'); }finally{ e.target.value=''; }
}
async function resetAllData(){ state=structuredCloneSafe(DEFAULT_STATE); await persistState(); historyCursor=startOfMonth(new Date()); selectedCalendarDate=todayIso(); renderAll(); switchPage('home'); showToast('データを初期化したよ'); }

function initStorage(){
  return new Promise(resolve=>{ if(!('indexedDB' in window)){ resolve(); return; } const req=indexedDB.open(DB_NAME,DB_VERSION); req.onupgradeneeded=()=>{ const d=req.result; if(!d.objectStoreNames.contains(STORE_NAME)) d.createObjectStore(STORE_NAME); }; req.onsuccess=()=>{ db=req.result; resolve(); }; req.onerror=()=>{ console.warn('IndexedDB unavailable',req.error); resolve(); }; });
}
async function loadState(){
  if(db){ try{return await idbGet(STATE_KEY);}catch(e){console.warn(e);} }
  try{ return JSON.parse(localStorage.getItem('kotsukotsu-kakeibo-state')||'null'); }catch{return null;}
}
async function persistState(){
  const data=structuredCloneSafe(state); if(db){ try{ await idbPut(STATE_KEY,data); return; }catch(e){console.warn(e);} } localStorage.setItem('kotsukotsu-kakeibo-state',JSON.stringify(data));
}
function idbGet(key){ return new Promise((resolve,reject)=>{ const tx=db.transaction(STORE_NAME,'readonly'); const req=tx.objectStore(STORE_NAME).get(key); req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error); }); }
function idbPut(key,value){ return new Promise((resolve,reject)=>{ const tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).put(value,key); tx.oncomplete=()=>resolve(); tx.onerror=()=>reject(tx.error); }); }

function registerServiceWorker(){ if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./service-worker.js', { updateViaCache:'none' }).catch(err=>console.warn('SW registration failed',err)); }
function normalizeState(v){ return { budget:Number.isFinite(Number(v?.budget))?Math.max(0,Number(v.budget)):DEFAULT_STATE.budget, transactions:Array.isArray(v?.transactions)?v.transactions.filter(Boolean):[], fixedCosts:Array.isArray(v?.fixedCosts)?v.fixedCosts.filter(Boolean):[], savings:{balance:Math.max(0,Number(v?.savings?.balance)||0),goal:Number.isFinite(Number(v?.savings?.goal))?Math.max(0,Number(v.savings.goal)):DEFAULT_STATE.savings.goal} }; }
function getCategory(id){ return CATEGORIES.find(c=>c.id===id) || CATEGORIES.find(c=>c.id==='other'); }
function transactionsForMonth(date){ return state.transactions.filter(t=>{ const d=parseLocalDate(t.date); return d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth(); }); }
function parseMoney(v){ return Math.max(0,Number(String(v??'').replace(/[^0-9]/g,''))||0); }
function moneyFieldFormatter(e){ const value=parseMoney(e.target.value); e.target.value=value?formatInputMoney(value):''; }
function formatInputMoney(v){ return Number(v||0).toLocaleString('ja-JP'); }
function yen(v){ return `¥${Math.round(Number(v)||0).toLocaleString('ja-JP')}`; }
function compactYen(v){ const n=Math.round(Number(v)||0); if(n>=1000000) return `¥${(n/10000).toFixed(n%10000?1:0)}万`; if(n>=10000) return `¥${(n/10000).toFixed(n%10000?1:0)}万`; return `¥${n.toLocaleString('ja-JP')}`; }
function signedYen(v){ const n=Math.round(Number(v)||0); return `${n>0?'+':n<0?'−':''}${yen(Math.abs(n))}`; }
function signedRemaining(v){ const n=Math.round(Number(v)||0); return n<0?`−${yen(Math.abs(n))}`:yen(n); }
function sum(list){ return list.reduce((a,b)=>a+(Number(b)||0),0); }
function sortNewest(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); }
function todayIso(){ return localIso(new Date()); }
function localIso(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
function parseLocalDate(s){ const [y,m,d]=String(s).split('-').map(Number); return new Date(y||1970,(m||1)-1,d||1); }
function startOfMonth(d){ return new Date(d.getFullYear(),d.getMonth(),1); }
function uid(){ return crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHtml(v){ return String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch])); }
function structuredCloneSafe(v){ return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v)); }
