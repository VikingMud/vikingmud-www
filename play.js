(function () {
  'use strict';

  var MUD_WSS = 'wss://connect.vikingmud.org:2002';

  var term = new Terminal({
    cursorBlink:     true,
    convertEol:      true,
    scrollback:      5000,
    fontSize:        14,
    fontFamily:      '"IBM Plex Mono", Menlo, Consolas, "Courier New", monospace',
    fontWeight:      '400',
    fontWeightBold:  '600',
    theme: {
      background:          '#07090d',
      foreground:          '#d4b472',
      cursor:              '#e9e2cf',
      cursorAccent:        '#07090d',
      selectionBackground: '#2a2314',
      black:   '#1a1a1a', brightBlack:   '#555555',
      red:     '#cc4444', brightRed:     '#ff6666',
      green:   '#44aa44', brightGreen:   '#66cc66',
      yellow:  '#ccaa33', brightYellow:  '#ffcc55',
      blue:    '#4466cc', brightBlue:    '#6699ff',
      magenta: '#aa44aa', brightMagenta: '#cc66cc',
      cyan:    '#44aaaa', brightCyan:    '#66cccc',
      white:   '#bbbbbb', brightWhite:   '#ffffff',
    },
  });

  var fit = new FitAddon.FitAddon();
  term.loadAddon(fit);

  // Wait for all fonts to settle so xterm measures character width correctly
  document.fonts.ready.then(function () {
    term.open(document.getElementById('term-box'));
    requestAnimationFrame(function () {
      fit.fit();
      cmdEl.focus();
    });
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { fit.fit(); }, 50);
  });

  var dot       = document.getElementById('dot');
  var connLabel = document.getElementById('conn-label');
  var cmdEl     = document.getElementById('cmd');
  var history   = [];
  var histPos   = -1;

  function setStatus(cls, label) {
    dot.className = 'conn-dot ' + cls;
    dot.title = label;
    connLabel.textContent = label;
  }

  var ws = new WebSocket(MUD_WSS);

  ws.onopen = function () {
    setStatus('ok', 'connected');
    cmdEl.focus();
  };
  ws.onclose = function () {
    setStatus('err', 'disconnected');
    term.write('\r\n\x1b[31m[Connection closed]\x1b[0m\r\n',
      function () { term.scrollToBottom(); });
  };
  ws.onerror = function () {
    setStatus('err', 'error');
  };
  ws.onmessage = function (e) {
    var data = e.data instanceof ArrayBuffer
      ? new TextDecoder().decode(e.data)
      : e.data;
    term.write(data, function () { term.scrollToBottom(); });
  };

  function send() {
    var val = cmdEl.value;
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(val + '\n');
    term.write(val + '\r\n');
    if (val.length > 0) {
      history.unshift(val);
      if (history.length > 200) history.pop();
    }
    histPos = -1;
    cmdEl.value = '';
  }

  document.getElementById('sendbtn').addEventListener('click', send);

  cmdEl.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault(); send();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (histPos < history.length - 1) cmdEl.value = history[++histPos];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histPos > 0) { cmdEl.value = history[--histPos]; }
      else { histPos = -1; cmdEl.value = ''; }
    }
  });

  document.getElementById('term-box').addEventListener('click', function () {
    cmdEl.focus();
  });
}());
