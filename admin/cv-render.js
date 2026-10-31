// Turns cv/cv.json into the static cv/index.html.
// Used by the admin panel for both the live preview and publishing.

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

// Inline markup allowed in CV text: **bold**, `code`, [label](https://url).
// Returned as tokens so the HTML page and the PDF render the same content.
export function parseInline(text) {
  const tokens = [];
  const re = /\*\*(.+?)\*\*|`(.+?)`|\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g;
  const src = String(text ?? '');
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) tokens.push({ kind: 'text', text: src.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ kind: 'bold', text: m[1] });
    else if (m[2] !== undefined) tokens.push({ kind: 'code', text: m[2] });
    else tokens.push({ kind: 'link', text: m[3], url: m[4] });
    last = re.lastIndex;
  }
  if (last < src.length) tokens.push({ kind: 'text', text: src.slice(last) });
  return tokens;
}

const inline = (text) =>
  parseInline(text).map((t) => {
    if (t.kind === 'bold') return `<strong>${esc(t.text)}</strong>`;
    if (t.kind === 'code') return `<code>${esc(t.text)}</code>`;
    if (t.kind === 'link') return `<a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">${esc(t.text)}</a>`;
    return esc(t.text);
  }).join('');

export const isSafeUrl = (url) => /^(https?:\/\/|mailto:)/i.test(String(url ?? '').trim());

const ul = (items, cls) =>
  items.length
    ? `<ul${cls ? ` class="${cls}"` : ''}>\n${items.map((i) => `            <li>${inline(i)}</li>`).join('\n')}\n          </ul>`
    : '';

function renderEntry(e) {
  const org = e.org ? ` — <span class="org">${esc(e.org)}</span>` : '';
  const date = e.date ? `\n            <span class="cv-entry-date">${esc(e.date)}</span>` : '';
  const meta = e.meta ? `\n          <p class="cv-entry-meta">${esc(e.meta)}</p>` : '';
  const bullets = ul(e.bullets ?? []);
  return `        <section class="cv-entry">
          <div class="cv-entry-head">
            <h3 class="cv-entry-title">${esc(e.title)}${org}</h3>${date}
          </div>${meta}${bullets ? `\n          ${bullets}` : ''}
        </section>`;
}

function renderSection(s) {
  const head = s.title ? `        <h2>${esc(s.title)}</h2>\n` : '';
  if (s.type === 'text') {
    const paras = String(s.body ?? '').split(/\n\s*\n/).filter((p) => p.trim());
    return head + paras.map((p) => `        <p>${inline(p.trim())}</p>`).join('\n');
  }
  if (s.type === 'entries') return head + (s.items ?? []).map(renderEntry).join('\n\n');
  if (s.type === 'lines') {
    return `${head}        <div class="cv-skills">\n${(s.items ?? []).map((i) => `          <p>${inline(i)}</p>`).join('\n')}\n        </div>`;
  }
  return `${head}        ${ul(s.items ?? [], s.cssClass)}`;
}

function renderContact(cv) {
  const firstLine = [
    cv.email ? `<a href="mailto:${esc(cv.email)}">${esc(cv.email)}</a>` : '',
    esc(cv.phone),
  ].filter(Boolean).join(' · ');
  const lines = [
    esc(cv.location),
    firstLine && `· ${firstLine}`,
    ...(cv.links ?? []).filter((l) => isSafeUrl(l.url)).map(
      (l) => `· <a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label || l.url)}</a>`
    ),
  ].filter(Boolean);
  return lines.join('<br />\n          ');
}

export function renderCvPage(cv, { preview = false } = {}) {
  const title = `CV - ${esc(cv.name)}`;
  // The preview iframe must not count as a visit in Analytics.
  const analytics = preview ? '' : `    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-QJ9TR5T9S2"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-QJ9TR5T9S2');
    </script>
`;
  const target = cv.targetRoles
    ? `\n        <p class="cv-target"><strong>Target Roles:</strong> ${esc(cv.targetRoles)}</p>`
    : '';
  return `<!DOCTYPE html>
<!-- Generated from cv/cv.json by /admin. Edit there: manual changes here get overwritten. -->
<html lang="en">
  <head>
${analytics}    <meta charset="utf-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>${title}</title>
    <meta name="description" content="${esc(cv.metaDescription)}" />
    <meta name="author" content="${esc(cv.name)}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${esc(cv.ogDescription)}" />
    <meta property="og:type" content="profile" />
    <link rel="canonical" href="https://a-mertdincer.github.io/cv/" />
    <link rel="stylesheet" type="text/css" media="screen,print" href="../css/cv.css" />
    <link rel="icon" type="image/x-icon" href="../img/fav-icon.png" />
  </head>
  <body class="cv">
    <div class="cv-wrap">
      <header class="cv-topbar">
        <a class="cv-back" href="../">← back to terminal</a>
        <h1 class="cv-heading">${title}</h1>
        <a class="cv-download" href="../cv-en.pdf" download="ahmet-mert-dincer-cv.pdf">Download PDF</a>
      </header>

      <section class="cv-pdf-card" aria-label="PDF download">
        <pre class="cv-pdf-ascii" aria-hidden="true">
   ____________________
  |  __  __  __  __  __ |
  | |__||__||__||__||__||
  | |__||__||__||__||__||
  | |__||__||__||__||__||
  |____________________ |
   \\____________________\\
        cv-en.pdf
</pre>
        <p class="cv-pdf-note">PDF version available for download.</p>
        <p class="cv-pdf-actions">
          <a class="cv-download" href="../cv-en.pdf" download="ahmet-mert-dincer-cv.pdf">$ wget cv-en.pdf</a>
          <a class="cv-download cv-download-ghost" href="../cv-en.pdf" target="_blank" rel="noopener noreferrer">$ open in new tab</a>
        </p>
      </section>

      <hr class="cv-divider" />
      <p class="cv-text-intro">// full CV below — readable, indexable, works on any device.</p>

      <main class="cv-body">
        <h1>${esc(cv.name)}</h1>
        <p class="cv-contact">
          ${renderContact(cv)}
        </p>${target}

${(cv.sections ?? []).map(renderSection).join('\n\n')}
      </main>
    </div>
  </body>
</html>
`;
}
