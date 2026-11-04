// Client-side JavaScript for Auth API Demo Portal
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const authStatus = document.getElementById('auth-status');
  const latencyDisplay = document.getElementById('kpi-latency');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('user-email')?.value;
      const password = document.getElementById('user-password')?.value;

      if (!email || !password) {
        if (authStatus) {
          authStatus.textContent = 'Please enter both email and password.';
          authStatus.style.color = '#f87171';
        }
        return;
      }

      try {
        const startTime = performance.now();
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const elapsed = Math.round(performance.now() - startTime);
        if (latencyDisplay) latencyDisplay.textContent = `${elapsed}ms`;

        const data = await res.json();
        if (data.token) {
          if (authStatus) {
            authStatus.textContent = 'Authentication successful! Token saved.';
            authStatus.style.color = '#34d399';
          }
        } else {
          if (authStatus) {
            authStatus.textContent = data.error || 'Authentication rejected.';
            authStatus.style.color = '#f87171';
          }
        }
      } catch (err) {
        if (authStatus) {
          authStatus.textContent = `Network error: ${err.message}`;
          authStatus.style.color = '#f87171';
        }
      }
    });
  }
});
