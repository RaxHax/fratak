function bindAccountForm() {
  if (!els.accountForm) return;

  els.accountForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.user) return;

    const payload = {
      user_id: state.user.id,
      bank_name: els.accountBank.value.trim(),
      account_name: els.accountName.value.trim() || null,
      type: els.accountType.value,
      balance: Number(els.accountBalance.value || 0),
      interest_rate: Number(els.accountRate.value || 0),
    };

    if (els.accountId.value) {
      await supabaseClient.from('accounts').update(payload).eq('id', els.accountId.value);
    } else {
      await supabaseClient.from('accounts').insert(payload);
    }

    resetAccountForm();
    await loadAccounts();
    renderAccounts();
    if (typeof renderSummary === 'function') {
      renderSummary();
    }
  });

  els.accountCancel?.addEventListener('click', () => resetAccountForm());

  els.accountsList?.addEventListener('click', async (event) => {
    const actionBtn = event.target.closest('button[data-action]');
    if (!actionBtn) return;

    const accountId = actionBtn.dataset.id;
    if (actionBtn.dataset.action === 'edit') {
      const account = state.accounts.find((item) => item.id === accountId);
      if (account) fillAccountForm(account);
      return;
    }

    if (actionBtn.dataset.action === 'delete') {
      await supabaseClient.from('accounts').delete().eq('id', accountId);
      await loadAccounts();
      renderAccounts();
      if (typeof renderSummary === 'function') {
        renderSummary();
      }
    }
  });
}

function resetAccountForm() {
  if (!els.accountForm) return;
  els.accountId.value = '';
  els.accountForm.reset();
}

function fillAccountForm(account) {
  els.accountId.value = account.id;
  els.accountBank.value = account.bank_name || '';
  els.accountName.value = account.account_name || '';
  els.accountType.value = account.type || 'savings';
  els.accountBalance.value = account.balance || 0;
  els.accountRate.value = account.interest_rate || 0;
}

function renderAccounts() {
  if (els.accountsCount) {
    els.accountsCount.textContent = formatCount(state.accounts.length, 'reikningur', 'reikningar');
  }

  if (!els.accountsList) return;

  if (!state.accounts.length) {
    els.accountsList.innerHTML = '<div class="text-sm text-slate-500">Engir reikningar skráðir ennþá.</div>';
    renderAccountOptions();
    return;
  }

  els.accountsList.innerHTML = state.accounts.map((account) => {
    const typeLabels = {
      savings: 'Sparnaður',
      checking: 'Veltureikningur',
      loan: 'Lán',
      investment: 'Fjárfesting',
    };
    const typeLabel = typeLabels[account.type] || 'Reikningur';
    const rate = Number(account.interest_rate || 0);
    const rateLabel = rate ? `${rate.toFixed(2)}% vextir` : 'Vextir óskráðir';
    const balanceClass = account.type === 'loan' ? 'text-red-300' : 'text-slate-200';
    return `
      <div class="ft-card p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
        <div>
          <p class="text-sm font-bold text-white">${account.bank_name}</p>
          <p class="text-xs text-slate-500">${account.account_name || 'Reikningur'}</p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span class="px-2 py-1 rounded-full bg-white/5 text-[10px] uppercase tracking-wider text-slate-300">${typeLabel}</span>
            <span class="px-2 py-1 rounded-full bg-white/5 text-[10px] uppercase tracking-wider text-slate-400">${rateLabel}</span>
          </div>
          <p class="text-sm ${balanceClass} mt-3">${formatCurrency(account.balance || 0)}</p>
        </div>
        <div class="flex flex-col gap-2">
          <button data-action="edit" data-id="${account.id}" class="px-3 py-1.5 rounded-full text-xs uppercase tracking-wider bg-white/5 text-white">Breyta</button>
          <button data-action="delete" data-id="${account.id}" class="px-3 py-1.5 rounded-full text-xs uppercase tracking-wider bg-red-500/10 text-red-200">Eyða</button>
        </div>
      </div>
    `;
  }).join('');
  renderAccountOptions();
}

document.addEventListener('DOMContentLoaded', async () => {
  bindNavigation();
  bindLogout();
  bindAccountForm();
  els.refreshBtn?.addEventListener('click', async () => {
    await loadAccounts();
    renderAccounts();
    updateLastSync();
  });

  const hasSession = await loadSession();
  if (!hasSession) return;
  await loadUserDetails();
  await loadAccounts();
  renderUserProfile();
  renderAccounts();
  updateLastSync();
});
