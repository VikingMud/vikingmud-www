// Viking MUD — Boards reader
(function () {
  'use strict';

  let boards = [];
  let currentBoard  = 0;
  let currentThread = -1;

  // ── Tiny helpers ─────────────────────────────────────────────────────────────

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtDate(d) {
    if (!(d instanceof Date) || isNaN(d)) return '—';
    const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  }

  // ── Note parser ───────────────────────────────────────────────────────────────
  // Raw format:
  //   Date: Thu May 21 13:25:05 2026
  //   Author: Dios, level 42
  //   Thread: Subject[, followup: Re: Subject]
  //   <blank>
  //   body text...

  function parseNote(raw) {
    const lines = raw.split('\n');
    const meta  = {};
    let i = 0;
    while (i < lines.length) {
      const m = lines[i].match(/^([A-Za-z]+):\s*(.*)/);
      if (m) { meta[m[1]] = m[2].trim(); i++; }
      else break;
    }
    if (lines[i] === '') i++; // skip blank separator

    const body = lines.slice(i).join('\n').trimEnd();

    // Author: "Dios, level 42"
    const aM = (meta.Author || '').match(/^(.+?),\s*level\s*(\d+)/i);
    const authorName  = aM ? aM[1].trim() : (meta.Author || '').trim();
    const authorLevel = aM ? aM[2] : '';

    // Thread: "Subject" or "Subject, followup: Re: …"
    const tStr   = meta.Thread || '';
    const foIdx  = tStr.indexOf(', followup:');
    const isFollowup = foIdx !== -1;
    const subject = isFollowup ? tStr.slice(0, foIdx).trim() : tStr.trim();

    return {
      date: new Date(meta.Date || ''),
      dateStr: meta.Date || '',
      authorName,
      authorLevel,
      subject,
      isFollowup,
      body,
    };
  }

  // ── Board/thread data builder ─────────────────────────────────────────────────

  function processBoards(raw) {
    return raw.map(b => ({
      name: b.board,
      threads: b.notes.map(group => {
        const notes  = group.map(parseNote);
        const latest = notes.reduce((a, n) => n.date > a.date ? n : a, notes[0]);
        return {
          subject:    notes[0].subject,
          notes,
          latestDate: latest.date,
          authorName: notes[0].authorName,
          replyCount: notes.length - 1,
        };
      }),
    }));
  }

  // ── Render: board tabs ────────────────────────────────────────────────────────

  function renderTabs() {
    const el = document.getElementById('board-tabs');
    if (!el) return;
    el.innerHTML = '';
    boards.forEach((b, i) => {
      const active = i === currentBoard;
      const btn = document.createElement('button');
      btn.className = 'boards-tab' + (active ? ' active' : '');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(active));
      btn.setAttribute('type', 'button');
      // Only the active tab is in the tab sequence; others are arrow-key only

      btn.textContent = b.name;
      btn.addEventListener('click', () => switchBoard(i));
      el.appendChild(btn);
    });
    updateCount();
  }

  function updateCount() {
    const el = document.getElementById('boards-thread-count');
    if (!el) return;
    const n = boards[currentBoard]?.threads.length || 0;
    el.textContent = n + ' thread' + (n !== 1 ? 's' : '');
  }

  // ── Render: thread list ───────────────────────────────────────────────────────

  function renderThreadList() {
    const el = document.getElementById('thread-list');
    if (!el) return;
    el.innerHTML = '';
    el.removeAttribute('aria-activedescendant');

    const threads = boards[currentBoard]?.threads || [];
    if (!threads.length) {
      const li = document.createElement('li');
      li.className = 'thread-list-msg';
      li.textContent = 'No threads on this board.';
      el.appendChild(li);
      return;
    }

    threads.forEach((t, i) => {
      const li   = document.createElement('li');
      const sel  = i === currentThread;
      li.className  = 'thread-item' + (sel ? ' selected' : '');
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(sel));
      li.setAttribute('tabindex', sel ? '0' : '-1');
      li.id         = 'ti-' + i;
      li.dataset.idx = i;

      const repliesHtml = t.replyCount > 0
        ? `<span class="ti-dot" aria-hidden="true">·</span>` +
          `<span class="ti-replies">${t.notes.length} notes</span>`
        : '';

      li.innerHTML =
        `<div class="ti-subject">${esc(t.subject)}</div>` +
        `<div class="ti-meta">` +
          `<span class="ti-author">${esc(t.authorName)}</span>` +
          `<span class="ti-dot" aria-hidden="true">·</span>` +
          `<span class="ti-date">${fmtDate(t.latestDate)}</span>` +
          repliesHtml +
        `</div>`;

      li.addEventListener('click', () => selectThread(i));
      el.appendChild(li);
    });

    if (currentThread >= 0) {
      el.setAttribute('aria-activedescendant', 'ti-' + currentThread);
    }
  }

  // ── Render: thread detail ─────────────────────────────────────────────────────

  function renderDetail() {
    const detail = document.getElementById('thread-detail');
    const empty  = document.getElementById('boards-empty');
    if (!detail || !empty) return;

    if (currentThread < 0) {
      detail.hidden = true;
      empty.hidden  = false;
      return;
    }

    const thread = boards[currentBoard]?.threads[currentThread];
    if (!thread) return;
    empty.hidden  = true;
    detail.hidden = false;

    const total     = boards[currentBoard].threads.length;
    const boardName = boards[currentBoard].name;

    const notesHtml = thread.notes.map((n, i) => {
      const isReply = n.isFollowup;
      return (
        `<article class="note-card${isReply ? ' note-reply' : ''}" id="note-${i}">` +
          `<header class="note-header">` +
            `<div class="note-author-wrap">` +
              `<span class="note-author">${esc(n.authorName)}</span>` +
              (n.authorLevel ? `<span class="note-level">lv&nbsp;${esc(n.authorLevel)}</span>` : '') +
              (isReply       ? `<span class="note-re-badge">Re</span>` : '') +
            `</div>` +
            `<span class="note-date">${fmtDate(n.date)}</span>` +
          `</header>` +
          `<div class="note-body">${esc(n.body)}</div>` +
        `</article>`
      );
    }).join('');

    const prevBtn = currentThread > 0
      ? `<button class="pager-btn" type="button" id="btn-prev" aria-label="Previous thread">← Prev</button>`
      : `<span></span>`;
    const nextBtn = currentThread < total - 1
      ? `<button class="pager-btn" type="button" id="btn-next" aria-label="Next thread">Next →</button>`
      : `<span></span>`;

    detail.innerHTML =
      `<div class="thread-detail-hd">` +
        `<div class="thread-board-label">${esc(boardName)}</div>` +
        `<h2 class="thread-subject-head">${esc(thread.subject)}</h2>` +
      `</div>` +
      `<div class="notes-list">${notesHtml}</div>` +
      `<nav class="thread-pager" aria-label="Thread navigation">` +
        nextBtn +
        `<span class="pager-pos">${currentThread + 1} / ${total}</span>` +
        prevBtn +
      `</nav>`;

    detail.querySelector('#btn-prev')?.addEventListener('click', () => selectThread(currentThread - 1));
    detail.querySelector('#btn-next')?.addEventListener('click', () => selectThread(currentThread + 1));
  }

  // ── Selection helpers ─────────────────────────────────────────────────────────

  function switchBoard(idx) {
    if (idx === currentBoard) return;
    currentBoard  = idx;
    currentThread = -1;
    renderTabs();
    renderThreadList();
    renderDetail();
    // Auto-select first thread on board switch
    if (boards[currentBoard]?.threads.length) {
      currentThread = 0;
      renderThreadList();
      renderDetail();
    }
    document.getElementById('ti-0')?.focus();
  }

  function selectThread(idx) {
    const threads = boards[currentBoard]?.threads || [];
    if (idx < 0 || idx >= threads.length) return;
    currentThread = idx;

    // Update list UI without full re-render (roving tabindex)
    const list = document.getElementById('thread-list');
    list?.querySelectorAll('.thread-item').forEach((el, i) => {
      el.classList.toggle('selected', i === idx);
      el.setAttribute('aria-selected', String(i === idx));
      el.setAttribute('tabindex', i === idx ? '0' : '-1');
    });
    list?.setAttribute('aria-activedescendant', 'ti-' + idx);

    // Scroll item into view in the left panel
    document.getElementById('ti-' + idx)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });

    renderDetail();
    updateHash();

    // Scroll detail to top on new selection
    const right = document.getElementById('boards-right');
    if (right) right.scrollTop = 0;
  }

  // ── Keyboard navigation ───────────────────────────────────────────────────────

  function setupKeyboard() {
    const list = document.getElementById('thread-list');
    if (!list) return;

    // Keyboard events bubble up from focused thread items
    list.addEventListener('keydown', e => {
      const threads = boards[currentBoard]?.threads || [];
      const cur     = currentThread < 0 ? -1 : currentThread;

      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = cur < 0 ? 0 : Math.min(cur + 1, threads.length - 1);
          selectThread(next);
          document.getElementById('ti-' + next)?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = cur < 0 ? 0 : Math.max(cur - 1, 0);
          selectThread(prev);
          document.getElementById('ti-' + prev)?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          selectThread(0);
          document.getElementById('ti-0')?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          const last = threads.length - 1;
          selectThread(last);
          document.getElementById('ti-' + last)?.focus();
          break;
        }
        case 'Enter':
        case ' ': {
          e.preventDefault();
          if (cur < 0 && threads.length) selectThread(0);
          document.getElementById('thread-detail')?.focus();
          break;
        }
      }
    });
  }

  // ── URL hash (deep-link support: #b0t3 = board 0, thread 3) ──────────────────

  function updateHash() {
    if (currentThread >= 0) {
      history.replaceState(null, '', `#b${currentBoard}t${currentThread}`);
    }
  }

  function readHash() {
    const m = location.hash.match(/#b(\d+)t(-?\d+)/);
    if (!m) return;
    const bi = parseInt(m[1], 10);
    const ti = parseInt(m[2], 10);
    if (bi >= 0 && bi < boards.length) {
      currentBoard = bi;
      const tlen = boards[bi]?.threads.length || 0;
      if (ti >= 0 && ti < tlen) currentThread = ti;
    }
  }

  // ── Live server status (nav bar) ──────────────────────────────────────────────

  async function refreshLive() {
    try {
      const res = await fetch('webinfo.json?t=' + Date.now());
      if (!res.ok) return;
      const { usercount, uptime } = await res.json();
      const brief = uptime.replace(/\s*and\s+\d+\s+seconds?\.?$/i, '').replace(/,\s*$/, '').trim();
      const el = document.getElementById('live-nav-status');
      if (el) el.textContent = `${usercount} online · uptime ${brief}`;
    } catch (_) {}
  }

  // ── Init ──────────────────────────────────────────────────────────────────────

  async function init() {
    // Show loading state
    const list = document.getElementById('thread-list');
    if (list) {
      const li = document.createElement('li');
      li.className = 'thread-list-msg';
      li.setAttribute('aria-live', 'polite');
      li.textContent = 'Loading boards…';
      list.appendChild(li);
    }

    refreshLive();
    setInterval(refreshLive, 60_000);

    try {
      const res = await fetch('boards.json?t=' + Date.now());
      if (!res.ok) throw new Error('HTTP ' + res.status);
      boards = processBoards(await res.json());
    } catch (e) {
      if (list) {
        list.innerHTML = '';
        const li = document.createElement('li');
        li.className = 'thread-list-msg thread-list-error';
        li.textContent = 'Could not load boards: ' + e.message;
        list.appendChild(li);
      }
      return;
    }

    readHash();

    // Auto-select first thread if nothing from hash
    if (currentThread < 0 && boards[currentBoard]?.threads.length) {
      currentThread = 0;
    }

    renderTabs();
    renderThreadList();
    renderDetail();
    setupKeyboard();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
