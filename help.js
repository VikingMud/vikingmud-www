// Viking MUD — help terminal widget
(function () {
  'use strict';

  // ── State ───────────────────────────────────────────────────────────────────

  const HELP_DIRS = ['help', 'mortal', 'ghost', 'eternal'];
  // com/s and com/w are wizard/warlord command dirs — never shown to mortals
  const WIZARD_DIRS = new Set(['s', 'w']);

  let isOpen = false;
  let fileList = [];        // sorted, deduplicated names across all dirs
  let fileDir  = {};        // name → dir, first-found wins
  let tabMatches = [];
  let tabIndex = -1;
  let history = [];
  let historyPos = -1;
  let pendingInput = '';
  const cache = {};

  // ── DOM refs ─────────────────────────────────────────────────────────────────

  let fab, panel, output, input;

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    buildDOM();
    attachEvents();
    fetchFileList();
  }

  function buildDOM() {
    fab = document.createElement('button');
    fab.id = 'help-fab';
    fab.setAttribute('aria-label', 'Open help terminal');
    fab.textContent = '?';

    panel = document.createElement('div');
    panel.id = 'help-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Help terminal');
    panel.hidden = true;

    const bar = document.createElement('div');
    bar.id = 'help-titlebar';
    bar.innerHTML = '<span>Viking MUD · Help</span>';
    const closeBtn = document.createElement('button');
    closeBtn.id = 'help-close-btn';
    closeBtn.setAttribute('aria-label', 'Close help');
    closeBtn.textContent = '×';
    bar.appendChild(closeBtn);

    output = document.createElement('div');
    output.id = 'help-output';
    output.setAttribute('role', 'log');
    output.setAttribute('aria-live', 'polite');
    output.setAttribute('aria-atomic', 'false');

    const row = document.createElement('div');
    row.id = 'help-input-row';
    const prompt = document.createElement('span');
    prompt.id = 'help-prompt';
    prompt.textContent = '>';
    input = document.createElement('input');
    input.id = 'help-input';
    input.type = 'text';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('placeholder', 'type help to start');
    row.append(prompt, input);

    panel.append(bar, output, row);
    document.body.append(fab, panel);

    closeBtn.addEventListener('click', closePanel);
  }

  function attachEvents() {
    fab.addEventListener('click', togglePanel);
    input.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', (e) => {
      if (isOpen && !panel.contains(e.target) && e.target !== fab) closePanel();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) closePanel();
    });
  }

  // ── Panel open/close ──────────────────────────────────────────────────────────

  function togglePanel() {
    isOpen ? closePanel() : openPanel();
  }

  function openPanel() {
    isOpen = true;
    panel.hidden = false;
    fab.classList.add('active');
    fab.setAttribute('aria-expanded', 'true');
    if (output.children.length === 0) printWelcome();
    requestAnimationFrame(() => input.focus());
  }

  function closePanel() {
    isOpen = false;
    panel.hidden = true;
    fab.classList.remove('active');
    fab.setAttribute('aria-expanded', 'false');
  }

  // ── Output helpers ────────────────────────────────────────────────────────────

  function print(cls, text) {
    const d = document.createElement('div');
    d.className = 'hl hl-' + cls;
    d.textContent = text;
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }

  function printWelcome() {
    print('msg', 'Viking MUD help system');
    print('msg', 'Type  help  to list all topics.');
    print('msg', 'Type  help <topic>  to read a topic.');
    print('msg', 'Press Tab to complete topic names.');
  }

  // ── File list ─────────────────────────────────────────────────────────────────

  async function fetchFileList() {
    const results = await Promise.allSettled(
      HELP_DIRS.map(dir =>
        fetch(dir + '/').then(r => r.ok ? r.text() : Promise.reject())
          .then(html => ({ dir, names: parseDirectoryListing(html) }))
      )
    );

    fileDir = {};
    for (const r of results) {
      if (r.status !== 'fulfilled') continue;
      const { dir, names } = r.value;
      for (const n of names) {
        if (!n || n.includes('.') || n === 'index') continue;
        if (WIZARD_DIRS.has(n)) continue;  // skip wizard command dirs (com/s, com/w)
        if (!(n in fileDir)) fileDir[n] = dir;  // first-found wins
      }
    }
    fileList = Object.keys(fileDir).sort();
  }

  function parseDirectoryListing(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href]');
    const results = [];
    for (const a of links) {
      const href = a.getAttribute('href');
      // skip directories (trailing /), parent dir, query strings, absolute URLs, hidden files
      if (!href || href.endsWith('/') || href.startsWith('?') || href.startsWith('/') ||
          href.startsWith('http') || href.startsWith('.') || href === '..') continue;
      results.push(decodeURIComponent(href));
    }
    return results;
  }

  // ── Command processing ────────────────────────────────────────────────────────

  function processCommand(raw) {
    const cmd = raw.trim();
    if (!cmd) return;

    history.unshift(cmd);
    if (history.length > 100) history.pop();
    historyPos = -1;
    pendingInput = '';

    print('cmd', '> ' + cmd);

    const lower = cmd.toLowerCase();
    if (lower === 'help') {
      doHelp(null);
    } else if (lower.startsWith('help ')) {
      doHelp(lower.slice(5).trim());
    } else if (lower === 'clear' || lower === 'cls') {
      output.innerHTML = '';
    } else {
      print('err', 'Unknown command "' + cmd + '". Type  help  for topics.');
    }
  }

  async function doHelp(topic) {
    if (!topic) {
      if (fileList.length === 0) {
        await fetchFileList();
      }
      if (fileList.length === 0) {
        print('err', 'Could not fetch topic list from server.');
        return;
      }
      printFileList();
      return;
    }

    const key = topic.toLowerCase();

    if (cache[key]) {
      renderFile(key, cache[key]);
      return;
    }

    const dir = fileDir[key];
    const dirs = dir ? [dir] : HELP_DIRS;  // known dir first, else try all

    let found = false;
    for (const d of dirs) {
      try {
        const res = await fetch(d + '/' + encodeURIComponent(key));
        if (!res.ok) continue;
        const text = await res.text();
        cache[key] = text;
        renderFile(key, text);
        found = true;
        break;
      } catch (_) { /* try next */ }
    }
    if (!found) print('err', 'No help file found for "' + key + '".');
  }

  function printFileList() {
    print('hdr', 'Help topics (' + fileList.length + '):');
    // lay out in 4 columns
    const COL_W = 20;
    const COLS = 4;
    const rows = Math.ceil(fileList.length / COLS);
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < COLS; c++) {
        const i = r + c * rows;
        if (i < fileList.length) line += fileList[i].padEnd(COL_W);
      }
      print('lst', line.trimEnd());
    }
  }

  // ── Color-code renderer ───────────────────────────────────────────────────────

  const FG_CODES = new Set([
    'BLACK','RED','GREEN','YELLOW','BLUE','MAGENTA','CYAN','WHITE','GREY',
    'L_BLACK','L_RED','L_GREEN','L_YELLOW','L_BLUE','L_MAGENTA','L_CYAN','L_WHITE','L_GREY'
  ]);
  const BG_CODES = new Set([
    'B_BLACK','B_RED','B_GREEN','B_YELLOW','B_BLUE','B_MAGENTA','B_CYAN','B_WHITE','B_GREY'
  ]);
  const ATTR_CODES = new Set(['BOLD','UNDERLINE','BLINK','INVERSE']);

  function parseColors(text) {
    let fg = null, bg = null;
    const attrs = new Set();
    const TOKEN = /%\^([A-Z_]+)%\^/g;
    let html = '';
    let last = 0;

    function flush(raw) {
      if (!raw) return;
      const safe = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const cls = [];
      if (fg)            cls.push('hc-' + fg.toLowerCase().replace(/_/g, '-'));
      if (bg)            cls.push('hc-' + bg.toLowerCase().replace(/_/g, '-'));
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
      } else if (FG_CODES.has(code)) {
        fg = code;
      } else if (BG_CODES.has(code)) {
        bg = code;
      } else if (ATTR_CODES.has(code)) {
        attrs.add(code);
      }
      // ESC and unknown tokens: ignore
    }
    flush(text.slice(last));
    return html;
  }

  function renderFile(name, text) {
    print('hdr', '── ' + name + ' ──');
    const d = document.createElement('div');
    d.className = 'hl hl-txt';
    d.innerHTML = parseColors(text);
    output.appendChild(d);
    output.scrollTop = output.scrollHeight;
  }

  // ── Input handling ────────────────────────────────────────────────────────────

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      const val = input.value;
      input.value = '';
      resetTab();
      processCommand(val);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      doTab();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyPos === -1) pendingInput = input.value;
      if (historyPos < history.length - 1) {
        historyPos++;
        input.value = history[historyPos];
        moveCaretToEnd();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyPos > 0) {
        historyPos--;
        input.value = history[historyPos];
      } else if (historyPos === 0) {
        historyPos = -1;
        input.value = pendingInput;
      }
      moveCaretToEnd();
      return;
    }

    resetTab();
  }

  function moveCaretToEnd() {
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }

  // ── Tab completion ────────────────────────────────────────────────────────────

  function doTab() {
    const val = input.value;
    const m = val.match(/^(help\s+)(\S*)$/i);
    if (!m) return;

    const prefix = m[1];
    const partial = m[2].toLowerCase();

    if (tabMatches.length === 0) {
      tabMatches = fileList.filter(f => f.toLowerCase().startsWith(partial));
      tabIndex = -1;
    }

    if (tabMatches.length === 0) return;

    if (tabMatches.length === 1) {
      input.value = prefix + tabMatches[0];
      resetTab();
      return;
    }

    tabIndex = (tabIndex + 1) % tabMatches.length;
    input.value = prefix + tabMatches[tabIndex];
  }

  function resetTab() {
    tabMatches = [];
    tabIndex = -1;
  }

  // ── Bootstrap ─────────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
