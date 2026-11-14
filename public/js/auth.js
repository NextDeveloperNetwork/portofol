document.addEventListener('DOMContentLoaded', () => {
  // If already logged in and token valid, redirect to /admin
  const token = localStorage.getItem('pewallet_token');
  if (token) {
    fetch('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => {
      if (res.ok) window.location.href = '/admin';
    }).catch(() => {});
  }

  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }
});

function fillDemoCredentials() {
  document.getElementById('username').value = 'admin';
  document.getElementById('password').value = 'admin123';
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');

  if (!username || !password) {
    showToast('Please enter both username and password', 'error');
    return;
  }

  try {
    submitBtn.disabled = true;
    btnText.textContent = 'Verifying...';

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    localStorage.setItem('pewallet_token', data.token);
    localStorage.setItem('pewallet_user', data.username);
    showToast('Vault unlocked successfully! Redirecting...', 'success');

    setTimeout(() => {
      window.location.href = '/admin';
    }, 800);
  } catch (err) {
    showToast(err.message, 'error');
    submitBtn.disabled = false;
    btnText.textContent = 'Unlock Wallet';
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

