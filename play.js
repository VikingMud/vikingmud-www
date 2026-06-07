(function () {
  'use strict';

  var MUD_WSS = 'wss://connect.vikingmud.org:2002';

  // Cached safe column count — set by measureSafeCols() after each fit.
  // Conservative default until the first measurement runs.
  var safeCols = 70;

function measureSafeCols() {
  var xtermEl = term.element;
  if (!xtermEl) { 
    safeCols = Math.max(20, (term.cols || 80) - 4); 
    return; 
  }

  var viewport = xtermEl.querySelector('.xterm-viewport');
  if (viewport) {
    var usablePx = viewport.clientWidth; // Width of the container minus scrollbars

    if (usablePx > 0) {
      // 1. Create a dummy element to measure actual font character width
      var dummy = document.createElement('span');
      
      // Pull font options directly from the xterm instance
      dummy.style.fontFamily = term.options.fontFamily || 'monospace';
      dummy.style.fontSize = (term.options.fontSize || 15) + 'px';
      dummy.style.letterSpacing = term.options.letterSpacing || 'normal';
      
      // Hide it from view but keep it measurable
      dummy.style.position = 'absolute';
      dummy.style.visibility = 'hidden';
      dummy.style.whiteSpace = 'pre';
      
      // Use a repeating character string to smooth out subpixel rounding issues
      dummy.textContent = 'WWWWWWWWWW'; 
      document.body.appendChild(dummy);
      
      // 2. Calculate the exact width of a single cell 
	var cellPx = (dummy.getBoundingClientRect().width / 10) * 1.1; // Works with 1.1.. not 1.0 Why?
      document.body.removeChild(dummy);

      if (cellPx > 0) {
        // 3. Divide real real estate by real character width
        safeCols = Math.max(20, Math.floor(usablePx / cellPx) - 4);
        return;
      }
    }
  }

  // Fallback if DOM measurements fail
  safeCols = Math.max(20, (term.cols || 80) - 4);
}
    


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
      fit.fit(); measureSafeCols();
      // Re-fit after fonts fully apply to ensure correct cell-width measurement
      setTimeout(function () { fit.fit(); measureSafeCols(); }, 150);
      cmdEl.focus();
    });
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { fit.fit(); measureSafeCols(); }, 50);
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
  // Buffer incomplete lines across WebSocket messages so word-wrap sees full lines.
  var lineBuf = '';
  var promptTimer = null;

  function flushPrompt() {
    clearTimeout(promptTimer);
    promptTimer = null;
    if (!lineBuf) return;
    var vis = lineBuf.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');
    var out = vis.length >= safeCols ? wrapLine(lineBuf, safeCols) : lineBuf;
    term.write(out, function () { term.scrollToBottom(); });
    lineBuf = '';
  }

  ws.onmessage = function (e) {
    clearTimeout(promptTimer);
    var data = e.data instanceof ArrayBuffer
      ? new TextDecoder().decode(e.data)
      : e.data;

    // Append to buffer; normalise line endings
    var text = (lineBuf + data).replace(/\r\n/g, '\n');
    lineBuf = '';

    var lastNl = text.lastIndexOf('\n');
    if (lastNl === -1) {
      // No complete line yet (e.g. prompt fragment) — show after a short pause
      lineBuf = text;
      promptTimer = setTimeout(flushPrompt, 80);
      return;
    }

    // Split into complete lines and a possible trailing prompt fragment
    var complete = text.slice(0, lastNl + 1);
    lineBuf = text.slice(lastNl + 1);

    term.write(wrapText(complete), function () { term.scrollToBottom(); });

    if (lineBuf) { promptTimer = setTimeout(flushPrompt, 80); }
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

  function wrapText(text) {
    // text is already \n-normalised and contains only complete lines
    var ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g;
    var lines = text.split('\n');
    var out = '';
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (!line) { out += '\r\n'; continue; }
      var vis = line.replace(ANSI, '');
      out += (vis.length >= safeCols ? wrapLine(line, safeCols) : line) + '\r\n';
    }
    return out;
  }

  function wrapLine(line, cols) {
    var rows = [];
    while (line.length > 0) {
      // Count visible chars up to cols, track last space position
      var visCount = 0;
      var lastSpaceAt = -1; // index in `line` of last space within cols
      var i = 0;
      while (i < line.length && visCount < cols) {
        var ansi = line.slice(i).match(/^\x1b\[[0-9;?]*[A-Za-z]/);
        if (ansi) { i += ansi[0].length; continue; }
        if (line[i] === ' ') { lastSpaceAt = i; }
        visCount++;
        i++;
      }
	console.log("VisCount is: "+visCount+" i is: "+i+ " line length is:"+line.length);	
      if (i >= line.length) {
        // Consumed the entire remaining text — it fits
        rows.push(line);
        console.log("1 Adding line: "+line+" "+line.length);
        break;
      }
       
      // Break at last space, or hard-break at cols if no space found
      var breakAt = lastSpaceAt !== -1 ? lastSpaceAt : i;
      rows.push(line.slice(0, breakAt));
	console.log("2 Adding line: "+line.slice(0, breakAt)+ " length: "+line.slice(0, breakAt).length);
	
      line = line.slice(breakAt).replace(/^ /, ''); // skip the space
    }
    return rows.join('\r\n');
  }
}());
