document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('ages-container');
  if (!container) return;

  fetch('ages.txt')
    .then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    })
    .then(text => {
      const entries = [];
      for (const line of text.trim().split('\n')) {
        const m = line.match(/^(\d+)\.\s+(\S+)\s+(.+)$/);
        if (!m) continue;
        const [, rank, name, timeStr] = m;
        const days  = parseInt((timeStr.match(/(\d+) days?/)    || [0,0])[1], 10);
        const hours = parseInt((timeStr.match(/(\d+) hours?/)   || [0,0])[1], 10);
        const mins  = parseInt((timeStr.match(/(\d+) minutes?/) || [0,0])[1], 10);
        const totalDays = days;
        const years = Math.floor(totalDays / 365.25);
        const remDays = totalDays - Math.floor(years * 365.25);
        entries.push({ rank: parseInt(rank, 10), name, totalDays, years, remDays, hours, mins });
      }

      if (!entries.length) {
        container.innerHTML = '<p class="mono">No data available.</p>';
        return;
      }

      // Build table
      let rows = '';
      for (const e of entries) {
        const age = formatAge(e.years, e.remDays, e.hours, e.mins);
        rows += `<tr><td>${e.rank}</td><td>${e.name}</td><td>${age}</td></tr>`;
      }

      container.innerHTML =
        '<table class="rank-table" aria-label="Ages of the realm">' +
          '<thead><tr>' +
            '<th scope="col">#</th>' +
            '<th scope="col">Name</th>' +
            '<th scope="col">Age</th>' +
          '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>';
    })
    .catch(() => {
      container.innerHTML = '<p class="mono">Could not load ages from server.</p>';
    });
});

function formatAge(years, days, hours, mins) {
  const parts = [];
  if (years > 0) parts.push(years + ' year' + (years !== 1 ? 's' : ''));
  parts.push(days + ' day' + (days !== 1 ? 's' : ''));
  parts.push(hours + 'h ' + mins + 'm');
  return parts.join(' · ');
}
