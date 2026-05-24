document.addEventListener('DOMContentLoaded', () => {
  const pre = document.querySelector('.gazette-pre');
  if (!pre) return;

  fetch('gazette.txt')
    .then(r => r.text())
    .then(text => {
      // 1. Escape HTML special chars
      let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // 2. Wrap the 3-char border glyphs (/\\ and \\/) in animated gold spans
      html = html
        .replace(/\/\\\\/g, '<span class="glyph">/\\\\</span>')
        .replace(/\\\\\//g, '<span class="glyph">\\\\\/</span>');

      // 3. Wrap the diamond gem ASCII art in ruby spans.
      //    Each string below is the exact character sequence from gazette.txt.
      // _______  only matches the gem when followed by spaces then the border span
      html = html.replace(/(_______)([ ]+)(<span class="glyph">)/, '<span class="gem">$1</span>$2$3');

      const gemParts = [
        ".'_/_|_\\_'.",
        "\\`\\  |  /`/",
        "`\\\\ | //'",
        "`\\|/`",
      ];
      for (const part of gemParts) {
        html = html.split(part).join('<span class="gem">' + part + '</span>');
      }

      // 4. Bold section and table headers
      const headings = [
        'Character Statistics',
        '-+- Registered Characters by Category -+-',
        'All time Top High:',
        'The Gods welcome our new born Players :',
        'Birth  :   Name :          Level Today:',
        'And to the memory of those who died...',
        'Most recent levels by Players',
        'Most recent levels by Wizards',
        'Most recent projects approved and added to the game :',
        'Release Date :  Creator :                               Project Name :',
        'Scheduled Reboots :',
        "Viking's top 10 oldest players.",
      ];
      for (const h of headings) {
        html = html.split(h).join('<b class="gazette-head">' + h + '</b>');
      }

      pre.innerHTML = html;

      // 6. Stagger gold border glyphs: sweep top-to-bottom over 0.7 s
      const glyphs = pre.querySelectorAll('.glyph');
      glyphs.forEach((el, i) => {
        el.style.animationDelay = (i / glyphs.length * 0.7).toFixed(2) + 's';
      });

      // 5. Stagger gem spans: gentle downward sweep, 0.4 s apart
      const gems = pre.querySelectorAll('.gem');
      gems.forEach((el, i) => {
        el.style.animationDelay = (i * 0.4).toFixed(1) + 's';
      });
    });
});
