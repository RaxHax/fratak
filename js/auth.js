// Unified auth flows: sign-in, sign-up, and password recovery.
const SUPABASE_URL = 'https://sciexpfukbpoghqxjzct.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaWV4cGZ1a2Jwb2docXhqemN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTgwMzMsImV4cCI6MjA4Mjg3NDAzM30.aswM_hROvQAXukLHBK8jRYmzobwOVv1EEXCFd25edCg';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
  },
});

const tabs = Array.from(document.querySelectorAll('.auth-tab'));
const forms = {
  signin: document.getElementById('signin-form'),
  signup: document.getElementById('signup-form'),
  forgot: document.getElementById('forgot-form'),
  reset: document.getElementById('reset-form'),
};
const alertBox = document.getElementById('auth-alert');

const state = {
  mode: 'signin',
};

function setMode(mode) {
  state.mode = mode;
  Object.entries(forms).forEach(([key, form]) => {
    if (!form) return;
    form.classList.toggle('hidden', key !== mode);
  });

  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('bg-white/10', isActive);
    tab.classList.toggle('text-white', isActive);
    tab.classList.toggle('border', isActive);
    tab.classList.toggle('border-white/10', isActive);
    if (!isActive) {
      tab.classList.add('text-slate-400');
    } else {
      tab.classList.remove('text-slate-400');
    }
  });

  hideAlert();
}

function showAlert(type, message) {
  if (!alertBox) return;
  alertBox.classList.remove('hidden');
  alertBox.textContent = message;
  alertBox.classList.toggle('border-red-500/30', type === 'error');
  alertBox.classList.toggle('bg-red-500/10', type === 'error');
  alertBox.classList.toggle('text-red-300', type === 'error');
  alertBox.classList.toggle('border-green-500/30', type === 'success');
  alertBox.classList.toggle('bg-green-500/10', type === 'success');
  alertBox.classList.toggle('text-green-200', type === 'success');
}

function hideAlert() {
  if (!alertBox) return;
  alertBox.classList.add('hidden');
  alertBox.textContent = '';
}

function setFormLoading(form, isLoading) {
  if (!form) return;
  const button = form.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = isLoading;
  button.classList.toggle('opacity-60', isLoading);
}

function buildRedirectUrl() {
  if (window.location.origin && window.location.origin !== 'null') {
    return `${window.location.origin}/auth.html`;
  }
  return null;
}

async function initSessionGate() {
  const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
  const isRecovery = hashParams.get('type') === 'recovery' || hashParams.has('access_token');

  if (isRecovery) {
    setMode('reset');
    return;
  }

  const { data } = await supabaseClient.auth.getSession();
  if (data?.session) {
    window.location.href = 'dashboard.html';
  }
}

supabaseClient.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    setMode('reset');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });
  setMode('signin');
  initSessionGate();

  forms.signin?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();
    setFormLoading(forms.signin, true);

    const email = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      showAlert('error', error.message);
      setFormLoading(forms.signin, false);
      return;
    }

    window.location.href = 'dashboard.html';
  });

  forms.signup?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();
    setFormLoading(forms.signup, true);

    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const fullName = document.getElementById('signup-name').value.trim();

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : {},
      },
    });

    if (error) {
      showAlert('error', error.message);
      setFormLoading(forms.signup, false);
      return;
    }

    if (!data.session) {
      showAlert('success', 'Staðfestingarpóstur hefur verið sendur. Athugaðu pósthólfið þitt.');
      setFormLoading(forms.signup, false);
      return;
    }

    window.location.href = 'dashboard.html';
  });

  forms.forgot?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();
    setFormLoading(forms.forgot, true);

    const email = document.getElementById('forgot-email').value.trim();
    const redirectTo = buildRedirectUrl();

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
    if (error) {
      showAlert('error', error.message);
      setFormLoading(forms.forgot, false);
      return;
    }

    showAlert('success', 'Endurstillingarpóstur hefur verið sendur ef netfangið er til.');
    setFormLoading(forms.forgot, false);
  });

  forms.reset?.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideAlert();
    setFormLoading(forms.reset, true);

    const password = document.getElementById('reset-password').value;
    const confirm = document.getElementById('reset-password-confirm').value;

    if (password.length < 8) {
      showAlert('error', 'Lykilorð þarf að vera að minnsta kosti 8 stafir.');
      setFormLoading(forms.reset, false);
      return;
    }

    if (password !== confirm) {
      showAlert('error', 'Lykilorðin passa ekki.');
      setFormLoading(forms.reset, false);
      return;
    }

    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) {
      showAlert('error', error.message);
      setFormLoading(forms.reset, false);
      return;
    }

    showAlert('success', 'Lykilorð uppfært. Þú getur nú skráð þig inn.');
    setFormLoading(forms.reset, false);
    setMode('signin');
  });
});


