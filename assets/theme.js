(() => {
  const STORAGE_KEY = 'iis-theme';
  const root = document.documentElement;

  const getSaved = () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  };
  const save = (t) => { try { localStorage.setItem(STORAGE_KEY, t); } catch {} };

  const systemPrefersLight = () =>
    window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;

  const initial = getSaved() || (systemPrefersLight() ? 'light' : 'dark');
  root.setAttribute('data-theme', initial);

  const icon = (t) => t === 'light'
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  const label = (t) => t === 'light' ? 'OSCURO' : 'CLARO';

  const makeBtn = () => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'theme-toggle';
    b.setAttribute('aria-label', 'Cambiar tema');
    b.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      save(next);
      render(b, next);
    });
    return b;
  };

  const render = (btn, t) => {
    btn.innerHTML = `${icon(t)}<span>${label(t)}</span>`;
  };

  const mount = () => {
    const current = root.getAttribute('data-theme');
    const btn = makeBtn();
    render(btn, current);

    const nav = document.querySelector('.top-nav .nav-links');
    if (nav) {
      nav.appendChild(btn);
    } else {
      btn.classList.add('theme-toggle--floating');
      document.body.appendChild(btn);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
