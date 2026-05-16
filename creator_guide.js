(function () {
  var el = document.getElementById('access-help-embed');
  if (!el) return;

  fetch('help/access')
    .then(function (r) { return r.ok ? r.text() : Promise.reject(); })
    .then(function (raw) {
      var text = raw
        .replace(/^NAME[\s\S]*?(?=\n[A-Z])/m, '')
        .replace(/^DESCRIPTION\s*\n/im, '')
        .replace(/\n?SEE ALSO[\s\S]*/i, '')
        .replace(/%\^[A-Z_]+%\^/g, '');
      el.innerHTML = parseHelpText(text.trim());
    })
    .catch(function () {
      el.innerHTML = '<em>Could not load help/access.</em>';
    });

  function titleCase(word) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function parseHelpText(text) {
    var lines = text.split('\n');
    var html = '';
    var paraLines = [];
    var bulletItems = [];
    var numberedItems = [];
    var bulletIndent = -1;

    function indent(line) { var m = line.match(/^(\s*)/); return m[1].length; }
    function strip(line) { return line.replace(/^\s+/, ''); }

    function flushPara() {
      if (!paraLines.length) return;
      html += '<p>' + esc(paraLines.join(' ').trim()) + '</p>';
      paraLines = [];
    }

    function flushBullets() {
      if (!bulletItems.length) return;
      html += '<ul>';
      bulletItems.forEach(function (item) { html += '<li>' + esc(item) + '</li>'; });
      html += '</ul>';
      bulletItems = [];
      bulletIndent = -1;
    }

    function flushNumbered() {
      if (!numberedItems.length) return;
      html += '<ol>';
      numberedItems.forEach(function (item) { html += '<li>' + esc(item) + '</li>'; });
      html += '</ol>';
      numberedItems = [];
    }

    function flushAll() { flushPara(); flushBullets(); flushNumbered(); }

    lines.forEach(function (line) {
      var s = strip(line);
      if (!s) { flushAll(); return; }

      // Section header: all-caps words only
      if (/^[A-Z][A-Z ]+$/.test(s)) {
        flushAll();
        html += '<h3>' + s.split(' ').map(titleCase).join(' ') + '</h3>';
        return;
      }

      // Bullet item: starts with "* "
      var bullet = s.match(/^\*\s+(.*)/);
      if (bullet) {
        flushPara(); flushNumbered();
        bulletItems.push(bullet[1].trim());
        bulletIndent = indent(line);
        return;
      }

      // Continuation of previous bullet: same or greater indent, bullet list open
      if (bulletIndent >= 0 && indent(line) >= bulletIndent && bulletItems.length) {
        bulletItems[bulletItems.length - 1] += ' ' + s;
        return;
      }

      // Numbered list item: "1.  text…"
      var num = s.match(/^(\d+)\.\s+(.*)/);
      if (num) {
        flushPara(); flushBullets();
        numberedItems.push(num[2].trim());
        return;
      }

      // Accumulate paragraph text
      flushBullets(); flushNumbered();
      paraLines.push(s);
    });

    flushAll();
    return html;
  }
}());
