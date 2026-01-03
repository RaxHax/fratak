function bindOverviewActions() {
  els.refreshBtn?.addEventListener('click', async () => {
    await reloadData();
  });

  els.uploadFocusBtn?.addEventListener('click', () => {
    const panel = document.getElementById('upload-panel');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  els.aiReviewClose?.addEventListener('click', () => {
    if (els.aiReview) els.aiReview.classList.add('hidden');
  });
}

function bindUpload() {
  if (!els.statementDrop || !els.statementFile) return;

  els.statementDrop.addEventListener('click', () => els.statementFile.click());
  els.statementBrowse?.addEventListener('click', (event) => {
    event.stopPropagation();
    els.statementFile.click();
  });

  els.statementDrop.addEventListener('dragover', (event) => {
    event.preventDefault();
    els.statementDrop.classList.add('border-brand-neon');
  });

  els.statementDrop.addEventListener('dragleave', () => {
    els.statementDrop.classList.remove('border-brand-neon');
  });

  els.statementDrop.addEventListener('drop', (event) => {
    event.preventDefault();
    els.statementDrop.classList.remove('border-brand-neon');
    const file = event.dataTransfer.files[0];
    if (file) handleStatementUpload(file);
  });

  els.statementFile.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) handleStatementUpload(file);
  });
}

function bindReviewUpdates() {
  els.aiReviewTable?.addEventListener('change', async (event) => {
    const select = event.target.closest('select[data-transaction-id]');
    if (!select) return;

    const transactionId = select.dataset.transactionId;
    const categoryId = select.value;

    await supabaseClient
      .from('transactions')
      .update({ category_id: categoryId, is_verified: true })
      .eq('id', transactionId);

    await loadTransactions();
    renderTransactions();
    updateCharts();
    renderInsights();
  });
}

async function reloadData() {
  await loadAccounts();
  await loadTransactions();
  renderOverview();
  updateLastSync();
}

function renderSummary() {
  const totalBalance = state.accounts.reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const { spend, income } = getMonthlyTotals(30);
  const target = state.userDetails?.metadata?.savings_target || 12000000;
  const progress = target ? Math.min(100, Math.round((totalBalance / target) * 100)) : 0; // Fixed multiplier

  if (els.summaryBalance) {
    // animate ticker
    if (window.updateNumberTicker) {
      window.updateNumberTicker('summary-balance', totalBalance);
    } else {
      els.summaryBalance.textContent = formatCurrency(totalBalance);
    }
  }

  // Note: summaryBalanceSub was removed in new layout

  if (els.summarySpend) els.summarySpend.textContent = formatCurrency(spend);
  if (els.summaryIncome) els.summaryIncome.textContent = `${formatCurrency(income)} innstreymi`; // Might not exist
  if (els.summaryTarget) els.summaryTarget.textContent = formatCurrency(totalBalance); // Current Saved

  // Update target progress bar
  if (els.summaryTargetProgress) {
    els.summaryTargetProgress.style.width = `${progress}%`;
  }

  // Update target percentage text
  if (els.summaryTargetPercentage) {
    els.summaryTargetPercentage.textContent = `${progress}%`;
  }
}

function renderInsights() {
  const totals = getCategorySpendTotals(30);
  const entries = Array.from(totals.entries());
  entries.sort((a, b) => b[1] - a[1]);

  const [topCategoryName, topAmount] = entries[0] || [];
  const categoryMeta = state.categories.find((category) => category.name === topCategoryName);
  const categoryLabel = topCategoryName
    ? `${categoryMeta?.icon ? `${categoryMeta.icon} ` : ''}${topCategoryName}`
    : 'Engin gögn';

  const pendingCount = state.transactions.filter((tx) => !tx.is_verified).length;
  const verifiedPercent = state.transactions.length
    ? Math.round(((state.transactions.length - pendingCount) / state.transactions.length) * 100)
    : 0;

  if (els.insightCategory) els.insightCategory.textContent = categoryLabel;
  if (els.insightCategoryAmount) {
    els.insightCategoryAmount.textContent = entries.length ? formatCurrency(topAmount) : '-';
  }
  if (els.insightPending) els.insightPending.textContent = pendingCount;
  if (els.insightVerifiedLabel) els.insightVerifiedLabel.textContent = `${verifiedPercent}%`;
  if (els.insightVerifiedProgress) els.insightVerifiedProgress.style.width = `${verifiedPercent}%`;
}

function renderTransactions() {
  const rows = state.transactions.slice(0, 8); // Keep 8 for now
  if (els.transactionsCount) {
    els.transactionsCount.textContent = formatCount(state.transactions.length, 'færsla', 'færslur');
  }

  // Support for new Bento List
  if (els.recentTransactionsList) {
    if (!rows.length) {
      els.recentTransactionsList.innerHTML = '<div class="p-4 text-center text-xs text-slate-500">Engar færslur ennþá.</div>';
      return;
    }

    els.recentTransactionsList.innerHTML = rows.map((tx) => {
      const categoryData = tx.categories || getCategoryById(tx.category_id);
      const categoryName = categoryData?.name || 'Annað';
      // const categoryIcon = categoryData?.icon || '•';
      const amountValue = Number(tx.amount || 0);
      const isNegative = amountValue < 0;
      const amountClass = isNegative ? 'text-white' : 'text-brand-green';
      const amountPrefix = isNegative ? '' : '+'; // Negative sign is usually in number

      return `
          <div class="p-3 rounded-lg hover:bg-white/5 transition group flex items-center justify-between cursor-pointer">
             <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full ${isNegative ? 'bg-white/5 text-slate-400' : 'bg-brand-green/10 text-brand-green'} flex items-center justify-center text-xs">
                   ${categoryData?.icon || (isNegative ? '↓' : '↑')}
                </div>
                <div>
                   <p class="text-sm font-semibold text-white leading-none">${tx.merchant_clean || tx.merchant_original}</p>
                   <p class="text-[10px] text-slate-500 mt-1">${formatDate(tx.date)} • ${categoryName}</p>
                </div>
             </div>
             <p class="text-sm font-bold ${amountClass}">${amountPrefix}${formatCurrency(amountValue).replace(' kr.', '')}</p>
          </div>
        `;
    }).join('');

    return;
  }

  // Fallback for old table (if element still existed, though we changed it in shared)
  if (els.recentTransactions) {
    // ... (Legacy code omitted for brevity as we are moving to list)
  }
}

function renderReviewTable(rows) {
  if (!els.aiReviewTable) return;

  if (!rows.length) {
    els.aiReviewTable.innerHTML = '<tr><td colspan="4" class="py-4 text-center text-slate-500">Engar færslur til yfirferðar.</td></tr>';
    return;
  }

  const categoryOptions = state.categories.map((category) => {
    const label = category.icon ? `${category.icon} ${category.name}` : category.name;
    return `<option value="${category.id}">${label}</option>`;
  }).join('');

  els.aiReviewTable.innerHTML = rows.map((tx) => {
    const amountValue = Number(tx.amount || 0);
    const amountClass = amountValue < 0 ? 'text-red-300' : 'text-green-300';
    const amountPrefix = amountValue < 0 ? '-' : '+';
    return `
      <tr>
        <td class="py-3">${formatDate(tx.date)}</td>
        <td class="py-3">${tx.merchant_clean || tx.merchant_original}</td>
        <td class="py-3">
          <select data-transaction-id="${tx.id}" class="ft-input px-3 py-2 rounded-lg text-xs">
            ${categoryOptions}
          </select>
        </td>
        <td class="py-3 text-right ${amountClass}">${amountPrefix}${formatCurrency(Math.abs(amountValue))}</td>
      </tr>
    `;
  }).join('');

  rows.forEach((tx) => {
    const select = els.aiReviewTable.querySelector(`select[data-transaction-id="${tx.id}"]`);
    if (select) select.value = tx.category_id || '';
  });
}

function updateCharts() {
  // Existing charts
  if (els.spendingChart) {
    const spendData = buildCategorySpend();
    if (!state.charts.spending) {
      state.charts.spending = new Chart(els.spendingChart.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: spendData.labels,
          datasets: [{
            data: spendData.values,
            backgroundColor: spendData.colors,
            borderWidth: 0,
          }],
        },
        options: {
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', boxWidth: 10, font: { size: 10 } } },
          },
          cutout: '70%',
        },
      });
    } else {
      state.charts.spending.data = { labels: spendData.labels, datasets: [{ data: spendData.values, backgroundColor: spendData.colors, borderWidth: 0 }] };
      state.charts.spending.update();
    }
  }

  // Net Worth Sparkline (New)
  if (els.netWorthChart) {
    // Mock data for sparkline - in real app would come from historical balance
    const sparkLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const sparkData = [1000000, 1100000, 1050000, 1200000, 1250000, 1350000];

    if (!state.charts.netWorth) {
      state.charts.netWorth = new Chart(els.netWorthChart.getContext('2d'), {
        type: 'line',
        data: {
          labels: sparkLabels,
          datasets: [{
            data: sparkData,
            borderColor: '#4ade80', // brand-green
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 0,
            fill: true,
            backgroundColor: (context) => {
              const ctx = context.chart.ctx;
              const gradient = ctx.createLinearGradient(0, 0, 0, 100);
              gradient.addColorStop(0, 'rgba(74, 222, 128, 0.2)');
              gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
              return gradient;
            }
          }]
        },
        options: {
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { enabled: false } },
          scales: { x: { display: false }, y: { display: false } }
        }
      });
    }
  }
}

function getMonthlyTotals(daysBack) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const recent = state.transactions.filter((tx) => {
    const date = new Date(tx.date);
    return date >= cutoff;
  });

  const hasNegative = recent.some((tx) => Number(tx.amount) < 0);
  let spend = 0;
  let income = 0;

  recent.forEach((tx) => {
    const amount = Number(tx.amount || 0);
    if (amount < 0) {
      spend += Math.abs(amount);
    } else if (amount > 0) {
      if (hasNegative) {
        income += amount;
      } else {
        spend += amount;
      }
    }
  });

  return { spend, income };
}

function getCategorySpendTotals(daysBack) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);

  const totals = new Map();
  const hasNegative = state.transactions.some((tx) => Number(tx.amount) < 0);

  state.transactions.forEach((tx) => {
    const date = new Date(tx.date);
    if (date < cutoff) return;

    const amount = Number(tx.amount || 0);
    const isSpend = hasNegative ? amount < 0 : amount > 0;
    if (!isSpend) return;

    const category = tx.categories?.name || getCategoryById(tx.category_id)?.name || 'Annað';
    const prev = totals.get(category) || 0;
    totals.set(category, prev + Math.abs(amount));
  });

  return totals;
}

function buildCategorySpend() {
  const totals = getCategorySpendTotals(30);
  const labels = Array.from(totals.keys());
  const values = Array.from(totals.values());
  const colors = labels.map((label) => {
    const match = state.categories.find((category) => category.name === label);
    return match?.color || '#64748b';
  });

  if (!labels.length) {
    return { labels: ['Engin gögn'], values: [1], colors: ['#1e293b'] };
  }

  return { labels, values, colors };
}

function buildMonthlyCashflow() {
  const labels = [];
  const values = [];
  const now = new Date();
  const hasNegative = state.transactions.some((tx) => Number(tx.amount) < 0);

  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = date.toLocaleDateString('is-IS', { month: 'short' });
    labels.push(monthLabel);

    const monthTransactions = state.transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      return txDate.getFullYear() === date.getFullYear() && txDate.getMonth() === date.getMonth();
    });

    let net = 0;
    monthTransactions.forEach((tx) => {
      const amount = Number(tx.amount || 0);
      if (hasNegative) {
        net += amount;
      } else {
        net -= amount;
      }
    });

    values.push(net);
  }

  return { labels, values };
}

function renderOverview() {
  renderUserProfile();
  renderSummary();
  renderInsights();
  renderTransactions();
  renderAccountOptions();
  updateCharts();
}

async function handleStatementUpload(file) {
  if (!file || !state.user) return;

  els.statementProgress?.classList.remove('hidden');
  if (els.statementProgressText) els.statementProgressText.textContent = 'Hleður upp skjali...';
  if (els.statementProgressBar) els.statementProgressBar.style.width = '15%';
  if (els.statementResult) els.statementResult.classList.add('hidden');

  const fileBase64 = await readFileBase64(file);
  if (els.statementFile) els.statementFile.value = '';
  if (!fileBase64) {
    showUploadError('Gat ekki lesið skjalið.');
    return;
  }

  if (els.statementProgressText) els.statementProgressText.textContent = 'Greinir með AI...';
  if (els.statementProgressBar) els.statementProgressBar.style.width = '55%';

  const { data, error } = await supabaseClient.functions.invoke('process-bank-statement', {
    body: {
      fileBase64,
      accountId: els.statementAccount?.value || null,
    },
  });

  if (error) {
    showUploadError(error.message || 'Villa við greiningu.');
    return;
  }

  const processed = data?.processed || 0;
  const transactions = data?.transactions || [];
  state.uploadResults = transactions;

  if (els.statementProgressBar) els.statementProgressBar.style.width = '100%';
  if (els.statementProgressText) els.statementProgressText.textContent = 'Lokað';

  if (els.statementResult) {
    els.statementResult.classList.remove('hidden');
    els.statementResult.textContent = `Greind ${formatCount(processed, 'færsla', 'færslur')}`;
  }

  if (els.aiReview) {
    els.aiReview.classList.remove('hidden');
    renderReviewTable(transactions);
  }

  await loadTransactions();
  renderTransactions();
  updateCharts();
  renderInsights();
}

function showUploadError(message) {
  if (els.statementProgressText) els.statementProgressText.textContent = message;
  if (els.statementProgressBar) els.statementProgressBar.style.width = '0%';
}

function readFileBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      resolve(typeof result === 'string' ? result.split(',')[1] : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindNavigation();
  bindLogout();
  bindOverviewActions();
  bindUpload();
  bindReviewUpdates();

  const hasSession = await loadSession();
  if (!hasSession) return;
  await loadCategories();
  await loadUserDetails();
  await loadAccounts();
  await loadTransactions();
  renderOverview();
  updateLastSync();
});
