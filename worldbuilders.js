(function () {
  const DATA_URL = 'https://www.vikingmud.org/qc_projects.json';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const BORING = new Set([
    'd', 'players', 'ec', 'guild', 'com', 'events', 'doc', 'documentation',
    'readme', 'desc', 'info', 'qc', 'qc-guide', 'quality_control', 'to_qc', 'room'
  ]);

  function prettifyName(raw) {
    if (!raw) return '(unnamed)';
    const s = raw.trim();
    if (!s.includes('/') && !s.startsWith('~')) return s;
    let p = s.startsWith('~') ? s.slice(1) : s.replace(/^\/+/, '');
    const parts = p.split('/').map(x => x.trim()).filter(Boolean);
    if (!parts.length) return s;
    for (let i = parts.length - 1; i >= 0; i--) {
      const name = parts[i].replace(/\.(c|txt|dnar|lpc|h|md)$/i, '').trim();
      if (name && !BORING.has(name.toLowerCase())) {
        return name.replace(/[_-]/g, ' ');
      }
    }
    return parts[parts.length - 1].replace(/\.(c|txt|dnar|lpc|h|md)$/i, '').replace(/[_-]/g, ' ') || s;
  }

  function extractYear(dateStr) {
    if (!dateStr) return null;
    const m = dateStr.match(/\b(19|20)\d{2}\b/);
    return m ? parseInt(m[0], 10) : null;
  }

  function parseTimestamp(str) {
    if (!str) return 0;
    try { return new Date(str).getTime() || 0; } catch (e) { return 0; }
  }

  function formatDate(str) {
    if (!str) return '';
    try {
      const d = new Date(str);
      if (isNaN(d)) return str;
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
    } catch (e) { return str; }
  }

  function capitalize(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  let creators = [];
  let searchTerm = '';
  let sortMode = 'count';

  // ── Card rendering ───────────────────────────────────────────────────────────

  function renderCard(c) {
    const yr = c.minYear
      ? (c.minYear === c.maxYear ? String(c.minYear) : c.minYear + '–' + c.maxYear)
      : '';
    const items = c.works.map(w =>
      '<li class="wb-contrib">' + esc(w.display) + '</li>'
    ).join('');
    return '<article class="wb-card">'
      + '<div class="wb-card-identity">'
      + '<button class="wb-creator-btn" data-creator="' + esc(c.name) + '" aria-label="View timeline for ' + esc(capitalize(c.name)) + '">' + esc(capitalize(c.name)) + '</button>'
      + '<div class="wb-meta">'
      + (yr ? '<span class="wb-years">' + esc(yr) + '</span>' : '')
      + '<span class="wb-work-count">' + (c.works.length === 1 ? '1 work' : c.works.length + ' works') + '</span>'
      + '</div>'
      + '</div>'
      + '<ul class="wb-contrib-list" aria-label="Works by ' + esc(capitalize(c.name)) + '">'
      + items
      + '</ul>'
      + '</article>';
  }

  function render() {
    const grid = document.getElementById('wb-grid');
    const countEl = document.getElementById('wb-count');

    const term = searchTerm;
    const filtered = term
      ? creators.filter(c => {
          if (c.name.includes(term)) return true;
          return c.works.some(w => w.display.toLowerCase().includes(term));
        })
      : creators;

    countEl.textContent = filtered.length + ' / ' + creators.length + ' creators';

    if (!filtered.length) {
      grid.innerHTML = '<p class="wb-empty">No creators match your search.</p>';
      return;
    }

    const numCols = window.innerWidth <= 640 ? 1 : window.innerWidth <= 960 ? 2 : 3;
    const cols = Array.from({ length: numCols }, function () { return []; });
    filtered.forEach(function (c, i) { cols[i % numCols].push(c); });
    grid.innerHTML = cols.map(function (col) {
      return '<div class="wb-col">' + col.map(renderCard).join('') + '</div>';
    }).join('');
  }

  function sortCreators() {
    if (sortMode === 'alpha') {
      creators.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      creators.sort((a, b) => b.works.length - a.works.length || a.name.localeCompare(b.name));
    }
  }

  // ── Detail / timeline view ───────────────────────────────────────────────────

  function showDetail(name, pushHistory) {
    const c = creators.find(x => x.name === name);
    if (!c) return;
    if (pushHistory !== false) history.pushState({ creator: name }, '', '#' + name);

    const yr = c.minYear
      ? (c.minYear === c.maxYear ? String(c.minYear) : c.minYear + '–' + c.maxYear)
      : '';

    const sorted = c.works.slice().sort((a, b) => parseTimestamp(b.date) - parseTimestamp(a.date));

    const entries = sorted.map(w => {
      const dateStr = w.date ? formatDate(w.date) : '';
      return '<div class="wb-tl-entry">'
        + (dateStr ? '<div class="wb-tl-date">' + esc(dateStr) + '</div>' : '')
        + '<div class="wb-tl-name">' + esc(w.display) + '</div>'
        + (w.desc ? '<div class="wb-tl-desc">' + esc(w.desc) + '</div>' : '')
        + '</div>';
    }).join('');

    const detail = document.getElementById('wb-detail');
    detail.innerHTML =
      '<div class="wb-detail-inner">'
      + '<div class="wrap">'
      + '<button class="wb-back-btn" aria-label="Back to World Builders">'
      + '<span aria-hidden="true">←</span> World Builders'
      + '</button>'
      + '<div class="wb-detail-header">'
      + '<h1 class="wb-detail-name">' + esc(capitalize(c.name)) + '</h1>'
      + '<div class="wb-detail-meta">'
      + (yr ? '<span>' + esc(yr) + '</span>' : '')
      + '<span>' + (c.works.length === 1 ? '1 contribution' : c.works.length + ' contributions') + '</span>'
      + '</div>'
      + '</div>'
      + '<div class="wb-timeline">' + entries + '</div>'
      + '</div>'
      + '</div>';

    detail.querySelector('.wb-back-btn').addEventListener('click', function () {
      history.back();
    });

    document.querySelector('.wb-header').hidden = true;
    document.querySelector('.wb-filter-bar').hidden = true;
    document.querySelector('.wb-grid-section').hidden = true;
    detail.hidden = false;
    window.scrollTo(0, 0);
  }

  function hideDetail() {
    document.getElementById('wb-detail').hidden = true;
    document.querySelector('.wb-header').hidden = false;
    document.querySelector('.wb-filter-bar').hidden = false;
    document.querySelector('.wb-grid-section').hidden = false;
    window.scrollTo(0, 0);
  }

  window.addEventListener('popstate', function (e) {
    if (e.state && e.state.creator) {
      showDetail(e.state.creator, false);
    } else {
      hideDetail();
    }
  });

  // ── Event listeners ──────────────────────────────────────────────────────────

  document.getElementById('wb-grid').addEventListener('click', function (e) {
    const btn = e.target.closest('.wb-creator-btn');
    if (btn) showDetail(btn.dataset.creator);
  });

  var lastColCount = 0;
  window.addEventListener('resize', function () {
    var n = window.innerWidth <= 640 ? 1 : window.innerWidth <= 960 ? 2 : 3;
    if (n !== lastColCount) { lastColCount = n; render(); }
  });

  document.getElementById('wb-search').addEventListener('input', function () {
    searchTerm = this.value.trim().toLowerCase();
    render();
  });

  document.querySelectorAll('.wb-sort-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      sortMode = this.dataset.sort;
      document.querySelectorAll('.wb-sort-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      sortCreators();
      render();
    });
  });

  // ── Data loading ─────────────────────────────────────────────────────────────

  fetch(DATA_URL)
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      const byCreator = {};
      for (const entry of data) {
        const names = (entry.created_by || 'unknown')
          .split(',')
          .map(n => n.trim().toLowerCase())
          .filter(Boolean);
        for (const name of names) {
          if (!byCreator[name]) byCreator[name] = [];
          byCreator[name].push(entry);
        }
      }

      creators = Object.entries(byCreator).map(([name, entries]) => {
        const years = entries.map(e => extractYear(e.submit_date)).filter(Boolean);
        return {
          name,
          works: entries
            .map(e => ({
              display: prettifyName(e.entry_name),
              desc: e.submit_description || null,
              date: e.submit_date || null,
            }))
            .sort((a, b) => a.display.localeCompare(b.display)),
          minYear: years.length ? Math.min(...years) : null,
          maxYear: years.length ? Math.max(...years) : null,
        };
      });

      sortCreators();
      history.replaceState({ creator: null }, '', location.href);

      const allYears = creators.flatMap(c => [c.minYear, c.maxYear]).filter(Boolean);
      const statsEl = document.getElementById('wb-stats');
      statsEl.innerHTML = [
        { n: creators.length, l: 'Creators' },
        { n: data.length,     l: 'Contributions' },
        { n: allYears.length ? Math.min(...allYears) + '–' + Math.max(...allYears) : '–', l: 'Years active' },
      ].map(s =>
        '<div class="stat-item">'
        + '<span class="stat-value">' + s.n + '</span>'
        + '<span class="stat-label">' + esc(s.l) + '</span>'
        + '</div>'
      ).join('');

      render();

      const initialHash = location.hash.slice(1).toLowerCase();
      if (initialHash) {
        const match = creators.find(x => x.name === initialHash);
        if (match) showDetail(match.name, false);
      }
    })
    .catch(() => {
      const grid = document.getElementById('wb-grid');
      if (grid) grid.innerHTML = '<p class="wb-empty">Could not load creator data.</p>';
    });
}());
