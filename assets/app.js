// Progress bar
(function(){
  const bar = document.createElement('div');
  bar.className = 'progress-bar';
  document.body.prepend(bar);
  window.addEventListener('scroll', () => {
    const h = document.documentElement;
    const pct = (h.scrollTop / (h.scrollHeight - h.clientHeight)) * 100;
    bar.style.width = pct + '%';
  });
})();

// Tabs
document.addEventListener('click', e => {
  if (e.target.matches('.tab-btn')) {
    const tabs = e.target.closest('.tabs');
    const key = e.target.dataset.tab;
    tabs.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === e.target));
    tabs.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tab === key));
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
