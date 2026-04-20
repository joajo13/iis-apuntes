// Progress bar
(function(){
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

// Scroll-aware top nav: hide on scroll down, show on scroll up
(function(){
  const nav = document.querySelector('.top-nav');
  if (!nav) return;
  let lastY = window.scrollY;
  let ticking = false;
  const THRESHOLD = 6;
  const SHOW_ABOVE = 80;
  const onScroll = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) > THRESHOLD) {
      if (delta > 0 && y > SHOW_ABOVE) {
        nav.classList.add('nav-hidden');
      } else {
        nav.classList.remove('nav-hidden');
      }
      lastY = y;
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
})();

// Zoom overlay for diagrams / mermaid / charts
(function(){
  const ZOOM_STEP = 0.25;
  const ZOOM_MIN = 0.5;
  const ZOOM_MAX = 4;
  let overlay = null;
  let currentZoom = 1;

  const hintSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';

  const addHints = () => {
    document.querySelectorAll('.diagram, .mermaid, .chart-box').forEach(el => {
      if (el.querySelector('.zoom-hint')) return;
      const hint = document.createElement('span');
      hint.className = 'zoom-hint';
      hint.innerHTML = hintSVG;
      hint.setAttribute('aria-hidden', 'true');
      el.appendChild(hint);
    });
  };

  const setZoom = (z) => {
    currentZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
    if (!overlay) return;
    const content = overlay.querySelector('.zoom-content');
    if (content) content.style.setProperty('--zoom', currentZoom);
  };

  const closeZoom = () => {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.body.classList.remove('zoom-open');
    document.removeEventListener('keydown', onKey);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') closeZoom();
    else if (e.key === '+' || e.key === '=') setZoom(currentZoom + ZOOM_STEP);
    else if (e.key === '-' || e.key === '_') setZoom(currentZoom - ZOOM_STEP);
    else if (e.key === '0') setZoom(1);
  };

  const openZoom = (source) => {
    if (overlay) closeZoom();
    currentZoom = 1;
    overlay = document.createElement('div');
    overlay.className = 'zoom-overlay';
    overlay.innerHTML = `
      <div class="zoom-controls" role="toolbar" aria-label="Controles de zoom">
        <button type="button" class="zoom-btn" data-action="out" aria-label="Reducir">−</button>
        <button type="button" class="zoom-btn" data-action="reset" aria-label="Restablecer">⟲</button>
        <button type="button" class="zoom-btn" data-action="in" aria-label="Ampliar">+</button>
        <button type="button" class="zoom-btn" data-action="close" aria-label="Cerrar">×</button>
      </div>
      <div class="zoom-viewport"><div class="zoom-content" style="--zoom:1"></div></div>
    `;
    const content = overlay.querySelector('.zoom-content');
    const clone = source.cloneNode(true);
    clone.querySelectorAll('.zoom-hint').forEach(h => h.remove());
    // Replace live canvases (Chart.js) with static images so the cloned chart renders.
    const srcCanvases = source.querySelectorAll('canvas');
    const cloneCanvases = clone.querySelectorAll('canvas');
    srcCanvases.forEach((src, i) => {
      const target = cloneCanvases[i];
      if (!target) return;
      try {
        const img = document.createElement('img');
        img.src = src.toDataURL('image/png');
        img.alt = '';
        target.replaceWith(img);
      } catch (err) {
        // Leave the blank canvas if toDataURL fails (tainted).
      }
    });
    // Move children of the cloned wrapper into .zoom-content so we don't duplicate the border.
    while (clone.firstChild) content.appendChild(clone.firstChild);

    overlay.addEventListener('click', (e) => {
      const btn = e.target.closest('.zoom-btn');
      if (btn) {
        const action = btn.dataset.action;
        if (action === 'in') setZoom(currentZoom + ZOOM_STEP);
        else if (action === 'out') setZoom(currentZoom - ZOOM_STEP);
        else if (action === 'reset') setZoom(1);
        else if (action === 'close') closeZoom();
        return;
      }
      if (e.target === overlay || e.target.classList.contains('zoom-viewport')) {
        closeZoom();
      }
    });

    document.body.appendChild(overlay);
    document.body.classList.add('zoom-open');
    document.addEventListener('keydown', onKey);
  };

  // Initial hints + re-run after Mermaid renders
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addHints);
  } else {
    addHints();
  }
  window.addEventListener('load', () => setTimeout(addHints, 100));

  document.addEventListener('click', (e) => {
    const target = e.target.closest('.diagram, .mermaid, .chart-box');
    if (!target) return;
    // Ignore clicks inside overlays and on interactive controls inside diagrams
    if (e.target.closest('.zoom-overlay')) return;
    if (e.target.closest('a, button')) return;
    e.preventDefault();
    openZoom(target);
  });
})();

// Tabs + Quiz + Flashcards
document.addEventListener('click', e => {
  if (e.target.matches('.tab-btn') && e.target.dataset.tab) {
    const tabs = e.target.closest('.tabs');
    const key = e.target.dataset.tab;
    // Limitar a los botones/paneles directos de este grupo de tabs
    // (evita pisar sub-tabs como el filtro de flashcards que usa .tab-btn con data-ch).
    tabs.querySelectorAll(':scope > .tab-buttons > .tab-btn').forEach(b => b.classList.toggle('active', b === e.target));
    tabs.querySelectorAll(':scope > .tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === key));
  }
  // Quiz
  if (e.target.matches('.opt')) {
    const q = e.target.closest('.q');
    if (q.dataset.answered) return;
    q.dataset.answered = '1';
    const correct = e.target.dataset.correct === '1';
    e.target.classList.add(correct ? 'correct' : 'wrong');
    if (!correct) {
      q.querySelectorAll('.opt[data-correct="1"]').forEach(o => o.classList.add('correct'));
    }
    const ex = q.querySelector('.explain');
    if (ex) ex.classList.add('show');
  }
  // Flashcards
  if (e.target.closest('.flashcard')) {
    e.target.closest('.flashcard').classList.toggle('flipped');
  }
});

// Mermaid: render using textContent to avoid innerHTML --&gt; encoding bug
(async function renderMermaid() {
  if (typeof mermaid === 'undefined') return;
  const nodes = document.querySelectorAll('pre.mermaid');
  if (!nodes.length) return;
  const hintSVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const text = el.textContent.trim();
    if (!text) continue;
    try {
      const id = 'mg' + i + Date.now();
      const { svg } = await mermaid.render(id, text);
      el.innerHTML = svg;
      el.setAttribute('data-processed', 'true');
      if (!el.querySelector('.zoom-hint')) {
        const hint = document.createElement('span');
        hint.className = 'zoom-hint';
        hint.innerHTML = hintSVG;
        hint.setAttribute('aria-hidden', 'true');
        el.appendChild(hint);
      }
    } catch (e) {
      console.error('Mermaid render error:', e.message);
    }
  }
})();
