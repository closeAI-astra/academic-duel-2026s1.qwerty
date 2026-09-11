(() => {
  'use strict';

  const SESSION_KEY = 'academia-access-v1';
  const PASSWORD_SHA256 = 'dd1e19f0e0150bae18180618d40c505d899389bf1f8a421582b12df819d9b0a6';

  const getSession = () => {
    try { return sessionStorage.getItem(SESSION_KEY) || ''; }
    catch { return ''; }
  };
  const setSession = value => {
    try { sessionStorage.setItem(SESSION_KEY, value); } catch {}
  };

  if (getSession() === PASSWORD_SHA256) return;

  document.documentElement.classList.add('academia-access-locked');

  async function sha256(value) {
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
      const bytes = new TextEncoder().encode(value);
      const result = await crypto.subtle.digest('SHA-256', bytes);
      return [...new Uint8Array(result)].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    // Compatibility fallback. GitHub Pages is static, so this is only an access gate,
    // not a substitute for server-side authentication.
    return value === 'AINA' ? PASSWORD_SHA256 : '';
  }

  function unlock(root) {
    setSession(PASSWORD_SHA256);
    document.documentElement.classList.remove('academia-access-locked');
    root?.remove();
    document.dispatchEvent(new CustomEvent('academia-access-granted'));
  }

  function mount() {
    if (getSession() === PASSWORD_SHA256) {
      document.documentElement.classList.remove('academia-access-locked');
      return;
    }

    const root = document.createElement('div');
    root.id = 'academia-access-gate';
    root.innerHTML = `
      <form class="academia-login-card" autocomplete="off">
        <div class="academia-login-mark">✦</div>
        <p class="academia-login-kicker">ACADEMIC DUEL · ACCESS</p>
        <h1>学歴召喚</h1>
        <p class="academia-login-copy">パスワードを入力してください。</p>
        <label>
          <span>PASSWORD</span>
          <input id="academia-access-password" type="password"
                 autocomplete="current-password" autocapitalize="characters"
                 spellcheck="false" enterkeyhint="go">
        </label>
        <button type="submit">ログイン</button>
        <p id="academia-access-error" class="academia-login-error" aria-live="polite"></p>
      </form>`;
    document.body.append(root);

    const form = root.querySelector('form');
    const input = root.querySelector('#academia-access-password');
    const error = root.querySelector('#academia-access-error');

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const value = input.value.trim();
      const digest = await sha256(value);
      if (digest === PASSWORD_SHA256) {
        unlock(root);
      } else {
        error.textContent = 'パスワードが違います。';
        input.value = '';
        input.focus();
      }
    });

    requestAnimationFrame(() => input.focus());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
