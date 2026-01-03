// Shared dashboard helpers for auth, navigation, and data loading.
const SUPABASE_URL = 'https://sciexpfukbpoghqxjzct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWV4cGZ1a2Jwb2docXhqemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTgwMzMsImV4cCI6MjA4Mjg3NDAzM30.aswM_hROvQAXukLHBK8jRYmzobwOVv1EEXCFd25edCg';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  user: null,
  userDetails: null,
  categories: [],
  accounts: [],
  transactions: [],
  charts: {},
  uploadResults: [],
  calculatorPrefilled: false,
};

const els = {
  sidebar: document.getElementById('sidebar'),
  mobileOverlay: document.getElementById('mobile-overlay'),
  mobileToggle: document.getElementById('mobile-nav-toggle'),
  sidebarClose: document.getElementById('close-sidebar'),
  navButtons: Array.from(document.querySelectorAll('[data-nav]')),
  refreshBtn: document.getElementById('refresh-data'),
  uploadFocusBtn: document.getElementById('open-upload'),
  logoutBtn: document.getElementById('logout-btn'),
  lastSyncText: document.getElementById('last-sync-text'),
  greetingName: document.getElementById('user-greeting-name'),
  sidebarUserName: document.getElementById('sidebar-user-name'),
  sidebarUserEmail: document.getElementById('sidebar-user-email'),
  summaryBalance: document.getElementById('summary-balance'),
  summaryBalanceSub: document.getElementById('summary-balance-sub'), // Deprecated but kept for safety
  summarySpend: document.getElementById('summary-spend'), // Might be removed in new layout
  summaryIncome: document.getElementById('summary-income'), // Might be removed
  summaryTarget: document.getElementById('summary-target'),
  summaryTargetProgress: document.getElementById('summary-target-progress'),
  summaryTargetPercentage: document.getElementById('summary-target-percentage'), // New
  insightCategory: document.getElementById('insight-category'),
  insightCategoryAmount: document.getElementById('insight-category-amount'),
  insightPending: document.getElementById('insight-pending'),
  insightVerifiedLabel: document.getElementById('insight-verified-label'),
  insightVerifiedProgress: document.getElementById('insight-verified-progress'),
  transactionsCount: document.getElementById('transactions-count'),
  recentTransactionsList: document.getElementById('recent-transactions-list'), // New ID
  netWorthChart: document.getElementById('net-worth-chart'), // New Chart
  spendingChart: document.getElementById('spending-chart'),
  cashflowChart: document.getElementById('cashflow-chart'),
  spendingChart: document.getElementById('spending-chart'),
  cashflowChart: document.getElementById('cashflow-chart'),
  statementDrop: document.getElementById('statement-drop'),
  statementFile: document.getElementById('statement-file'),
  statementBrowse: document.getElementById('statement-browse'),
  statementAccount: document.getElementById('statement-account'),
  statementProgress: document.getElementById('statement-progress'),
  statementProgressBar: document.getElementById('statement-progress-bar'),
  statementProgressText: document.getElementById('statement-progress-text'),
  statementResult: document.getElementById('statement-result'),
  aiReview: document.getElementById('ai-review'),
  aiReviewClose: document.getElementById('ai-review-close'),
  aiReviewTable: document.getElementById('ai-review-table'),
  accountForm: document.getElementById('account-form'),
  accountId: document.getElementById('account-id'),
  accountBank: document.getElementById('account-bank'),
  accountName: document.getElementById('account-name'),
  accountType: document.getElementById('account-type'),
  accountBalance: document.getElementById('account-balance'),
  accountRate: document.getElementById('account-rate'),
  accountCancel: document.getElementById('account-cancel'),
  accountsList: document.getElementById('accounts-list'),
  accountsCount: document.getElementById('accounts-count'),
  settingsForm: document.getElementById('settings-form'),
  settingsName: document.getElementById('settings-name'),
  settingsEmail: document.getElementById('settings-email'),
  settingsTarget: document.getElementById('settings-target'),
  settingsCurrency: document.getElementById('settings-currency'),
};

const currencyFormatter = new Intl.NumberFormat('is-IS', { maximumFractionDigits: 0 });

function formatCurrency(value) {
  return `${currencyFormatter.format(Math.round(value))} kr.`;
}

function formatCount(value, singular, plural) {
  const count = Number(value || 0);
  return `${count} ${count === 1 ? singular : plural}`;
}

function updateLastSync(timestamp = new Date()) {
  if (!els.lastSyncText) return;
  const timeLabel = timestamp.toLocaleTimeString('is-IS', {
    hour: '2-digit',
    minute: '2-digit',
  });
  els.lastSyncText.textContent = `Uppfært: ${timeLabel}`;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('is-IS');
}

function getCategoryById(categoryId) {
  return state.categories.find((category) => category.id === categoryId);
}

function getActiveNavKey() {
  const file = window.location.pathname.split('/').pop() || 'dashboard.html';
  const lookup = {
    'dashboard.html': 'overview',
    'dashboard-overview.html': 'overview',
    'dashboard-accounts.html': 'accounts',
    'dashboard-calculator.html': 'calculator',
    'dashboard-settings.html': 'settings',
  };
  return lookup[file] || 'overview';
}

function setActiveNav() {
  const activeKey = getActiveNavKey();
  els.navButtons.forEach((btn) => {
    const isActive = btn.dataset.nav === activeKey;
    btn.classList.toggle('bg-white/10', isActive);
    btn.classList.toggle('text-white', isActive);
    btn.classList.toggle('border', isActive);
    btn.classList.toggle('border-white/10', isActive);
    btn.classList.toggle('text-slate-400', !isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });
}

function openSidebar() {
  if (!els.sidebar) return;
  els.sidebar.classList.remove('-translate-x-full');
  if (els.mobileOverlay) els.mobileOverlay.classList.remove('hidden');
}

function closeSidebar() {
  if (!els.sidebar) return;
  if (!window.matchMedia('(min-width: 768px)').matches) {
    els.sidebar.classList.add('-translate-x-full');
    if (els.mobileOverlay) els.mobileOverlay.classList.add('hidden');
  }
}

function bindNavigation() {
  setActiveNav();

  els.navButtons.forEach((btn) => {
    btn.addEventListener('click', () => closeSidebar());
  });

  els.mobileToggle?.addEventListener('click', openSidebar);
  els.sidebarClose?.addEventListener('click', closeSidebar);
  els.mobileOverlay?.addEventListener('click', closeSidebar);
}

function bindLogout() {
  els.logoutBtn?.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();
    window.location.href = 'auth.html';
  });
}

async function loadSession() {
  const { data } = await supabaseClient.auth.getSession();
  if (!data?.session) {
    window.location.href = 'auth.html';
    return false;
  }
  state.user = data.session.user;
  return true;
}

async function loadUserDetails() {
  if (!state.user) return;
  const { data, error } = await supabaseClient
    .from('user_details')
    .select('*')
    .eq('id', state.user.id)
    .maybeSingle();

  if (!data && !error) {
    const initial = {
      id: state.user.id,
      full_name: state.user.user_metadata?.full_name || null,
      metadata: {
        savings_target: 12000000,
        currency: 'ISK',
      },
    };
    await supabaseClient.from('user_details').insert(initial);
    state.userDetails = initial;
    return;
  }

  state.userDetails = data || null;
}

async function loadCategories() {
  const { data } = await supabaseClient.from('categories').select('*');
  state.categories = data || [];
}

async function loadAccounts() {
  if (!state.user) return;
  const { data } = await supabaseClient
    .from('accounts')
    .select('*')
    .eq('user_id', state.user.id)
    .order('created_at', { ascending: false });

  state.accounts = data || [];
}

async function loadTransactions() {
  if (!state.user) return;
  const { data } = await supabaseClient
    .from('transactions')
    .select('id, date, merchant_original, merchant_clean, amount, category_id, is_verified, categories(name, color, icon)')
    .eq('user_id', state.user.id)
    .order('date', { ascending: false })
    .limit(200);

  state.transactions = data || [];
}

function renderUserProfile() {
  const displayName = state.userDetails?.full_name
    || state.user?.user_metadata?.full_name
    || state.user?.email?.split('@')[0]
    || 'Notandi';

  if (els.greetingName) els.greetingName.textContent = displayName;
  if (els.sidebarUserName) els.sidebarUserName.textContent = displayName;
  if (els.sidebarUserEmail) els.sidebarUserEmail.textContent = state.user?.email || '';

  if (els.settingsName) els.settingsName.value = state.userDetails?.full_name || '';
  if (els.settingsEmail) els.settingsEmail.value = state.user?.email || '';
  if (els.settingsTarget) {
    const target = state.userDetails?.metadata?.savings_target || 12000000;
    els.settingsTarget.value = target;
  }
  if (els.settingsCurrency) {
    els.settingsCurrency.value = state.userDetails?.metadata?.currency || 'ISK';
  }
}

function renderAccountOptions() {
  if (!els.statementAccount) return;
  const current = els.statementAccount.value;
  const options = ['<option value="">Enginn reikningur</option>'];
  const typeLabels = {
    savings: 'Sparnaður',
    checking: 'Veltureikningur',
    loan: 'Lán',
    investment: 'Fjárfesting',
  };
  state.accounts.forEach((account) => {
    const typeLabel = typeLabels[account.type] || account.type || 'Reikningur';
    const accountLabel = account.account_name ? `${account.account_name} - ${typeLabel}` : typeLabel;
    options.push(`<option value="${account.id}">${account.bank_name} - ${accountLabel}</option>`);
  });
  els.statementAccount.innerHTML = options.join('');
  if (current) els.statementAccount.value = current;
}
