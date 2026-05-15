// Viking MUD — Wizard Dashboard
(function () {
  'use strict';

  const BASE = 'wizdoc/';
  const WIZDOC_ROOT = 'https://www.vikingmud.org/wizdoc/';

  // ── Lessons metadata ────────────────────────────────────────────────────────
  const LESSONS = [
    { id: 'INDEX',    num: '∞',  title: 'Course Overview',   desc: 'Full table of contents for all 16 lessons' },
    { id: 'lesson1',  num: '01', title: 'Getting Started',   desc: 'Environment setup and your first LPC object' },
    { id: 'lesson2',  num: '02', title: 'Syntax & Types',    desc: 'Variables, basic types, and LPC syntax rules' },
    { id: 'lesson3',  num: '03', title: 'Functions',         desc: 'Defining and calling functions, return values' },
    { id: 'lesson4',  num: '04', title: 'Control Flow',      desc: 'Loops, conditionals, and decision-making' },
    { id: 'lesson5',  num: '05', title: 'Arrays & Mappings', desc: 'Containers, lists, and associative arrays' },
    { id: 'lesson6',  num: '06', title: 'OOP in LPC',        desc: 'Inheritance, cloning, and object-oriented design' },
    { id: 'lesson7',  num: '07', title: 'Strings',           desc: 'String functions and text processing patterns' },
    { id: 'lesson8',  num: '08', title: 'Preprocessor',      desc: '#define, #include, macros and pragmas' },
    { id: 'lesson9',  num: '09', title: 'Multitasking',      desc: 'call_out, heart_beat, and eval cost limits' },
    { id: 'lesson10', num: '10', title: 'Player Actions',    desc: 'Adding commands and actions to objects' },
    { id: 'lesson11', num: '11', title: 'Properties',        desc: 'The property and query/set system' },
    { id: 'lesson12', num: '12', title: 'Hooks & Call-outs', desc: 'Event hooks, delayed and timed execution' },
    { id: 'lesson13', num: '13', title: 'Rooms',             desc: 'Building rooms with the Viking MUD mudlib' },
    { id: 'lesson14', num: '14', title: 'Items & Combat',    desc: 'Creating items, weapons, and armour' },
    { id: 'lesson15', num: '15', title: 'Techniques',        desc: 'Recursion and advanced programming patterns' },
    { id: 'lesson16', num: '16', title: 'Error Handling',    desc: 'Debugging strategies and common runtime errors' },
  ];

  // ── Hooks list ──────────────────────────────────────────────────────────────
  const HOOKS = [
    '__add_alignment', '__add_hit_exp',   '__add_money',        '__attack',
    '__bal_title',     '__bbusy_next_round','__beat_stopped',   '__bnotify_attack',
    '__bnotify_attacking','__bprompt',    '__break',            '__btest_dark',
    '__btoodrunk',     '__btoosoaked',    '__btoostuffed',      '__catch_tell',
    '__chat',          '__choose_killer', '__choose_target',    '__close',
    '__damage_dealt',  '__damage_done',   '__damage_type',      '__destroy',
    '__die',           '__do_feeling',    '__drink',            '__drink_alco',
    '__drop',          '__eat',           '__enter_inv',        '__feeling_occurred',
    '__fight_beat',    '__flee',          '__get',              '__give',
    '__heart_beat',    '__hit_player',    '__info',             '__init',
    '__invis',         '__kill',          '__leave_inv',        '__linkdead',
    '__long',          '__look',          '__move',             '__move_player',
    '__open',          '__peace_beat',    '__perform_move',     '__query_skill',
    '__quest',         '__quit',          '__receive',          '__receive_feeling',
    '__reduce_hit_point','__reenter',     '__remove',           '__reset',
    '__restore_spell_points','__set_alignment','__set_dead',    '__short',
    '__vis',           '__wander',        '__wander_done',      '__wander_fail',
    '__weapon_hit',    '__wear',          '__wear_out',         '__wield',
    'hooklist',        'hooks.about',
  ];

  // ── Color code parser (mirrors help.js) ────────────────────────────────────
  const FG = new Set([
    'BLACK','RED','GREEN','YELLOW','BLUE','MAGENTA','CYAN','WHITE','GREY',
    'L_BLACK','L_RED','L_GREEN','L_YELLOW','L_BLUE','L_MAGENTA','L_CYAN','L_WHITE','L_GREY',
  ]);
  const BG = new Set([
    'B_BLACK','B_RED','B_GREEN','B_YELLOW','B_BLUE','B_MAGENTA','B_CYAN','B_WHITE','B_GREY',
  ]);
  const AT = new Set(['BOLD','UNDERLINE','BLINK','INVERSE']);

  function parseColors(text) {
    let fg = null, bg = null;
    const attrs = new Set();
    const TOKEN = /%\^([A-Z_]+)%\^/g;
    let html = '', last = 0;
    function flush(raw) {
      if (!raw) return;
      const safe = raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const cls = [];
      if (fg) cls.push('hc-' + fg.toLowerCase().replace(/_/g, '-'));
      if (bg) cls.push('hc-' + bg.toLowerCase().replace(/_/g, '-'));
      attrs.forEach(a => cls.push('hc-' + a.toLowerCase()));
      html += cls.length ? `<span class="${cls.join(' ')}">${safe}</span>` : safe;
    }
    let m;
    while ((m = TOKEN.exec(text)) !== null) {
      flush(text.slice(last, m.index));
      last = TOKEN.lastIndex;
      const code = m[1];
      if (code === 'END' || code === 'REVERT' || code === 'NONE') {
        fg = null; bg = null; attrs.clear();
      } else if (FG.has(code)) {
        fg = code;
      } else if (BG.has(code)) {
        bg = code;
      } else if (AT.has(code)) {
        attrs.add(code);
      }
    }
    flush(text.slice(last));
    return html;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── Directory fetching ──────────────────────────────────────────────────────
  function parseListing(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const files = [], dirs = [];
    for (const a of doc.querySelectorAll('a[href]')) {
      const raw = a.getAttribute('href');
      const isDir = raw.endsWith('/');
      const href = raw.replace(/\/$/, '');
      if (!href || href.startsWith('?') || href.startsWith('/') ||
          href.startsWith('http') || href.startsWith('.') || href === '..') continue;
      (isDir ? dirs : files).push(decodeURIComponent(href));
    }
    return { files, dirs };
  }

  async function fetchListing(path) {
    try {
      const url = BASE + (path ? path + '/' : '');
      const r = await fetch(url);
      if (!r.ok) return { files: [], dirs: [] };
      return parseListing(await r.text());
    } catch (_) {
      return { files: [], dirs: [] };
    }
  }

  // Recursively build a directory tree node, max 4 levels deep
  async function buildTree(path, depth) {
    const { files, dirs } = await fetchListing(path);
    const filteredDirs = dirs.filter(d => d !== 'museum');
    const children = depth < 4
      ? await Promise.all(filteredDirs.map(d => buildTree(path + '/' + d, depth + 1)))
      : filteredDirs.map(d => ({ name: d, path: path + '/' + d, files: [], children: [] }));
    return { name: path.split('/').pop(), path, files, children };
  }

  const PROPS_PREFIX = 'properties/';

  // ── State ───────────────────────────────────────────────────────────────────
  let allFiles     = [];   // [{path, name, section}]
  let filtered     = [];   // current filter results
  let focusIdx     = -1;
  const cache      = {};
  const propsMap   = {};   // name → property object
  let treeNodes    = null; // div#devdash-tree-nodes
  let filterNodes  = null; // div#devdash-filter-nodes

  // ── DOM refs (resolved in init) ─────────────────────────────────────────────
  let searchEl, statusEl, viewerEl, welcomeEl, viewerBody, viewerPath, viewerExt, countEl;

  // ── Init ────────────────────────────────────────────────────────────────────
  async function init() {
    searchEl    = document.getElementById('devdash-search');
    statusEl    = document.getElementById('devdash-status');
    treeNodes   = document.getElementById('devdash-tree-nodes');
    filterNodes = document.getElementById('devdash-filter-nodes');
    viewerEl    = document.getElementById('devdash-viewer');
    welcomeEl   = document.getElementById('devdash-welcome');
    viewerBody  = document.getElementById('devdash-viewer-body');
    viewerPath  = document.getElementById('devdash-viewer-path');
    viewerExt   = document.getElementById('devdash-viewer-ext');
    countEl     = document.getElementById('devdash-search-count');

    renderLessons();
    renderHooks();
    attachEvents();
    await buildIndex();
  }

  function attachEvents() {
    searchEl.addEventListener('input',   () => handleSearch(searchEl.value));
    searchEl.addEventListener('keydown', onSearchKey);
    document.addEventListener('keydown', onDocKey);
  }

  // ── Index building ──────────────────────────────────────────────────────────
  async function buildIndex() {
    setStatus('Loading wizdoc index…');

    const { dirs: topDirs } = await fetchListing('');
    const sections = topDirs.filter(d => d !== 'museum');

    const trees = await Promise.all(sections.map(s => buildTree(s, 1)));

    allFiles = [];
    function flatten(node) {
      for (const f of node.files) {
        allFiles.push({ path: node.path + '/' + f, name: f, section: node.path });
      }
      for (const c of node.children) flatten(c);
    }
    trees.forEach(flatten);
    allFiles.sort((a, b) => a.name.localeCompare(b.name));
    filtered = allFiles;

    treeNodes.innerHTML = '';
    trees.forEach(t => treeNodes.appendChild(buildTreeEl(t)));
    setStatus('');
    updateCount();

    // Load properties.json alongside wizdoc content
    fetchAndRenderProperties();
  }

  function setStatus(msg) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.hidden = !msg;
  }

  // ── Tree element building ───────────────────────────────────────────────────
  function buildTreeEl(node) {
    const wrap = document.createElement('div');
    wrap.className = 'devdash-dir';

    const count = countDeep(node);
    const head  = document.createElement('button');
    head.className = 'devdash-dir-head';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('type', 'button');

    const hasContent = count > 0;
    if (!hasContent) head.classList.add('devdash-dir-empty');

    head.innerHTML =
      `<span class="dd-arrow" aria-hidden="true">${hasContent ? '▶' : '·'}</span>` +
      `<span class="dd-name">${esc(node.name)}</span>` +
      (count ? `<span class="dd-count">${count}</span>` : '');

    const body = document.createElement('div');
    body.className = 'devdash-dir-body';
    body.hidden = true;

    if (hasContent) {
      for (const c of node.children) body.appendChild(buildTreeEl(c));
      for (const f of node.files)    body.appendChild(buildFileEl(node.path + '/' + f));

      head.addEventListener('click', () => {
        const open = head.getAttribute('aria-expanded') === 'true';
        head.setAttribute('aria-expanded', String(!open));
        head.querySelector('.dd-arrow').textContent = open ? '▶' : '▼';
        body.hidden = open;
      });
    }

    wrap.append(head, body);
    return wrap;
  }

  function countDeep(node) {
    let n = node.files.length;
    for (const c of node.children) n += countDeep(c);
    return n;
  }

  function buildFileEl(path) {
    const el = document.createElement('button');
    el.className = 'devdash-file';
    el.setAttribute('type', 'button');
    el.dataset.path = path;
    el.textContent  = path.split('/').pop();
    el.addEventListener('click', () => loadContent(path));
    return el;
  }

  // ── Search ──────────────────────────────────────────────────────────────────
  function handleSearch(raw) {
    const q = raw.trim().toLowerCase();

    if (!q) {
      filtered  = allFiles;
      focusIdx  = -1;
      treeNodes.hidden   = false;
      filterNodes.hidden = true;
      filterNodes.innerHTML = '';
      updateCount();
      return;
    }

    filtered = allFiles.filter(f =>
      f.name.toLowerCase().includes(q) ||
      f.section.toLowerCase().includes(q)
    );
    focusIdx = filtered.length > 0 ? 0 : -1;

    treeNodes.hidden = true;
    renderFilterList();
    filterNodes.hidden = false;
    updateCount();
  }

  function renderFilterList() {
    filterNodes.innerHTML = '';

    if (filtered.length === 0) {
      const msg = document.createElement('div');
      msg.className = 'devdash-status';
      msg.textContent = 'No results.';
      filterNodes.appendChild(msg);
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((f, i) => {
      const el = document.createElement('button');
      el.className = 'devdash-file devdash-flat' + (i === focusIdx ? ' devdash-focused' : '');
      el.setAttribute('type', 'button');
      el.dataset.index = String(i);
      el.dataset.path  = f.path;
      el.innerHTML =
        `<span class="dff-name">${esc(f.name)}</span>` +
        `<span class="dff-sect">${esc(f.section)}</span>`;
      el.addEventListener('click', () => {
        focusIdx = i;
        updateFocused();
        loadContent(f.path);
      });
      frag.appendChild(el);
    });
    filterNodes.appendChild(frag);
    scrollFocused();
  }

  function updateFocused() {
    filterNodes.querySelectorAll('.devdash-focused')
      .forEach(e => e.classList.remove('devdash-focused'));
    const el = filterNodes.querySelector(`[data-index="${focusIdx}"]`);
    if (el) { el.classList.add('devdash-focused'); scrollFocused(); }
  }

  function scrollFocused() {
    const el = filterNodes.querySelector('.devdash-focused');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function updateCount() {
    if (!countEl) return;
    const q = searchEl ? searchEl.value.trim() : '';
    if (q) {
      countEl.textContent = `${filtered.length} / ${allFiles.length}`;
    } else {
      countEl.textContent = allFiles.length ? `${allFiles.length}` : '';
    }
  }

  // ── Keyboard handling ────────────────────────────────────────────────────────
  function onSearchKey(e) {
    const inFilter = !filterNodes.hidden && filtered.length > 0;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!inFilter) return;
      focusIdx = Math.min(focusIdx + 1, filtered.length - 1);
      updateFocused();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!inFilter) return;
      focusIdx = Math.max(focusIdx - 1, 0);
      updateFocused();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < filtered.length) {
        loadContent(filtered[focusIdx].path);
      }
    } else if (e.key === 'Escape') {
      searchEl.value = '';
      handleSearch('');
    }
  }

  function onDocKey(e) {
    const active = document.activeElement;
    const tag = active ? active.tagName : '';

    // Already in search — handled by onSearchKey
    if (active === searchEl) return;

    // Don't steal focus from other inputs
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Escape') {
      searchEl.value = '';
      handleSearch('');
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!filterNodes.hidden) {
        e.preventDefault();
        searchEl.focus();
        onSearchKey(e);
      }
      return;
    }

    // Printable character: redirect to search
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      searchEl.focus();
      // Append character to end
      const cur = searchEl.value;
      searchEl.value = cur + e.key;
      handleSearch(searchEl.value);
    }
  }

  // ── Properties ──────────────────────────────────────────────────────────────
  async function fetchAndRenderProperties() {
    try {
      const r = await fetch('properties.json');
      if (!r.ok) return;
      const data = await r.json();
      const props = data.properties || [];

      props.forEach(p => {
        propsMap[p.name] = p;
        allFiles.push({ path: PROPS_PREFIX + p.name, name: p.name, section: 'properties' });
      });
      allFiles.sort((a, b) => a.name.localeCompare(b.name));
      filtered = allFiles;

      treeNodes.appendChild(buildPropsTreeEl(props));
      updateCount();
    } catch (_) {}
  }

  function buildPropsTreeEl(props) {
    const TYPES = ['Livings', 'Monsters', 'Objects', 'Players', 'Rooms', 'Wizards'];
    const byType = {};
    TYPES.forEach(t => { byType[t] = []; });

    props.forEach(p => {
      (p.type || []).forEach(t => { if (byType[t]) byType[t].push(p); });
    });

    const wrap = document.createElement('div');
    wrap.className = 'devdash-dir';

    const head = document.createElement('button');
    head.className = 'devdash-dir-head';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('type', 'button');
    head.innerHTML =
      `<span class="dd-arrow" aria-hidden="true">▶</span>` +
      `<span class="dd-name">properties</span>` +
      `<span class="dd-count">${props.length}</span>`;

    const body = document.createElement('div');
    body.className = 'devdash-dir-body';
    body.hidden = true;

    TYPES.forEach(type => {
      const group = byType[type];
      if (!group.length) return;

      const subWrap = document.createElement('div');
      subWrap.className = 'devdash-dir';

      const subHead = document.createElement('button');
      subHead.className = 'devdash-dir-head';
      subHead.setAttribute('aria-expanded', 'false');
      subHead.setAttribute('type', 'button');
      subHead.innerHTML =
        `<span class="dd-arrow" aria-hidden="true">▶</span>` +
        `<span class="dd-name">${esc(type)}</span>` +
        `<span class="dd-count">${group.length}</span>`;

      const subBody = document.createElement('div');
      subBody.className = 'devdash-dir-body';
      subBody.hidden = true;

      group.slice().sort((a, b) => a.name.localeCompare(b.name))
        .forEach(p => subBody.appendChild(buildPropEl(p)));

      subHead.addEventListener('click', () => {
        const open = subHead.getAttribute('aria-expanded') === 'true';
        subHead.setAttribute('aria-expanded', String(!open));
        subHead.querySelector('.dd-arrow').textContent = open ? '▶' : '▼';
        subBody.hidden = open;
      });

      subWrap.append(subHead, subBody);
      body.appendChild(subWrap);
    });

    head.addEventListener('click', () => {
      const open = head.getAttribute('aria-expanded') === 'true';
      head.setAttribute('aria-expanded', String(!open));
      head.querySelector('.dd-arrow').textContent = open ? '▶' : '▼';
      body.hidden = open;
    });

    wrap.append(head, body);
    return wrap;
  }

  function buildPropEl(prop) {
    const el = document.createElement('button');
    el.className = 'devdash-file';
    el.setAttribute('type', 'button');
    el.dataset.path = PROPS_PREFIX + prop.name;
    el.textContent = prop.name;
    el.addEventListener('click', () => loadProperty(prop));
    return el;
  }

  function loadProperty(prop) {
    document.querySelectorAll('.devdash-active')
      .forEach(e => e.classList.remove('devdash-active'));
    document.querySelectorAll(`[data-path="${CSS.escape(PROPS_PREFIX + prop.name)}"]`)
      .forEach(e => e.classList.add('devdash-active'));

    welcomeEl.hidden = true;
    viewerEl.hidden  = false;

    viewerPath.textContent = PROPS_PREFIX + prop.name;
    viewerExt.hidden = true;

    showProperty(prop);
  }

  function showProperty(prop) {
    const types = (prop.type || [])
      .map(t => `<span class="prop-type-badge">${esc(t)}</span>`)
      .join('');
    const desc = (prop.description || '').trim();

    viewerBody.innerHTML =
      `<div class="prop-view">` +
        `<div class="prop-eyebrow">Property</div>` +
        `<h2 class="prop-name">${esc(prop.name)}</h2>` +
        `<div class="prop-types">${types || ''}</div>` +
        `<div class="prop-creator">creator: ${esc(prop.creator || '—')}</div>` +
        `<pre class="prop-desc">${esc(desc) || '<em>No description.</em>'}</pre>` +
      `</div>`;
  }

  // ── Content loading ──────────────────────────────────────────────────────────
  async function loadContent(path) {
    // Route property lookups to the inline renderer
    if (path.startsWith(PROPS_PREFIX)) {
      const prop = propsMap[path.slice(PROPS_PREFIX.length)];
      if (prop) { loadProperty(prop); return; }
    }

    // Mark active
    document.querySelectorAll('.devdash-active')
      .forEach(e => e.classList.remove('devdash-active'));
    document.querySelectorAll(`[data-path="${CSS.escape(path)}"]`)
      .forEach(e => e.classList.add('devdash-active'));

    welcomeEl.hidden = true;
    viewerEl.hidden  = false;

    const name = path.split('/').pop();
    viewerPath.textContent = path;
    viewerExt.href    = WIZDOC_ROOT + path;
    viewerExt.hidden  = false;

    viewerBody.innerHTML = '<span class="devdash-loading">Loading…</span>';

    if (cache[path]) {
      showContent(cache[path]);
      return;
    }

    try {
      const r = await fetch(BASE + path);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text();
      cache[path] = text;
      showContent(text);
    } catch (err) {
      viewerBody.innerHTML = `<span class="devdash-err">Could not load ${esc(name)}: ${esc(String(err))}</span>`;
    }
  }

  function showContent(text) {
    viewerBody.innerHTML = looksLikeCode(text)
      ? highlightLPC(text)
      : renderDoc(text);
  }

  // ── Doc renderer: color codes + heading detection + inline code blocks ───────
  function renderDoc(text) {
    const lines = text.split('\n');
    const out   = [];
    let i = 0;

    while (i < lines.length) {
      const line     = lines[i];
      const stripped = line.replace(/%\^[A-Z_]+%\^/g, '');
      const plain    = stripped.trim();

      // ── Try to open a code block ──────────────────────────────────────────
      if (isCodeStart(plain)) {
        const raw = [];
        let j = i;

        while (j < lines.length) {
          const l = lines[j].replace(/%\^[A-Z_]+%\^/g, '');
          const p = l.trim();
          if (!p) {
            raw.push('');
            j++;
            continue;
          }
          if (isCodeContinuation(l, p)) {
            raw.push(l);
            j++;
            continue;
          }
          break;
        }

        // Trim trailing blank lines from the block
        while (raw.length && !raw[raw.length - 1].trim()) { raw.pop(); j--; }

        if (raw.length >= 2) {
          out.push(`<span class="wdoc-code-block">${highlightLPC(raw.join('\n'))}</span>`);
          i = j;
          continue;
        }
      }

      // ── Heading or plain line ─────────────────────────────────────────────
      const colored = parseColors(line);
      if (/^\d+\.\d+(\.\d+)?\s+\S/.test(plain)) {
        out.push(`<span class="wdoc-h-num">${colored}</span>`);
      } else if (/^[A-Z][A-Z\s:_\-]{3,}$/.test(plain) && plain.length <= 40) {
        out.push(`<span class="wdoc-h-maj">${colored}</span>`);
      } else {
        out.push(colored);
      }
      i++;
    }

    return out.join('\n');
  }

  function isCodeStart(plain) {
    if (!plain) return false;
    // Typed declaration — 1-4 LPC keyword/modifier tokens followed by optional * and identifier
    // Handles: void f(), string *f(), varargs void f(), static private void f(), etc.
    if (/^(?:(?:void|string|int|float|object|mapping|mixed|status|closure|array|function|varargs|static|private|nomask|public|protected)\s+){1,4}\*{0,2}\w+\s*[\(;,]/.test(plain)) return true;
    // inherit / preprocessor
    if (/^(inherit|#include|#define|#pragma)\s/.test(plain)) return true;
    // Control flow statement starting a block
    if (/^(if|else\s+if|for|while|foreach|switch|do)\s*[\({]/.test(plain)) return true;
    // Comment line
    if (/^\/[/*]/.test(plain)) return true;
    // Lone opening brace
    if (/^\{\s*$/.test(plain)) return true;
    return false;
  }

  function isCodeContinuation(raw, plain) {
    if (!plain) return true;                            // blank line → keep open
    if (/^[{}]\s*$/.test(plain)) return true;           // lone brace
    if (/^\s/.test(raw)) return true;                   // any indented line
    if (isCodeStart(plain)) return true;                // next typed decl (same block)
    return false;
  }

  // ── Code detection ──────────────────────────────────────────────────────────
  function looksLikeCode(text) {
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 4) return false;
    let score = 0;
    for (const line of lines) {
      const t = line.trim();
      if (/^(inherit|#include|#define)\s/.test(t)) score += 6;
      if (/^(void|int|string|object|mapping|mixed|float|static|private|public)\s+\w+\s*[\({;]/.test(t)) score += 3;
      if (/^\s*[{}]\s*$/.test(line) || /\{\s*$/.test(t)) score += 2;
      if (/;\s*$/.test(t)) score += 1;
      if (/^\s*\/[/*]/.test(line)) score += 1;
    }
    return score / lines.length > 0.55;
  }

  // ── LPC syntax highlighter — colours match more.c keyword_tokens ────────────
  // Categories and their %^COLOR%^ → .hc-* class mapping:
  //   Type keywords  L_YELLOW  hc-l-yellow
  //   Modifiers      YELLOW    hc-yellow
  //   Access         RED       hc-red
  //   inherit/#incl  GREEN     hc-green
  //   #ifdef/#endif  L_RED     hc-l-red
  //   Control flow   L_BLUE    hc-l-blue
  //   this_*/create  L_CYAN    hc-l-cyan
  //   Built-ins      CYAN      hc-cyan
  //   Strings        MAGENTA   hc-magenta
  //   Function calls L_MAGENTA hc-l-magenta
  //   Comments       GREY      hc-grey

  const _LPC_TYPE = new Set([
    'void','string','int','float','object','mapping','mixed',
    'status','closure','array','function',
  ]);
  const _LPC_MOD = new Set(['varargs','static','public','protected']);
  const _LPC_ACC = new Set(['private','nomask']);
  const _LPC_CTRL = new Set([
    'if','else','for','while','do','foreach','switch','case','default',
    'break','continue','return','catch','throw','new','store_fp',
  ]);
  const _LPC_SPECIAL = new Set([
    'previous_object','this_object','this_player','caller_stack',
    'create','init','reset','clone_object',
  ]);
  const _LPC_BUILTIN = new Set([
    // output / messaging
    'write','say','shout','tell_object','tell_room','message','printf','notify_fail',
    // string
    'sprintf','sscanf','implode','explode','capitalize','object_name',
    'strlen','replace_string','lower_case','upper_case','trim',
    // containers
    'sizeof','map_sizeof','keys','values','member_array','filter_array',
    'sort_array','unique_array','map_array','m_delete','m_add',
    // type checks / conversion
    'stringp','objectp','clonep','typeof','arrayp','intp','floatp',
    'mapp','functionp','nullp','to_int','to_float','to_string',
    // bit ops
    'testbit','clearbit','setbit',
    // world / objects
    'environment','present','all_inventory','deep_inventory','first_inventory',
    'move_object','living','interactive','query_idle','users','find_player',
    'find_object','destruct','move',
    // file
    'file_size','read_file','write_file','log_file',
    // timing / async
    'time','format_time','ctime','random','call_out','call_other',
    'remove_call_out','find_call_out',
    // properties / flags
    'query_property','remove_property','add_property','test_flag',
    'set_short','set_long',
    // actions
    'add_action','remove_action','query_verb','add_item','add_trigger',
  ]);

  function highlightLPC(text) {
    let html = '';
    let i = 0;
    const n = text.length;

    while (i < n) {
      const ch = text[i];

      // Line comment → GREY
      if (ch === '/' && text[i + 1] === '/') {
        const end = text.indexOf('\n', i);
        const seg = end === -1 ? text.slice(i) : text.slice(i, end);
        html += `<span class="hc-grey">${esc(seg)}</span>`;
        i += seg.length;
        continue;
      }

      // Block comment → GREY
      if (ch === '/' && text[i + 1] === '*') {
        let end = text.indexOf('*/', i + 2);
        end = end === -1 ? n : end + 2;
        html += `<span class="hc-grey">${esc(text.slice(i, end))}</span>`;
        i = end;
        continue;
      }

      // String literal → MAGENTA
      if (ch === '"') {
        let j = i + 1;
        while (j < n && text[j] !== '"' && text[j] !== '\n') {
          if (text[j] === '\\') j++;
          j++;
        }
        if (j < n && text[j] === '"') j++;
        html += `<span class="hc-magenta">${esc(text.slice(i, j))}</span>`;
        i = j;
        continue;
      }

      // Preprocessor directive (only at line start)
      if (ch === '#' && (i === 0 || text[i - 1] === '\n')) {
        const end = text.indexOf('\n', i);
        const seg = end === -1 ? text.slice(i) : text.slice(i, end);
        // #ifdef / #ifndef / #else / #endif / #undef → L_RED, rest → GREEN
        const klass = /^#(ifdef|ifndef|else|endif|undef)\b/.test(seg.trimStart())
          ? 'hc-l-red' : 'hc-green';
        html += `<span class="${klass}">${esc(seg)}</span>`;
        i += seg.length;
        continue;
      }

      // Identifier
      if (/[a-zA-Z_]/.test(ch)) {
        let j = i;
        while (j < n && /\w/.test(text[j])) j++;
        const word = text.slice(i, j);

        let klass = null;
        if (word === 'inherit')       klass = 'hc-green';
        else if (_LPC_TYPE.has(word))    klass = 'hc-l-yellow';
        else if (_LPC_MOD.has(word))     klass = 'hc-yellow';
        else if (_LPC_ACC.has(word))     klass = 'hc-red';
        else if (_LPC_CTRL.has(word))    klass = 'hc-l-blue';
        else if (_LPC_SPECIAL.has(word)) klass = 'hc-l-cyan';
        else if (_LPC_BUILTIN.has(word)) klass = 'hc-cyan';
        else {
          // Unknown identifier followed by '(' → function call → L_MAGENTA
          let k = j;
          while (k < n && (text[k] === ' ' || text[k] === '\t')) k++;
          if (k < n && text[k] === '(') klass = 'hc-l-magenta';
        }

        html += klass ? `<span class="${klass}">${esc(word)}</span>` : esc(word);
        i = j;
        continue;
      }

      // Number → L_YELLOW (matches more.c numeric treatment)
      if (/\d/.test(ch)) {
        let j = i;
        while (j < n && /[\d.xXa-fA-F]/.test(text[j])) j++;
        html += `<span class="hc-l-yellow">${text.slice(i, j)}</span>`;
        i = j;
        continue;
      }

      // Plain character
      html += ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch;
      i++;
    }

    return html;
  }

  // ── Right panel: lessons (section is collapsible, items are plain buttons) ───
  function renderLessons() {
    const container = document.getElementById('devdash-lessons');
    if (!container) return;

    // Wire the section head as a collapse toggle
    const section = container.closest('.devdash-rsec');
    const head    = section && section.querySelector('.devdash-rsec-head');
    if (head) {
      head.classList.add('devdash-rsec-toggle');
      head.setAttribute('role', 'button');
      head.setAttribute('tabindex', '0');

      const arrow = document.createElement('span');
      arrow.className = 'devdash-rsec-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '▶';
      head.appendChild(arrow);

      // Start collapsed
      section.setAttribute('aria-expanded', 'false');
      container.hidden = true;

      const toggle = () => {
        const open = section.getAttribute('aria-expanded') === 'true';
        section.setAttribute('aria-expanded', String(!open));
        container.hidden = open;
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }

    // Render plain lesson buttons
    const frag = document.createDocumentFragment();
    LESSONS.forEach(l => {
      const path = 'learn_lpc/' + l.id;
      const btn  = document.createElement('button');
      btn.className = 'devdash-lesson';
      btn.setAttribute('type', 'button');
      btn.dataset.path = path;
      btn.innerHTML =
        `<span class="dll-num">${esc(l.num)}</span>` +
        `<span class="dll-body">` +
          `<span class="dll-title">${esc(l.title)}</span>` +
          `<span class="dll-desc">${esc(l.desc)}</span>` +
        `</span>`;
      btn.addEventListener('click', () => loadContent(path));
      frag.appendChild(btn);
    });
    container.appendChild(frag);
  }

  // ── Right panel: hooks ───────────────────────────────────────────────────────
  function renderHooks() {
    const el = document.getElementById('devdash-hooks');
    if (!el) return;

    const frag = document.createDocumentFragment();
    HOOKS.forEach(h => {
      const path = 'hooks/' + h;
      const btn  = document.createElement('button');
      btn.className = 'devdash-hook';
      btn.setAttribute('type', 'button');
      btn.dataset.path = path;
      btn.textContent  = h;
      btn.addEventListener('click', () => loadContent(path));
      frag.appendChild(btn);
    });
    el.appendChild(frag);
  }

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
