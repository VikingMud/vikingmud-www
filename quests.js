(function () {
  const DIFF_THRESHOLDS = { easy: 100, medium: 500, hard: 1500 };

  function getDifficulty(qp) {
    if (qp <= DIFF_THRESHOLDS.easy)  return 'easy';
    if (qp <= DIFF_THRESHOLDS.medium) return 'medium';
    if (qp <= DIFF_THRESHOLDS.hard)  return 'hard';
    return 'epic';
  }

  const DIFF_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard', epic: 'Epic' };

  function esc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  let allQuests = [];
  let activeFilter = 'all';
  let searchTerm = '';

  function render() {
    const grid    = document.getElementById('quest-grid');
    const countEl = document.getElementById('quest-count');

    const filtered = allQuests.filter(q => {
      if (activeFilter !== 'all' && getDifficulty(q.normal_qp) !== activeFilter) return false;
      if (searchTerm) {
        const hay = (q.name + ' ' + q.hint).toLowerCase();
        if (!hay.includes(searchTerm)) return false;
      }
      return true;
    });

    countEl.textContent = filtered.length + ' / ' + allQuests.length + ' quests';

    if (filtered.length === 0) {
      grid.innerHTML = '<p class="quest-empty">No quests match your search.</p>';
      return;
    }

    grid.innerHTML = filtered.map(q => {
      const diff = getDifficulty(q.normal_qp);
      return `<article class="quest-card">
  <div class="quest-card-head">
    <h2 class="quest-card-name">${esc(q.name)}</h2>
    <span class="quest-qp" aria-label="${q.current_qp.toLocaleString()} quest points">${q.current_qp.toLocaleString()} QP</span>
  </div>
  <p class="quest-hint">${esc(q.hint)}</p>
  <div class="quest-difficulty diff-${diff}">
    <span class="diff-dot" aria-hidden="true"></span>${DIFF_LABELS[diff]}<span class="quest-qp-sep" aria-hidden="true"> · </span><span class="quest-qp-label">Quest Points: ${q.current_qp.toLocaleString()}</span>
  </div>
</article>`;
    }).join('');
  }

  fetch('quests.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      allQuests = Array.isArray(data.quests) ? data.quests : [];

      const statsEl = document.getElementById('quest-stats');
      const items = [
        { n: data.n_quests,                     l: 'Total quests' },
        { n: data.total_qp.toLocaleString(),    l: 'QP available' },
        { n: data.needed_qp.toLocaleString(),   l: 'QP needed for wizard' },
      ];
      statsEl.innerHTML = items.map(s =>
        `<div class="stat-item">
  <span class="stat-value">${s.n}</span>
  <span class="stat-label">${s.l}</span>
</div>`
      ).join('');

      render();
    })
    .catch(() => {
      document.getElementById('quest-grid').innerHTML =
        '<p class="quest-empty">Could not load quest data.</p>';
    });

  document.getElementById('quest-search').addEventListener('input', function () {
    searchTerm = this.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll('.filter-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      activeFilter = this.dataset.filter;
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      render();
    });
  });
}());
