// Lógica de la zona de práctica: examen, por capítulo, flashcards, T/F.
(function(){
  const LS_KEY = 'iis-practica-v1';
  const CHAPTERS = [
    {n:1, t:"Introducción"},
    {n:2, t:"Ciclos de vida"},
    {n:3, t:"Metodologías ágiles"},
    {n:4, t:"Extracción de requerimientos"},
    {n:5, t:"Procesos de negocio"},
    {n:6, t:"Requerimientos"},
    {n:7, t:"Especificación (SRS)"}
  ];

  const state = {
    exam: null,
    tf: null
  };

  const load = () => JSON.parse(localStorage.getItem(LS_KEY) || '{"exam":[],"chapter":{}}');
  const save = (d) => localStorage.setItem(LS_KEY, JSON.stringify(d));

  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const fmtTime = s => {
    const m = Math.floor(s/60), sec = s%60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  // ===== Stats =====
  function refreshStats(){
    const data = load();
    const ex = data.exam || [];
    const best = ex.length ? Math.max(...ex.map(r => r.pct)) : null;
    const last = ex.length ? ex[ex.length-1].pct : null;
    const avg = ex.length ? Math.round(ex.reduce((a,r)=>a+r.pct,0)/ex.length) : null;
    document.getElementById('stat-best').textContent = best!==null ? best+'%' : '—';
    document.getElementById('stat-last').textContent = last!==null ? last+'%' : '—';
    document.getElementById('stat-avg').textContent = avg!==null ? avg+'%' : '—';
    document.getElementById('stat-attempts').textContent = ex.length;
  }

  // ===== Examen =====
  function startExam(){
    const count = parseInt(document.getElementById('exam-count').value);
    const time = parseInt(document.getElementById('exam-time').value);
    const picked = shuffle(window.IIS_QUESTIONS).slice(0, count).map(q => ({
      ...q,
      opts: shuffle(q.opts),
      answered: null
    }));
    state.exam = { qs: picked, idx: 0, time, remaining: time, timer: null, done: false };
    document.querySelector('#practice-tabs .tab-panel[data-tab="exam"] .card.accent').style.display = 'none';
    document.getElementById('exam-runtime').style.display = 'block';
    document.getElementById('exam-result').style.display = 'none';
    renderExamQuestion();
    if (time > 0) {
      state.exam.timer = setInterval(() => {
        state.exam.remaining--;
        document.getElementById('exam-timer').textContent = fmtTime(state.exam.remaining);
        if (state.exam.remaining <= 0) finishExam();
      }, 1000);
    } else {
      document.getElementById('exam-timer').textContent = '∞';
    }
    if (time > 0) document.getElementById('exam-timer').textContent = fmtTime(time);
  }

  function renderExamQuestion(){
    const e = state.exam;
    const q = e.qs[e.idx];
    const container = document.getElementById('exam-questions');
    container.innerHTML = `
      <div class="q">
        <div class="question">${e.idx+1}. ${q.q}</div>
        <div class="opts">
          ${q.opts.map((o,i) => `
            <div class="opt ${q.answered===i ? 'selected' : ''}" data-i="${i}">${o.t}</div>
          `).join('')}
        </div>
        <div class="q-meta">Capítulo ${q.ch}</div>
      </div>
    `;
    container.querySelectorAll('.opt').forEach(el => {
      el.addEventListener('click', () => {
        q.answered = parseInt(el.dataset.i);
        container.querySelectorAll('.opt').forEach(o => o.classList.toggle('selected', o === el));
      });
    });
    document.getElementById('exam-counter').textContent = `${e.idx+1} / ${e.qs.length}`;
    document.getElementById('exam-progress-fill').style.width = `${((e.idx+1)/e.qs.length)*100}%`;
    document.getElementById('exam-prev').disabled = e.idx === 0;
    const last = e.idx === e.qs.length - 1;
    document.getElementById('exam-next').style.display = last ? 'none' : '';
    document.getElementById('exam-submit').style.display = last ? '' : 'none';
  }

  function finishExam(){
    const e = state.exam;
    if (e.done) return;
    e.done = true;
    if (e.timer) clearInterval(e.timer);
    let correct = 0;
    const byCh = {};
    e.qs.forEach(q => {
      const isCorrect = q.answered !== null && q.opts[q.answered].c;
      if (isCorrect) correct++;
      byCh[q.ch] = byCh[q.ch] || {ok:0, total:0};
      byCh[q.ch].total++;
      if (isCorrect) byCh[q.ch].ok++;
    });
    const pct = Math.round((correct/e.qs.length)*100);
    const data = load();
    data.exam = data.exam || [];
    data.exam.push({date: Date.now(), correct, total: e.qs.length, pct});
    save(data);
    refreshStats();

    const resEl = document.getElementById('exam-result');
    resEl.style.display = 'block';
    document.getElementById('exam-runtime').style.display = 'none';
    const verdict = pct >= 80 ? {c:'ok', t:'Excelente 🔥'} : pct >= 60 ? {c:'accent', t:'Vas bien, pulí detalles'} : {c:'warn', t:'Hay que repasar'};
    resEl.innerHTML = `
      <div class="card ${verdict.c}">
        <h3 style="margin-top:0">Resultado: ${correct} / ${e.qs.length} (${pct}%)</h3>
        <p style="margin:0 0 1rem"><strong>${verdict.t}</strong></p>
        <div class="grid">
          ${CHAPTERS.map(c => {
            const s = byCh[c.n];
            if (!s) return '';
            const p = Math.round((s.ok/s.total)*100);
            return `<div class="kpi"><span class="n" style="color:${p>=70?'var(--ok)':p>=40?'var(--warn)':'var(--err)'}">${s.ok}/${s.total}</span><span class="l">Cap. ${c.n} — ${c.t}</span></div>`;
          }).join('')}
        </div>
      </div>
      <h3>Repaso</h3>
      ${e.qs.map((q,i) => {
        const isC = q.answered !== null && q.opts[q.answered].c;
        return `
          <div class="q" data-answered="1">
            <div class="question">${i+1}. ${q.q}</div>
            <div class="opts">
              ${q.opts.map((o,oi) => {
                let cls = '';
                if (o.c) cls = 'correct';
                else if (q.answered === oi) cls = 'wrong';
                return `<div class="opt ${cls}">${o.t}</div>`;
              }).join('')}
            </div>
            <div class="explain show"><strong>${isC?'✓':'✗'}</strong> ${q.ex}</div>
          </div>
        `;
      }).join('')}
      <div class="pager" style="margin-top:1.5rem">
        <button class="btn-primary" onclick="location.reload()">Volver a arrancar</button>
      </div>
    `;
    window.scrollTo({top: resEl.offsetTop - 80, behavior:'smooth'});
  }

  // ===== Por capítulo =====
  function renderChapterCards(){
    const grid = document.getElementById('chapter-cards');
    grid.innerHTML = CHAPTERS.map(c => {
      const n = window.IIS_QUESTIONS.filter(q => q.ch === c.n).length;
      const data = load();
      const done = (data.chapter && data.chapter[c.n]) ? data.chapter[c.n].best : null;
      return `
        <div class="card accent chapter-pick" data-ch="${c.n}" style="cursor:pointer">
          <h3 style="margin:0 0 0.5rem;color:var(--accent)">Cap. ${c.n} — ${c.t}</h3>
          <p style="margin:0;color:var(--text-dim)">${n} preguntas${done!==null?` · mejor: ${done}%`:''}</p>
        </div>
      `;
    }).join('');
    grid.querySelectorAll('.chapter-pick').forEach(el => {
      el.addEventListener('click', () => startChapterQuiz(parseInt(el.dataset.ch)));
    });
  }

  function startChapterQuiz(ch){
    const qs = window.IIS_QUESTIONS.filter(q => q.ch === ch).map(q => ({...q, opts: shuffle(q.opts)}));
    const target = document.getElementById('chapter-quiz');
    target.innerHTML = `
      <div class="quiz">
        <h3>Capítulo ${ch} — ${CHAPTERS.find(c=>c.n===ch).t} (${qs.length} preguntas)</h3>
        ${qs.map((q,i) => `
          <div class="q" data-qi="${i}">
            <div class="question">${i+1}. ${q.q}</div>
            <div class="opts">
              ${q.opts.map(o => `<div class="opt" data-correct="${o.c?'1':'0'}">${o.t}</div>`).join('')}
            </div>
            <div class="explain">${q.ex}</div>
          </div>
        `).join('')}
        <div id="chapter-score" style="margin-top:1rem;text-align:center;color:var(--text-dim)">Respondé todas para ver tu puntaje.</div>
      </div>
    `;
    window.scrollTo({top: target.offsetTop - 80, behavior:'smooth'});
    const scoreEl = document.getElementById('chapter-score');
    const checkDone = () => {
      const all = target.querySelectorAll('.q');
      const answered = target.querySelectorAll('.q[data-answered="1"]');
      if (answered.length === all.length) {
        let ok = 0;
        answered.forEach(q => {
          if (!q.querySelector('.opt.wrong')) ok++;
        });
        const pct = Math.round((ok/all.length)*100);
        scoreEl.innerHTML = `<strong style="color:${pct>=70?'var(--ok)':'var(--warn)'}">${ok} / ${all.length} correctas (${pct}%)</strong>`;
        const data = load();
        data.chapter = data.chapter || {};
        const prev = data.chapter[ch];
        data.chapter[ch] = { best: prev ? Math.max(prev.best, pct) : pct, last: pct };
        save(data);
        renderChapterCards();
      }
    };
    target.addEventListener('click', e => {
      if (e.target.classList.contains('opt')) setTimeout(checkDone, 50);
    });
  }

  // ===== Flashcards =====
  function renderFlashcards(filter='all'){
    const grid = document.getElementById('flash-grid');
    const cards = filter === 'all' ? window.IIS_FLASHCARDS : window.IIS_FLASHCARDS.filter(f => f.ch === parseInt(filter));
    grid.innerHTML = cards.map(f => `
      <div class="flashcard">
        <div class="flashcard-inner">
          <div class="flashcard-front"><div><small style="color:var(--text-dim);display:block;margin-bottom:0.35rem">Cap. ${f.ch}</small>${f.f}</div></div>
          <div class="flashcard-back">${f.b}</div>
        </div>
      </div>
    `).join('');
  }

  // ===== Verdadero / Falso =====
  function startTF(){
    const items = shuffle(window.IIS_TRUE_FALSE).map(x => ({...x, picked: null}));
    state.tf = { items };
    const target = document.getElementById('tf-runtime');
    target.style.display = 'block';
    document.getElementById('tf-result').style.display = 'none';
    document.getElementById('tf-start').style.display = 'none';
    target.innerHTML = items.map((it, i) => `
      <div class="tf-item" data-i="${i}">
        <div class="tf-statement">${i+1}. ${it.s}</div>
        <div class="tf-buttons">
          <button class="btn-tf" data-v="true">Verdadero</button>
          <button class="btn-tf" data-v="false">Falso</button>
        </div>
      </div>
    `).join('') + `<div style="text-align:center;margin-top:1rem"><button class="btn-primary" id="tf-submit">Ver resultado</button></div>`;
    target.querySelectorAll('.tf-item').forEach(item => {
      const i = parseInt(item.dataset.i);
      item.querySelectorAll('.btn-tf').forEach(btn => {
        btn.addEventListener('click', () => {
          state.tf.items[i].picked = btn.dataset.v === 'true';
          item.querySelectorAll('.btn-tf').forEach(b => b.classList.toggle('active', b === btn));
        });
      });
    });
    document.getElementById('tf-submit').addEventListener('click', finishTF);
  }

  function finishTF(){
    const items = state.tf.items;
    let ok = 0;
    items.forEach(it => { if (it.picked === it.a) ok++; });
    const pct = Math.round((ok/items.length)*100);
    const res = document.getElementById('tf-result');
    res.style.display = 'block';
    document.getElementById('tf-runtime').style.display = 'none';
    res.innerHTML = `
      <div class="card ${pct>=70?'ok':pct>=50?'accent':'warn'}">
        <h3 style="margin-top:0">Resultado: ${ok} / ${items.length} (${pct}%)</h3>
      </div>
      ${items.map((it,i) => {
        const correct = it.picked === it.a;
        return `
          <div class="card ${correct?'ok':'err'}">
            <div><strong>${i+1}. ${it.s}</strong></div>
            <div style="margin-top:0.5rem;color:var(--text-dim)">
              Tu respuesta: <strong>${it.picked===null?'—':(it.picked?'Verdadero':'Falso')}</strong> ·
              Correcta: <strong>${it.a?'Verdadero':'Falso'}</strong>
            </div>
            <div style="margin-top:0.5rem">${it.ex}</div>
          </div>
        `;
      }).join('')}
      <div style="text-align:center;margin-top:1rem"><button class="btn-primary" onclick="location.reload()">Otra ronda</button></div>
    `;
    window.scrollTo({top: res.offsetTop - 80, behavior:'smooth'});
  }

  // ===== Init =====
  document.addEventListener('DOMContentLoaded', () => {
    refreshStats();
    renderChapterCards();
    renderFlashcards();

    document.getElementById('exam-start').addEventListener('click', startExam);
    document.getElementById('exam-next').addEventListener('click', () => {
      if (state.exam.idx < state.exam.qs.length - 1) { state.exam.idx++; renderExamQuestion(); }
    });
    document.getElementById('exam-prev').addEventListener('click', () => {
      if (state.exam.idx > 0) { state.exam.idx--; renderExamQuestion(); }
    });
    document.getElementById('exam-submit').addEventListener('click', finishExam);

    document.getElementById('flash-filter').addEventListener('click', e => {
      if (e.target.matches('.tab-btn')) {
        document.querySelectorAll('#flash-filter .tab-btn').forEach(b => b.classList.toggle('active', b === e.target));
        renderFlashcards(e.target.dataset.ch);
      }
    });

    document.getElementById('tf-start').addEventListener('click', startTF);
  });
})();
