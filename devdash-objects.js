// Viking MUD — Object type reference panel for Wizard Dashboard
(function () {
  'use strict';

  const META_URL = 'devdash-meta.json';

  let meta = null;       // full parsed devdash-meta.json
  let typeMap = {};      // id → type entry
  let reverseMap = {};   // id → [ids that directly inherit it]

  // ── Type linkifier ───────────────────────────────────────────────────────────
  function linkifyTypes(container) {
    const ids = Object.keys(typeMap);
    if (!ids.length) return;

    // Sort longest first so I_RWMONSTER matches before I_RMONSTER
    const pattern = new RegExp(
      '\\b(' + ids.sort((a, b) => b.length - a.length).join('|') + ')\\b',
      'g'
    );

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) {
      let p = n.parentNode;
      let skip = false;
      while (p && p !== container) {
        if (p.tagName === 'BUTTON' || p.tagName === 'A') { skip = true; break; }
        p = p.parentNode;
      }
      if (!skip) nodes.push(n);
    }

    nodes.forEach(textNode => {
      pattern.lastIndex = 0;
      if (!pattern.test(textNode.nodeValue)) return;

      const frag = document.createDocumentFragment();
      let last = 0;
      let m;
      const text = textNode.nodeValue;
      pattern.lastIndex = 0;
      while ((m = pattern.exec(text)) !== null) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const typeId = m[1];
        const btn = document.createElement('button');
        btn.className = 'typeref-inline-link';
        btn.setAttribute('type', 'button');
        btn.textContent = typeId;
        btn.addEventListener('click', () => showTypeDetail(typeId));
        frag.appendChild(btn);
        last = m.index + typeId.length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      textNode.parentNode.replaceChild(frag, textNode);
    });
  }

  // ── Ancestor resolution ─────────────────────────────────────────────────────
  function ancestorsOf(typeId) {
    const seen = new Set();
    function walk(id) {
      if (seen.has(id)) return;
      seen.add(id);
      (typeMap[id]?.inherits || []).forEach(walk);
    }
    walk(typeId);
    return [...seen];
  }

  // ── Right panel ─────────────────────────────────────────────────────────────
  function renderObjectsPanel() {
    const el = document.getElementById('devdash-objects-panel');
    if (!el) return;

    const section = el.closest('.devdash-rsec');
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
      section.setAttribute('aria-expanded', 'false');
      el.hidden = true;
      const toggle = () => {
        const open = section.getAttribute('aria-expanded') === 'true';
        section.setAttribute('aria-expanded', String(!open));
        el.hidden = open;
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    }

    const frag = document.createDocumentFragment();
    meta.types.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'devdash-hook';
      btn.setAttribute('type', 'button');
      btn.dataset.typeId = t.id;
      btn.title = t.label;
      btn.textContent = t.id;
      btn.addEventListener('click', () => showTypeDetail(t.id));
      frag.appendChild(btn);
    });
    el.appendChild(frag);
  }

  // ── Type detail view ─────────────────────────────────────────────────────────
  function showTypeDetail(typeId) {
    const api = window.devdash;
    if (!api) return;
    const esc = api.esc;

    const t = typeMap[typeId];
    if (!t) return;

    const ancestorIds = ancestorsOf(typeId);

    // ── Hooks: all hooks available to this type or any ancestor ──────────────
    const hookTypes = meta.hookTypes;
    const ownHooks = [];       // hooks declared directly on this type
    const inheritedHooks = []; // hooks declared on an ancestor

    Object.entries(hookTypes).forEach(([hook, types]) => {
      if (!types.length) return;
      if (types.includes(typeId)) {
        ownHooks.push(hook);
      } else if (types.some(id => ancestorIds.includes(id))) {
        inheritedHooks.push(hook);
      }
    });
    ownHooks.sort();
    inheritedHooks.sort();
    const allHooks = [...ownHooks, ...inheritedHooks];

    // ── Properties: categories that apply to this type or its ancestors ───────
    let propCategories = [];
    ancestorIds.forEach(aid => {
      (typeMap[aid]?.propTypes || []).forEach(cat => {
        if (!propCategories.includes(cat)) propCategories.push(cat);
      });
    });
    const props = api.getPropsForCategories ? api.getPropsForCategories(propCategories) : [];
    props.sort((a, b) => a.name.localeCompare(b.name));

    // ── Functions: collected per ancestor level (most specific first) ─────────
    const fnsBySource = [];
    // Walk ancestor chain in BFS order to preserve hierarchy
    const queue = [typeId];
    const visited = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      const entry = typeMap[id];
      if (!entry) continue;
      const fns = entry.functions || [];
      if (fns.length) fnsBySource.push({ typeId: id, label: entry.label, fns });
      (entry.inherits || []).forEach(p => queue.push(p));
    }

    // ── Build ancestry chain label ────────────────────────────────────────────
    function chainLabel(id) {
      const parents = typeMap[id]?.inherits || [];
      if (!parents.length) return esc(id);
      return esc(id) + ' → ' + parents.map(chainLabel).join(', ');
    }
    const ancestryStr = (t.inherits || []).map(p => chainLabel(p)).join(', ');
    const subtypes = reverseMap[typeId] || [];

    // ── Reveal viewer ─────────────────────────────────────────────────────────
    api.revealViewer('objtype/' + typeId, 'type: ' + typeId);

    // Mark active chip in right panel
    document.querySelectorAll('#devdash-objects-panel .devdash-hook').forEach(btn => {
      btn.classList.toggle('devdash-active', btn.dataset.typeId === typeId);
    });

    const viewerBody = document.getElementById('devdash-viewer-body');
    if (!viewerBody) return;

    // ── Hooks HTML ────────────────────────────────────────────────────────────
    let hooksHtml = '';
    if (allHooks.length) {
      const chips = allHooks.map(h => {
        const own = ownHooks.includes(h);
        return `<button class="devdash-hook${own ? ' typeref-own' : ''}" type="button" data-hook="${esc(h)}">${esc(h)}</button>`;
      }).join('');
      hooksHtml =
        `<h3 class="typeref-sec-head">` +
          `Hooks ` +
          `<span class="typeref-sec-count">${allHooks.length}</span>` +
          (ownHooks.length ? ` <span class="typeref-sec-note">${ownHooks.length} direct</span>` : '') +
        `</h3>` +
        `<div class="typeref-chips">${chips}</div>`;
    } else {
      hooksHtml = `<h3 class="typeref-sec-head">Hooks <span class="typeref-sec-count">0</span></h3><p class="typeref-none">None.</p>`;
    }

    // ── Properties HTML ───────────────────────────────────────────────────────
    let propsHtml = '';
    if (props.length) {
      const chips = props.map(p =>
        `<button class="devdash-hook" type="button" data-prop="${esc(p.name)}">${esc(p.name)}</button>`
      ).join('');
      propsHtml =
        `<h3 class="typeref-sec-head">Properties <span class="typeref-sec-count">${props.length}</span></h3>` +
        `<div class="typeref-chips">${chips}</div>`;
    } else {
      propsHtml = `<h3 class="typeref-sec-head">Properties <span class="typeref-sec-count">0</span></h3><p class="typeref-none">None.</p>`;
    }

    // ── Functions HTML ────────────────────────────────────────────────────────
    let fnHtml = '';
    if (fnsBySource.length) {
      fnHtml = `<h3 class="typeref-sec-head">Functions</h3>`;
      fnsBySource.forEach(({ typeId: srcId, label, fns }) => {
        fnHtml +=
          `<div class="typeref-fn-group">` +
            `<span class="typeref-fn-src">${esc(srcId)}</span>` +
            fns.map(f => `<code class="typeref-fn">${esc(f)}</code>`).join('') +
          `</div>`;
      });
    } else {
      fnHtml = `<h3 class="typeref-sec-head">Functions <span class="typeref-sec-count">0</span></h3><p class="typeref-none">None documented.</p>`;
    }

    viewerBody.innerHTML =
      `<div class="prop-view typeref-view">` +
        `<div class="prop-eyebrow">Type Reference</div>` +
        `<h2 class="prop-name">${esc(typeId)}</h2>` +
        `<div class="typeref-label">${esc(t.label)}</div>` +
        (ancestryStr ? `<div class="typeref-ancestry">Inherits: ${ancestryStr}</div>` : '') +
        (subtypes.length
          ? `<div class="typeref-ancestry">Inherited by: ` +
              subtypes.map(id => `<button class="typeref-inline-link" type="button" data-subtype="${esc(id)}">${esc(id)}</button>`).join(' · ') +
            `</div>`
          : '') +
        `<div class="typeref-body">` +
          hooksHtml +
          propsHtml +
          fnHtml +
        `</div>` +
      `</div>`;

    // Wire subtype chips
    viewerBody.querySelectorAll('[data-subtype]').forEach(btn => {
      btn.addEventListener('click', () => showTypeDetail(btn.dataset.subtype));
    });
    // Wire hook chips
    viewerBody.querySelectorAll('[data-hook]').forEach(btn => {
      btn.addEventListener('click', () => api.openHook(btn.dataset.hook));
    });
    // Wire property chips
    viewerBody.querySelectorAll('[data-prop]').forEach(btn => {
      btn.addEventListener('click', () => api.openProperty(btn.dataset.prop));
    });
    // Linkify I_* type mentions in text (ancestry line, fn signatures, etc.)
    linkifyTypes(viewerBody);
  }

  // ── Deep link: ?p=objtype/I_MONSTER ──────────────────────────────────────────
  function processObjDeepLink() {
    const p = new URLSearchParams(location.search).get('p') || '';
    if (p.startsWith('objtype/')) {
      const id = p.slice(8);
      if (typeMap[id]) showTypeDetail(id);
    }
  }

  // ── Left panel tree branch ───────────────────────────────────────────────────
  function buildTypesBranchEl() {
    const esc = window.devdash.esc;
    const wrap = document.createElement('div');
    wrap.className = 'devdash-dir';

    const head = document.createElement('button');
    head.className = 'devdash-dir-head';
    head.setAttribute('aria-expanded', 'false');
    head.setAttribute('type', 'button');
    head.innerHTML =
      `<span class="dd-arrow" aria-hidden="true">▶</span>` +
      `<span class="dd-name">types</span>` +
      `<span class="dd-count">${meta.types.length}</span>`;

    const body = document.createElement('div');
    body.className = 'devdash-dir-body';
    body.hidden = true;

    meta.types.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'devdash-file';
      btn.setAttribute('type', 'button');
      btn.dataset.path = 'objtype/' + t.id;
      btn.textContent = t.id;
      btn.addEventListener('click', () => showTypeDetail(t.id));
      body.appendChild(btn);
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

  // ── Bootstrap ─────────────────────────────────────────────────────────────────
  async function init() {
    try {
      const r = await fetch(META_URL);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      meta = await r.json();
    } catch (e) {
      console.warn('devdash-objects: could not load meta:', e);
      return;
    }

    meta.types.forEach(t => { typeMap[t.id] = t; });
    meta.types.forEach(t => {
      (t.inherits || []).forEach(parentId => {
        if (!reverseMap[parentId]) reverseMap[parentId] = [];
        reverseMap[parentId].push(t.id);
      });
    });

    // Expose API so devdashboard.js can route objtype/ paths and call linkifyTypes
    window.devdashObjects = { showTypeDetail, linkifyTypes };

    // Right panel is independent of devdash ready state
    renderObjectsPanel();

    // Wait for devdashboard to finish building its index before touching search/tree
    await window.devdash.ready;

    // Register types in the search index
    window.devdash.addToSearch(
      meta.types.map(t => ({ path: 'objtype/' + t.id, name: t.id, section: 'types' }))
    );

    // Add types branch to the left panel tree
    window.devdash.appendTreeBranch(buildTypesBranchEl());

    // Handle deep link (devdashboard already skipped it, so we resolve it now)
    processObjDeepLink();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
