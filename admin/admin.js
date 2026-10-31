// CV admin panel. The site is static, so "saving" means one commit to the repo
// through the GitHub API, holding the data, the generated page and the PDF.
import { renderCvPage } from './cv-render.js';
import { buildPdfDoc } from './cv-pdf.js';

const REPO = 'a-mertdincer/a-mertdincer.github.io';
const BRANCH = 'master'; // GitHub Pages publishes this branch, not main.
const PDF_NAME = 'ahmet-mert-dincer-cv.pdf';
const TOKEN_KEY = 'cv-admin-token';

const SECTION_TYPES = {
  text: 'Metin (özet gibi)',
  entries: 'Kayıtlar (deneyim, eğitim gibi)',
  list: 'Madde listesi',
  lines: 'Satır listesi (yetenekler gibi)',
};

const state = { token: '', cv: null, cvSha: '', dirty: false };
// Remembers which cards are open across re-renders of the form.
const openCards = new WeakSet();

const $ = (id) => document.getElementById(id);

function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v ?? '';
    else el.setAttribute(k, v);
  }
  el.append(...children.filter((c) => c != null));
  return el;
}

/* ---------- token storage ---------- */

function readToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function saveToken(token, remember) {
  try {
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // Storage is blocked: the token only lives until this page closes.
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing stored.
  }
}

/* ---------- GitHub API ---------- */

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${REPO}/${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${state.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'GitHub\'a ulaşılamadı. İnternet bağlantını kontrol et.');
  }
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new ApiError(res.status, detail.message || `GitHub hatası (${res.status})`);
  }
  return res.json();
}

function decodeBase64Utf8(b64) {
  const bytes = Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function loadCv() {
  const file = await api(`contents/cv/cv.json?ref=${BRANCH}`);
  state.cv = JSON.parse(decodeBase64Utf8(file.content));
  state.cvSha = file.sha;
  setDirty(false);
  renderEditor();
  renderPreview();
}

async function publish(pdfBase64) {
  const head = await api(`git/ref/heads/${BRANCH}`);
  const headSha = head.object.sha;

  // Refuse to overwrite a cv.json that changed after this page loaded it.
  const remote = await api(`contents/cv/cv.json?ref=${headSha}`);
  if (remote.sha !== state.cvSha) {
    throw new ApiError(409, 'CV başka bir yerden değişmiş. Değişikliklerini kopyalayıp "Değişiklikleri at" ile güncel hâli yükle.');
  }

  const baseCommit = await api(`git/commits/${headSha}`);
  const blob = (content, encoding) => api('git/blobs', { method: 'POST', body: { content, encoding } });
  const [jsonBlob, htmlBlob, pdfBlob] = await Promise.all([
    blob(`${JSON.stringify(state.cv, null, 2)}\n`, 'utf-8'),
    blob(renderCvPage(state.cv), 'utf-8'),
    blob(pdfBase64, 'base64'),
  ]);
  const entry = (path, sha) => ({ path, sha, mode: '100644', type: 'blob' });
  const tree = await api('git/trees', {
    method: 'POST',
    body: {
      base_tree: baseCommit.tree.sha,
      tree: [
        entry('cv/cv.json', jsonBlob.sha),
        entry('cv/index.html', htmlBlob.sha),
        entry('cv-en.pdf', pdfBlob.sha),
      ],
    },
  });
  const commit = await api('git/commits', {
    method: 'POST',
    body: { message: 'Update CV from admin panel', tree: tree.sha, parents: [headSha] },
  });
  await api(`git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: commit.sha } });
  state.cvSha = jsonBlob.sha;
}

/* ---------- PDF ---------- */

function loadScript(src) {
  return new Promise((resolve, reject) => {
    document.head.append(h('script', { src, onload: resolve, onerror: () => reject(new Error(`${src} yüklenemedi`)) }));
  });
}

// pdfmake is 2 MB, so it loads the first time a PDF is needed.
async function pdfDocument() {
  if (!window.pdfMake) {
    await loadScript('vendor/pdfmake.min.js');
    await loadScript('vendor/vfs_fonts.js');
  }
  return window.pdfMake.createPdf(buildPdfDoc(state.cv));
}

/* ---------- status + dirty ---------- */

function setStatus(text, kind = '') {
  const el = $('status');
  el.textContent = text;
  el.className = `status ${kind}`;
}

function setDirty(dirty) {
  state.dirty = dirty;
  if (dirty) setStatus('Yayınlanmamış değişiklik var');
}

function setBusy(busy) {
  for (const id of ['publish-btn', 'pdf-btn', 'reset-btn']) $(id).disabled = busy;
}

let previewTimer;
function changed() {
  setDirty(true);
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 250);
}

function renderPreview() {
  const frame = $('preview');
  const y = frame.contentWindow?.scrollY ?? 0;
  frame.addEventListener('load', () => frame.contentWindow?.scrollTo(0, y), { once: true });
  frame.srcdoc = renderCvPage(state.cv, { preview: true });
}

/* ---------- form ---------- */

const textInput = (label, obj, key) => h('label', { class: 'field' },
  h('span', {}, label),
  h('input', { type: 'text', value: obj[key], oninput: (e) => { obj[key] = e.target.value; changed(); } }));

const textArea = (label, obj, key, rows = 3) => h('label', { class: 'field' },
  h('span', {}, label),
  h('textarea', { rows, value: obj[key], oninput: (e) => { obj[key] = e.target.value; changed(); } }));

// The array stays in sync with a textarea holding one item per line.
const linesArea = (label, obj, key, rows = 4) => h('label', { class: 'field' },
  h('span', {}, label),
  h('textarea', {
    rows,
    value: (obj[key] ?? []).join('\n'),
    oninput: (e) => {
      obj[key] = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean);
      changed();
    },
  }));

function structureChanged() {
  changed();
  renderEditor();
}

function move(list, index, delta) {
  const to = index + delta;
  if (to < 0 || to >= list.length) return;
  [list[index], list[to]] = [list[to], list[index]];
  structureChanged();
}

function controls(list, index, name) {
  const act = (fn) => (e) => { e.preventDefault(); e.stopPropagation(); fn(); };
  return [
    h('button', { type: 'button', class: 'icon', title: 'Yukarı taşı', 'aria-label': `${name} yukarı taşı`, onclick: act(() => move(list, index, -1)) }, '↑'),
    h('button', { type: 'button', class: 'icon', title: 'Aşağı taşı', 'aria-label': `${name} aşağı taşı`, onclick: act(() => move(list, index, 1)) }, '↓'),
    h('button', {
      type: 'button',
      class: 'icon danger',
      title: 'Sil',
      'aria-label': `${name} sil`,
      onclick: act(() => {
        if (!confirm(`"${name}" silinsin mi?`)) return;
        list.splice(index, 1);
        structureChanged();
      }),
    }, 'Sil'),
  ];
}

function card(key, labelText, extras, ...body) {
  const label = h('span', { class: 'label' }, labelText);
  const details = h('details', { class: 'card', ontoggle: (e) => {
    if (e.target.open) openCards.add(key); else openCards.delete(key);
  } },
    h('summary', {}, label, ...extras),
    h('div', { class: 'card-body' }, ...body));
  if (openCards.has(key)) details.open = true;
  return details;
}

function renderEntry(section, entry, index) {
  const name = entry.title || 'Yeni kayıt';
  return card(entry, name, controls(section.items, index, name),
    textInput('Başlık', entry, 'title'),
    textInput('Kurum', entry, 'org'),
    textInput('Tarih veya yer (sağda görünür)', entry, 'date'),
    textInput('Alt satır (konum, çalışma şekli)', entry, 'meta'),
    linesArea('Maddeler (her satır bir madde)', entry, 'bullets', 6));
}

function renderSection(section, index) {
  const name = section.title || 'Başlıksız bölüm';
  const body = [textInput('Bölüm başlığı', section, 'title')];
  if (section.type === 'text') {
    body.push(textArea('Metin (boş satır yeni paragraf açar)', section, 'body', 6));
  } else if (section.type === 'entries') {
    section.items.forEach((entry, i) => body.push(renderEntry(section, entry, i)));
    body.push(h('div', { class: 'add-row' }, h('button', {
      type: 'button',
      onclick: () => {
        const entry = { title: '', org: '', date: '', meta: '', bullets: [] };
        section.items.push(entry);
        openCards.add(entry);
        structureChanged();
      },
    }, '+ Kayıt ekle')));
  } else {
    body.push(linesArea('Her satır bir öğe', section, 'items', 6));
  }
  return card(section, name, controls(state.cv.sections, index, name), ...body);
}

function renderGeneral() {
  const cv = state.cv;
  const links = (cv.links ?? []).map((link, i) => h('div', { class: 'row' },
    h('input', { type: 'text', placeholder: 'Görünen yazı', 'aria-label': 'Bağlantı yazısı', value: link.label, oninput: (e) => { link.label = e.target.value; changed(); } }),
    h('input', { type: 'text', placeholder: 'https://...', 'aria-label': 'Bağlantı adresi', value: link.url, oninput: (e) => { link.url = e.target.value; changed(); } }),
    h('button', { type: 'button', class: 'icon danger', onclick: () => { cv.links.splice(i, 1); structureChanged(); } }, 'Sil')));
  return card(cv, 'Genel bilgiler', [],
    textInput('Ad soyad', cv, 'name'),
    textInput('Konum', cv, 'location'),
    textInput('E-posta', cv, 'email'),
    textInput('Telefon (boş bırakırsan görünmez)', cv, 'phone'),
    textArea('Hedef roller (boş bırakırsan görünmez)', cv, 'targetRoles', 2),
    h('div', { class: 'field' }, h('span', {}, 'Bağlantılar'), ...links),
    h('div', { class: 'add-row' }, h('button', {
      type: 'button',
      onclick: () => { (cv.links ??= []).push({ label: '', url: '' }); structureChanged(); },
    }, '+ Bağlantı ekle')),
    textArea('Google açıklaması (sayfada görünmez, aramada görünür)', cv, 'metaDescription', 3),
    textArea('Paylaşım açıklaması (bağlantı paylaşılınca görünür)', cv, 'ogDescription', 2));
}

function renderAddSection() {
  const select = h('select', { 'aria-label': 'Bölüm türü' },
    ...Object.entries(SECTION_TYPES).map(([value, label]) => h('option', { value }, label)));
  return h('div', { class: 'add-row' }, select, h('button', {
    type: 'button',
    onclick: () => {
      const type = select.value;
      const section = { type, title: '', ...(type === 'text' ? { body: '' } : { items: [] }) };
      state.cv.sections.push(section);
      openCards.add(section);
      structureChanged();
    },
  }, '+ Bölüm ekle'));
}

function renderEditor() {
  $('editor').replaceChildren(
    renderGeneral(),
    ...state.cv.sections.map(renderSection),
    renderAddSection(),
    h('p', { class: 'hint' }, 'Metinlerde **kalın**, `kod` ve [yazı](https://adres) kullanabilirsin. Bu repo herkese açık: silmek istediğin bilgiyi burada gerçekten sil, boş bırakılan alan sayfada ve PDF\'te görünmez.'));
}

/* ---------- actions ---------- */

function showLogin(message = '') {
  $('app').hidden = true;
  $('login').hidden = false;
  $('login-error').textContent = message;
  $('token').value = '';
}

function explainError(err) {
  if (err.status === 401) return 'Token geçersiz veya süresi dolmuş.';
  if (err.status === 403 || err.status === 404) return 'Token\'ın bu repoya yazma izni yok. Contents: Read and write iznini ve repo seçimini kontrol et.';
  return err.message;
}

async function enter(token, remember) {
  state.token = token;
  // A public repo is readable with any valid token, so test writing up front
  // instead of failing at publish time. An unreferenced blob changes nothing.
  await api('git/blobs', { method: 'POST', body: { content: '', encoding: 'utf-8' } });
  if (remember !== null) saveToken(token, remember);
  $('login').hidden = true;
  $('app').hidden = false;
  if (state.cv) renderPreview();
  else await loadCv();
}

async function tryLogin(token, remember) {
  $('login-btn').disabled = true;
  $('login-error').textContent = '';
  try {
    await enter(token, remember);
  } catch (err) {
    if (err.status === 401) clearToken();
    showLogin(explainError(err));
  } finally {
    $('login-btn').disabled = false;
  }
}

$('login-btn').addEventListener('click', () => {
  const token = $('token').value.trim();
  if (!token) {
    $('login-error').textContent = 'Token gir.';
    return;
  }
  tryLogin(token, $('remember').checked);
});

$('token').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('login-btn').click();
});

$('logout-btn').addEventListener('click', () => {
  if (state.dirty && !confirm('Yayınlanmamış değişiklikler kaybolacak. Çıkılsın mı?')) return;
  clearToken();
  state.token = '';
  state.cv = null;
  setDirty(false);
  showLogin();
});

$('reset-btn').addEventListener('click', async () => {
  if (state.dirty && !confirm('Yayınlanmamış değişiklikler kaybolacak. Devam edilsin mi?')) return;
  setBusy(true);
  try {
    await loadCv();
    setStatus('Yayındaki hâl yüklendi', 'ok');
  } catch (err) {
    setStatus(explainError(err), 'bad');
  } finally {
    setBusy(false);
  }
});

$('pdf-btn').addEventListener('click', async () => {
  setBusy(true);
  try {
    (await pdfDocument()).download(PDF_NAME);
  } catch (err) {
    setStatus(`PDF üretilemedi: ${err.message}`, 'bad');
  } finally {
    setBusy(false);
  }
});

$('publish-btn').addEventListener('click', async () => {
  if (!state.cv.name?.trim()) {
    setStatus('Ad soyad boş olamaz', 'bad');
    return;
  }
  setBusy(true);
  setStatus('Yayınlanıyor...');
  try {
    const doc = await pdfDocument();
    const pdfBase64 = await new Promise((resolve) => doc.getBase64(resolve));
    await publish(pdfBase64);
    setDirty(false);
    setStatus('Yayınlandı. Sayfa ve PDF 1-2 dakika içinde güncellenir.', 'ok');
  } catch (err) {
    if (err.status === 401) {
      clearToken();
      setDirty(true);
      showLogin('Token geçersiz veya süresi dolmuş. Yeni token gir, değişikliklerin duruyor.');
      return;
    }
    setStatus(explainError(err), 'bad');
  } finally {
    setBusy(false);
  }
});

$('pane-btn').addEventListener('click', () => {
  const next = document.body.dataset.pane === 'edit' ? 'preview' : 'edit';
  document.body.dataset.pane = next;
  $('pane-btn').textContent = next === 'edit' ? 'Önizleme' : 'Düzenle';
});

window.addEventListener('beforeunload', (e) => {
  if (state.dirty) e.preventDefault();
});

/* ---------- start ---------- */

const saved = readToken();
if (saved) tryLogin(saved, null);
else showLogin();
