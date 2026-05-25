document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('elders-container');
  if (!container) return;

  fetch('/new/help/elders')
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(text => {
      const entries = [];
      let inTable = false;
      for (const line of text.split('\n')) {
        if (/^Name\s+Active years/i.test(line)) { inTable = true; continue; }
        if (!inTable) continue;
        if (/^SEE ALSO/i.test(line)) break;
        const trimmed = line.trim();
        if (!trimmed) continue;
        const m = trimmed.match(/^(\S+)\s{2,}(.+?)\s{2,}(.+)$/);
        if (!m) continue;
        entries.push({ name: m[1], years: m[2].trim(), responsibilities: m[3].trim() });
      }

      if (!entries.length) {
        container.innerHTML = '<p class="mono">No data available.</p>';
        return;
      }

      let rows = '';
      for (const e of entries) {
        rows += `<tr><td>${e.name}</td><td>${e.years.replace(/ - /g, ' – ')}</td><td>${e.responsibilities}</td></tr>`;
      }

      container.innerHTML =
        '<table class="rank-table" aria-label="Elder Archwizards">' +
          '<thead><tr>' +
            '<th scope="col">Name</th>' +
            '<th scope="col">Active Years</th>' +
            '<th scope="col">Responsibilities</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>';
    })
    .catch(() => {
      container.innerHTML = '<p class="mono">Could not load elder archwizards.</p>';
    });
});
