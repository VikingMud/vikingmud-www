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

const SCRIPT = [
  { delay: 500,  cls: 'sys',   text: 'Trying 194.63.250.163...' },
  { delay: 500,  cls: 'sys',   text: 'Connected to connect.vikingmud.org.' },
  { delay: 200,  cls: 'sys',   text: "Escape character is '^]'." },
  { delay: 500,  cls: 'desc',  text: BANNER },
  { delay: 600,  cls: 'sys',   text: "\n       Use the name 'guest' if you just want a look." },
  { delay: 200,  cls: 'desc',  text: '       There are currently nine players on.' },
  { delay: 900,  cls: 'you',   text: 'What is your name: guest' },
  { delay: 1200, cls: 'sys',   text: '\nWelcome, guest. You wake at the altar of Odin.' },
  { delay: 600,  cls: 'room',  text: '\nThe mound where the altar to Odin stands' },
  { delay: 200,  cls: 'desc',  text: 'This is the mound where the altar to Odin stands. It was built by the\nviking warriors that burnt down the old village church. Here ghosts may\npray to Odin to be revived. North of here are the ruins of the old\nvillage church. There is a hole in the ground here. Laughter and happy\nvoices can be heard from the west where Newbieville and the Funhouse\nare located.  A beautiful temple gleams in the light of day.' },
  { delay: 200,  cls: 'exits', text: '    There are seven obvious exits: academy, east, north, northeast, south, temple and west' },
  { delay: 200,  cls: 'desc',  text: 'A shimmering portal [newbieland] is here.' },
];

const termBody   = document.getElementById('term-body');
const termInput  = document.getElementById('term-input');
const termStatus = document.getElementById('term-status');
let scriptDone = false;

function addLine(cls, text) {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  termBody.appendChild(div);
  termBody.scrollTop = termBody.scrollHeight;
}

let t = 0;
SCRIPT.forEach((step, i) => {
  t += step.delay;
  setTimeout(() => {
    addLine(step.cls, step.text);
    if (i === SCRIPT.length - 1) {
      scriptDone = true;
      termInput.disabled = false;
      termInput.placeholder = "type a command — e.g. 'east', 'look', 'sing'";
      termStatus.textContent = 'ready';
      termInput.focus();
    }
  }, t);
});

function termSubmit(e) {
  e.preventDefault();
  if (!scriptDone) return;
  const cmd = termInput.value.trim();
  if (!cmd) return;
  termInput.value = '';
  addLine('you', '> ' + cmd);
  const lc = cmd.toLowerCase();
  if (lc === 'look' || lc === 'l') {
    addLine('room', '\nThe mound where the altar to Odin stands');
    addLine('desc', 'The altar stone is cold beneath your hands. Ravens circle overhead.');
    addLine('exits', '    [ exits: academy  east  north  northeast  south  temple  west ]');
  } else if (lc === 'north' || lc === 'n') {
    addLine('room', '\nRuins of the old village church');
    addLine('desc', 'Charred timbers and frost-bitten stone. A crow regards you from the eave.');
    addLine('exits', '    [ exits: south ]');
  } else if (lc === 'west' || lc === 'w') {
    addLine('room', '\nNewbieville — the Funhouse');
    addLine('desc', 'Laughter drifts from somewhere inside. New arrivals mill about, uncertain.');
    addLine('exits', '    [ exits: east  north  south ]');
  } else if (lc === 'inventory' || lc === 'inv' || lc === 'i') {
    addLine('sys', 'You are carrying nothing. You arrived with only your name.');
  } else if (lc === 'who') {
    addLine('sys', `${liveUsercount} soul${liveUsercount !== 1 ? 's' : ''} wander the realm. Connect to see who.`);
  } else {
    addLine('sys', 'A raven carries your words into the dark. Connect to the live realm to be heard.');
  }
  termInput.focus();
}

document.getElementById('term-form').addEventListener('submit', termSubmit);

// ── Live server info ─────────────────────────────────────────────────────────

let liveUsercount = 9;

function briefUptime(s) {
  // "1 hour, 22 minutes and 30 seconds" → "1 hour, 22 minutes"
  return s.replace(/\s*and\s+\d+\s+seconds?\.?$/i, '').replace(/,\s*$/, '').trim();
}

async function refreshLive() {
  try {
    const res = await fetch('help/webinfo.json?t=' + Date.now());
    if (!res.ok) return;
    const { usercount, uptime } = await res.json();
    liveUsercount = usercount;
    const brief = briefUptime(uptime);

    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    set('live-nav-status',    `${usercount} online · uptime ${brief}`);
    set('live-hero-online',   `${usercount} souls online`);
    set('live-intro-online',  usercount);
    set('live-conn-status',   `● Online · ${brief}`);
    set('live-conn-players',  usercount);
  } catch (_) { /* stale values are fine */ }
}

refreshLive();
setInterval(refreshLive, 60_000);

// ─────────────────────────────────────────────────────────────────────────────

document.getElementById('copy-btn').addEventListener('click', () => {
  const btn = document.getElementById('copy-btn');
  navigator.clipboard?.writeText('telnet vikingmud.org 2001');
  btn.textContent = 'Copied ✓';
  setTimeout(() => { btn.textContent = 'Copy'; }, 1600);
});
