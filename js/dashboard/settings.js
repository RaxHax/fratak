function bindSettingsForm() {
  if (!els.settingsForm) return;

  els.settingsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.user) return;

    const metadata = {
      ...(state.userDetails?.metadata || {}),
      savings_target: Number(els.settingsTarget.value || 0),
      currency: els.settingsCurrency.value,
    };

    const payload = {
      id: state.user.id,
      full_name: els.settingsName.value.trim() || null,
      metadata,
    };

    await supabaseClient.from('user_details').upsert(payload, { onConflict: 'id' });
    await loadUserDetails();
    renderUserProfile();
    if (typeof renderSummary === 'function') {
      renderSummary();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindNavigation();
  bindLogout();
  bindSettingsForm();
  els.refreshBtn?.addEventListener('click', async () => {
    await loadUserDetails();
    renderUserProfile();
    updateLastSync();
  });

  const hasSession = await loadSession();
  if (!hasSession) return;
  await loadUserDetails();
  renderUserProfile();
  updateLastSync();
});
