const BANNER =
`              /\\        ,                          .        /\\
             / _\\      /|   ||  //                 |\\      /_ \\
            /_/..\\    ///   || // o |  o      _    \\\\\\    /..\\_\\
             |  |    ///    ||//  | |/ | |/\\ / |    \\\\\\    |  |
             _\\(    ///     ||/   | |\\ | | | \\_|     \\\\\\    )/
            / --\\ \\///      |/  _______________/      \\\\\\/ /-- \\
            | | |\\/\\/                                  \\/\\/| | |
            |\\ \\|/\\/\\                                  /\\/\\|/ /|
            | \\__\\/     Hosted by Domeneshop, Norway     \\/__/ |
            |   |        Running since Feb 7th 1991        |   |`;

// ── Terminal replay ───────────────────────────────────────────────────────────

const termBody = document.getElementById('term-body');
let demoTimers = [];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addLine(cls, text) {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  termBody.appendChild(div);
  termBody.scrollTop = termBody.scrollHeight;
}


function addEndMsg() {
  const div = document.createElement('div');
  div.className = 'demo-end';
  div.textContent = '— Connect to play it for real! —';
  termBody.appendChild(div);
  termBody.scrollTop = termBody.scrollHeight;
}

function buildSteps() {
  const steps = [];
  let t = 0;
  const CD = 85; // ms per character

  function after(ms, fn) { t += ms; steps.push({ at: t, fn }); }
  function skip(ms)      { t += ms; } // advance time without scheduling a step

  // Plain input line (login / password): label appears, then text is typed after a think pause
  function typeInput(promptDelay, thinkDelay, label, input) {
    let div = null;
    after(promptDelay, () => {
      div = document.createElement('div');
      div.className = 'you';
      div.innerHTML = `${esc(label)}<span class="tcmd"></span>`;
      termBody.appendChild(div);
      termBody.scrollTop = termBody.scrollHeight;
    });
    skip(thinkDelay);
    for (const ch of input) {
      const c = ch;
      after(CD, () => { div?.querySelector('.tcmd')?.append(c); termBody.scrollTop = termBody.scrollHeight; });
    }
  }

  // In-game command: prompt appears immediately, then command is typed after a think pause
  function typeCmd(promptDelay, thinkDelay, sp, cmd) {
    let div = null;
    after(promptDelay, () => {
      div = document.createElement('div');
      div.className = 'you';
      div.innerHTML = `<span class="mud-prompt">HP: 50 SP: ${sp} &gt; </span><span class="tcmd"></span>`;
      termBody.appendChild(div);
      termBody.scrollTop = termBody.scrollHeight;
    });
    skip(thinkDelay);
    for (const ch of cmd) {
      const c = ch;
      after(CD, () => { div?.querySelector('.tcmd')?.append(c); termBody.scrollTop = termBody.scrollHeight; });
    }
  }

  // Connection handshake
  after(400,  () => addLine('sys',  'Trying 194.63.250.163...'));
  after(300,  () => addLine('sys',  'Connected to connect.vikingmud.org.'));
  after(200,  () => addLine('sys',  "Escape character is '^]'."));
  after(400,  () => addLine('desc', BANNER));
  after(500,  () => addLine('sys',  "\n       Use the name 'guest' if you just want a look."));
  after(200,  () => addLine('desc', '       There are currently nine players on.'));

  // Login — name and password typed in
  typeInput(600, 1200, 'What is your name: ', 'newdude');
  after(400,  () => addLine('sys',  'New player.  You must have a password.'));
  typeInput(150, 900, 'Password: ', '·······');
  after(500,  () => addLine('sys',  '\nYou have been born into the world of the Vikings!\n'));
  after(200,  () => addLine('sys',  'You are now Newdude the utter novice (level 1).'));

  // Academy entrance
  after(500,  () => addLine('desc', 'You are standing in front of a large temple-like structure. Gold clad ivory\ntowers pierce the skies and great walls of smooth rock tear viciously into the\nground. This is the Academy, raised by the mighty Odin in the age before life.'));
  after(150,  () => addLine('exits','    There are two obvious exits: church and north'));
  after(150,  () => addLine('desc', "Type 'north' to enter the academy, or 'church' to leave for the\nreal world of Vikings."));

  // church — prompt appears right away, player thinks then types
  typeCmd(150, 1800, 1, 'church');
  after(400,  () => addLine('desc', 'This is the mound where the altar to Odin stands. It was built by the viking\nwarriors that burnt down the old village church. Here ghosts may pray to Odin to\nbe revived. North of here are the ruins of the old village church. There is a\nhole in the ground here. Laughter and happy voices can be heard from the west\nwhere Newbieville and the Funhouse are located.  A beautiful temple gleams in\nthe light of day.'));
  after(100,  () => addLine('exits','    There are seven obvious exits: academy, east, north, northeast,\nsouth, temple and west'));
  after(100,  () => addLine('desc', 'a shimmering portal [newbieland]'));

  // e — grass field
  typeCmd(150, 1800, 1, 'e');
  after(400,  () => addLine('desc', 'You are on an open grass field, which lies west of the pub. Further to the west\na ruin can be seen. A large part of the field is covered by a huge round net,\nwhich is kept up by at least ten wooden logs. A large catapult is placed beside\nthe net.'));
  after(100,  () => addLine('exits','    There are four obvious exits: east, north, south and west'));
  after(100,  () => addLine('desc', 'a gnome with bulging muscles\na little gnome in a grey robe'));

  // e — arena path
  typeCmd(150, 1800, 1, 'e');
  after(400,  () => addLine('desc', 'You are on a short path leading towards the Arena.  There is some small\nshrubbery lining the road all the way to the entrance. There is a small yard to\nthe east and if you continue north you will reach the entrance.'));
  after(100,  () => addLine('exits','    There are three obvious exits: east, north and west'));

  // e — small yard with knife
  typeCmd(150, 1800, 1, 'e');
  after(400,  () => addLine('desc', 'A small yard surrounded by houses. Adventure lies to the north. A small house\nlies on a corner to the northeast.'));
  after(100,  () => addLine('exits','    There are five obvious exits: east, north, northeast, south and\nwest'));
  after(100,  () => addLine('desc', 'knife\na poor beggar'));

  // get knife
  typeCmd(150, 1800, 4, 'get knife');
  after(400,  () => addLine('sys',  'Ok.'));

  // i — inventory
  typeCmd(150, 1800, 4, 'i');
  after(400,  () => addLine('desc', ' Knife'));

  // wield knife
  typeCmd(150, 1800, 4, 'wield knife');
  after(400,  () => addLine('sys',  'You now wield knife in right hand.'));

  // End message, then show play button again
  after(1600, () => addEndMsg());
  after(3200, () => showDemoButton());

  return steps;
}

function showDemoButton() {
  const btn = document.getElementById('demo-play-btn');
  if (btn) btn.hidden = false;
  const status = document.getElementById('term-status');
  if (status) status.textContent = 'idle';
}

function playDemo() {
  demoTimers.forEach(id => clearTimeout(id));
  demoTimers = [];
  termBody.innerHTML = '';
  const status = document.getElementById('term-status');
  if (status) status.textContent = 'demo · playing';
  buildSteps().forEach(({ at, fn }) => {
    demoTimers.push(setTimeout(fn, at));
  });
}

document.getElementById('demo-play-btn')?.addEventListener('click', () => {
  const btn = document.getElementById('demo-play-btn');
  if (btn) btn.hidden = true;
  playDemo();
});

// ── News loader ───────────────────────────────────────────────────────────────

function parseNews(text) {
  return text.split(/\n---\n/).map(block => block.trim()).filter(Boolean).map(block => {
    const lines = block.split('\n');
    const meta = {};
    let bodyStart = 0;
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^(\w+):\s*(.+)/);
      if (m) { meta[m[1]] = m[2].trim(); bodyStart = i + 1; }
      else { bodyStart = i; break; }
    }
    meta.excerpt = lines.slice(bodyStart).join(' ').replace(/\s+/g, ' ').trim();
    return meta;
  });
}

function fmtDate(iso) {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function renderNews(items) {
  const grid = document.getElementById('news-grid');
  if (!grid) return;
  const total = items.length;
  grid.innerHTML = items.map((item, i) => `
    <article class="news-item${item.feature === 'true' ? ' feature' : ''}">
      <div class="row">
        <span class="news-tag">${item.tag}</span>
        <span class="news-date">${fmtDate(item.date)}</span>
      </div>
      <h3 class="news-title">${item.title}</h3>
      ${item.author ? `<span class="news-author">${item.author}</span>` : ''}
      <p class="news-excerpt">${item.excerpt}</p>
      <div class="news-foot"><span>${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></div>
    </article>`).join('');

  const latest = items.reduce((a, b) => a.date > b.date ? a : b);
  const el = document.getElementById('live-news-date');
  if (el) el.textContent = `News · ${fmtDate(latest.date)}`;
}

async function loadNews() {
  try {
    const res = await fetch('news.txt?t=' + Date.now());
    if (!res.ok) return;
    renderNews(parseNews(await res.text()));
  } catch (_) {}
}

loadNews();

// ── Live server info ──────────────────────────────────────────────────────────

function briefUptime(s) {
  return s.replace(/\s*and\s+\d+\s+seconds?\.?$/i, '').replace(/,\s*$/, '').trim();
}

async function refreshLive() {
  try {
    const res = await fetch('webinfo.json?t=' + Date.now());
    if (!res.ok) return;
    const { usercount, uptime } = await res.json();
    const brief = briefUptime(uptime);
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('live-nav-status',   `${usercount} online · uptime ${brief}`);
    set('live-hero-online',  `${usercount} souls online`);
    set('live-intro-online', usercount);
    set('live-conn-status',  `● Online · ${brief}`);
    set('live-conn-reboot',  `● Autoreboots after ${brief}`);
    set('live-conn-players', usercount);
  } catch (_) {}
}

refreshLive();
setInterval(refreshLive, 60_000);

// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('copy-btn')?.addEventListener('click', () => {
  const btn = document.getElementById('copy-btn');
  navigator.clipboard?.writeText('telnet vikingmud.org 2001');
  btn.textContent = 'Copied ✓';
  setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
});
