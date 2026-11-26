'use strict';
/* =====================================================================
   files.js - documents, auto-save, version history, files, export, menu

   Three layers of saving:
   1. Auto-save    every change is written to the browser library (IndexedDB)
   2. Versions     restore points: automatic every 5 min + "Save version"
   3. Files        Save as file / Open file  (.docstudio.json - keeps drawings editable)
   Drawing drafts are also auto-saved while the drawing studio is open
   (Draft) so a closed tab or crash never loses a drawing.
   ===================================================================== */
const CURK = 'mld.cur.v1';          // key of last open document (localStorage)
const LEGACY = 'mld.docs.v1';       // documents saved by the old editor
const UNTITLED = 'Untitled document';
const SNAP_MAX = 30;                // automatic restore points kept per document
const SNAP_EVERY = 5 * 60 * 1000;

let docs = {}, cur = null, fileHandle = null, lastSnapT = 0, lastSnapHtml = '', baseline = null, baseSaved = true;

function setState(t) { const e = $('#saveState'); if (e) e.textContent = t; }
const clock = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const fmtDate = t => new Date(t).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const kb = n => n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB';

/* ---------------------------------------------------------------- library */
async function loadLibrary() {
  await Store.init();
  const list = await Store.all('docs');
  list.forEach(d => { docs[d.id] = d; });
  /* one-time import of documents from the old localStorage editor */
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY) || 'null');
    if (old && !localStorage.getItem('ds.migrated')) {
      for (const id of Object.keys(old)) {
        if (docs[id]) continue;
        const d = Object.assign({ id }, old[id]);
        docs[id] = d;
        try { await Store.put('docs', d); } catch (_) { /* ignore */ }
      }
      localStorage.setItem('ds.migrated', '1');
    }
  } catch (_) { /* ignore */ }
}
async function persistDoc(id) {
  const d = docs[id];
  if (!d) return;
  try {
    await Store.put('docs', d);
    setState('Saved ' + clock());
  } catch (_) {
    setState('Not saved');
    toast('Browser storage is full - use “Save as file”');
  }
  try { localStorage.setItem(CURK, id); } catch (_) { /* ignore */ }
}
function captureDoc() {
  if (!cur || !docs[cur]) return null;
  const d = docs[cur];
  d.html = getHTML();
  d.title = $('#title').value.trim() || UNTITLED;
  d.font = ed.style.getPropertyValue('--doc-font');
  d.size = ed.style.getPropertyValue('--doc-size');
  d.lh = ed.style.getPropertyValue('--lh');
  d.updated = Date.now();
  return d;
}
function saveNow() {
  const d = captureDoc();
  if (!d) return Promise.resolve();
  /* keep the text as it was when the document was opened (first edit only) */
  if (!baseSaved && baseline && d.html !== baseline.html) {
    baseSaved = true;
    if (baseline.html.replace(/<[^>]*>/g, '').trim() || baseline.html.indexOf('<figure') >= 0) addSnap('Before editing', baseline, true);
  }
  if (Date.now() - lastSnapT > SNAP_EVERY && d.html !== lastSnapHtml) addSnap('Auto-save', d, true);
  return persistDoc(cur);
}
function newDoc(init) {
  const id = 'd' + Date.now().toString(36);
  docs[id] = Object.assign({ id, title: UNTITLED, html: '<p><br></p>', font: '', size: '', lh: '', created: Date.now(), updated: Date.now() }, init || {});
  fileHandle = null;
  loadDoc(id);
  persistDoc(id);
}
function loadDoc(id) {
  const d = docs[id];
  if (!d) return newDoc();
  cur = id;
  selectBlk(null);
  ed.innerHTML = d.html || '<p><br></p>';
  hydrate();
  $('#title').value = d.title || '';
  document.title = (d.title || UNTITLED) + ' - Doc & Drawing Studio';
  ['--doc-font', '--doc-size', '--lh'].forEach(k => ed.style.removeProperty(k));
  if (d.font) ed.style.setProperty('--doc-font', d.font);
  if (d.size) ed.style.setProperty('--doc-size', d.size);
  if (d.lh) ed.style.setProperty('--lh', d.lh);
  $('#sizeSel').value = (d.size || '20px').replace('px', '');
  $('#lhSel').value = d.lh || '1.9';
  lastSnapHtml = d.html || '';
  lastSnapT = Date.now();
  baseline = { id, title: d.title, html: d.html || '', font: d.font, size: d.size, lh: d.lh };
  baseSaved = false;
  updateStats();
  try { localStorage.setItem(CURK, id); } catch (_) { /* ignore */ }
  setState('Saved');
}
async function deleteDoc(id) {
  delete docs[id];
  try { await Store.del('docs', id); } catch (_) { /* ignore */ }
  const snaps = await Store.all('snaps');
  for (const s of snaps) if (s.doc === id) { try { await Store.del('snaps', s.id); } catch (_) { /* ignore */ } }
  if (id === cur) { const k = Object.keys(docs)[0]; if (k) loadDoc(k); else newDoc(); }
}
$('#title').addEventListener('input', () => {
  document.title = ($('#title').value || UNTITLED) + ' - Doc & Drawing Studio';
  changed();
});

/* ------------------------------------------------------ versions / restore */
async function addSnap(label, d, auto) {
  d = d || captureDoc();
  if (!d) return;
  const s = {
    id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), doc: d.id, t: Date.now(), label,
    auto: !!auto, title: d.title, html: d.html, font: d.font, size: d.size, lh: d.lh
  };
  lastSnapT = s.t; lastSnapHtml = d.html;
  try { await Store.put('snaps', s); } catch (_) { return; }
  /* keep only the newest SNAP_MAX automatic versions of this document */
  const mine = (await Store.all('snaps')).filter(x => x.doc === d.id && x.auto).sort((a, b) => b.t - a.t);
  for (const old of mine.slice(SNAP_MAX)) { try { await Store.del('snaps', old.id); } catch (_) { /* ignore */ } }
}
async function openHistory() {
  const box = $('#histList');
  box.innerHTML = '<p class="none">Loading…</p>';
  $('#dlgHist').showModal();
  const list = (await Store.all('snaps')).filter(s => s.doc === cur).sort((a, b) => b.t - a.t);
  if (!list.length) { box.innerHTML = '<p class="none">No saved versions yet. Versions are created automatically while you work, or press “Save version now”.</p>'; return; }
  box.innerHTML = '';
  list.forEach(s => {
    const row = document.createElement('div');
    row.className = 'row2';
    row.innerHTML = '<div class="n"><b>' + esc(s.label) + (s.auto ? '' : ' ★') + '</b><small>' + fmtDate(s.t) + ' · ' + kb((s.html || '').length) + '</small></div>' +
      '<button class="btn" data-r>' + ic('history') + 'Restore</button><button class="btn" data-d title="Delete">' + ic('trash') + '</button>';
    row.querySelector('[data-r]').onclick = () => restoreVersion(s.id);
    row.querySelector('[data-d]').onclick = async () => { await Store.del('snaps', s.id); openHistory(); };
    box.appendChild(row);
  });
}
async function restoreVersion(id) {
  const s = await Store.get('snaps', id);
  if (!s) return;
  if (!confirm('Restore the version from ' + fmtDate(s.t) + '?\nYour current text is saved as a version first.')) return;
  await addSnap('Before restore', captureDoc());
  const d = docs[cur];
  Object.assign(d, { html: s.html, font: s.font, size: s.size, lh: s.lh, title: s.title || d.title, updated: Date.now() });
  loadDoc(cur);
  await persistDoc(cur);
  $('#dlgHist').close();
  toast('Version restored');
}

/* --------------------------------------------------------- library dialog */
function renderLibrary() {
  const q = ($('#libQ').value || '').toLowerCase();
  const box = $('#docList');
  box.innerHTML = '';
  const ids = Object.keys(docs).filter(id => (docs[id].title || '').toLowerCase().includes(q)).sort((a, b) => docs[b].updated - docs[a].updated);
  if (!ids.length) box.innerHTML = '<p class="none">No documents found.</p>';
  ids.forEach(id => {
    const d = docs[id], row = document.createElement('div');
    row.className = 'row2' + (id === cur ? ' cur' : '');
    row.innerHTML = '<div class="n"><b>' + esc(d.title || UNTITLED) + '</b><small>' + fmtDate(d.updated) + ' · ' + kb((d.html || '').length) + '</small></div>' +
      '<button class="btn" data-dup title="Duplicate">' + ic('copy') + '</button><button class="btn" data-del title="Delete">' + ic('trash') + '</button>';
    row.querySelector('.n').onclick = () => { saveNow(); loadDoc(id); $('#dlgOpen').close(); };
    row.querySelector('[data-dup]').onclick = () => {
      const nid = 'd' + Date.now().toString(36);
      docs[nid] = Object.assign({}, d, { id: nid, title: (d.title || UNTITLED) + ' (copy)', updated: Date.now(), created: Date.now() });
      persistDoc(nid); renderLibrary();
    };
    row.querySelector('[data-del]').onclick = async () => {
      if (!confirm('Delete “' + (d.title || UNTITLED) + '”? This cannot be undone.')) return;
      await deleteDoc(id); renderLibrary();
    };
    box.appendChild(row);
  });
}
$('#libQ').addEventListener('input', renderLibrary);

/* ------------------------------------------------------------ file save/open */
const fname = ext => (($('#title').value || 'document').replace(/[\\/:*?"<>|]/g, '_').trim() || 'document') + '.' + ext;
function filePayload() {
  const d = captureDoc();
  return JSON.stringify({ app: 'docstudio', v: 1, saved: new Date().toISOString(), title: d.title, html: d.html, font: d.font, size: d.size, lh: d.lh });
}
async function saveFile(forceNew) {
  const data = filePayload();
  if (window.showSaveFilePicker) {
    try {
      if (!fileHandle || forceNew) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: fname('docstudio.json'),
          types: [{ description: 'Doc Studio file', accept: { 'application/json': ['.json'] } }]
        });
      }
      const w = await fileHandle.createWritable();
      await w.write(data);
      await w.close();
      toast('Saved to ' + fileHandle.name);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      fileHandle = null; /* fall through to a normal download */
    }
  }
  dlBlob(fname('docstudio.json'), 'application/json', data);
  toast('File downloaded');
}
async function openFile() {
  if (window.showOpenFilePicker) {
    try {
      const [h] = await window.showOpenFilePicker({
        types: [{ description: 'Doc Studio, HTML or text', accept: { 'application/json': ['.json'], 'text/html': ['.html', '.htm'], 'text/plain': ['.txt'] } }]
      });
      const f = await h.getFile();
      importText(f.name, await f.text(), /\.json$/i.test(f.name) ? h : null);
      return;
    } catch (e) {
      if (e && e.name === 'AbortError') return;
    }
  }
  $('#fileIn').click();
}
function importText(name, t, handle) {
  saveNow();
  const trim = t.trim();
  /* a saved Doc Studio / drawing file */
  if (/\.json$/i.test(name) || trim.charAt(0) === '{') {
    let j;
    try { j = JSON.parse(trim); } catch (_) { toast('This file is not valid'); return; }
    if (j && j.app === 'docstudio' && typeof j.html === 'string') {
      newDoc({ title: j.title || name.replace(/\.[^.]+$/, ''), html: j.html, font: j.font || '', size: j.size || '', lh: j.lh || '' });
      fileHandle = handle || null;
      toast('Opened ' + name);
      return;
    }
    const dd = j && (j.app === 'docstudio-drawing' ? j.data : (Array.isArray(j.objs) ? j : null));
    if (dd) {
      newDoc({ title: name.replace(/\.[^.]+$/, '') });
      const fg = makeFig(dd);
      ed.innerHTML = '';
      ed.appendChild(fg);
      const p = document.createElement('p'); p.innerHTML = '<br>'; ed.appendChild(p);
      changed(); saveNow(); toast('Drawing opened as a new document');
      return;
    }
    toast('This file is not a Doc Studio file');
    return;
  }
  newDoc({ title: name.replace(/\.[^.]+$/, '') });
  if (/\.html?$/i.test(name)) {
    const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(t);
    ed.innerHTML = m ? m[1] : t;
    hydrate();
  } else {
    ed.innerHTML = t.split(/\r?\n/).map(l => '<p>' + (esc(l) || '<br>') + '</p>').join('');
  }
  $('#title').value = name.replace(/\.[^.]+$/, '');
  changed(); saveNow();
  toast('Opened ' + name);
}
$('#fileIn').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  const rd = new FileReader();
  rd.onload = () => importText(f.name, String(rd.result), null);
  rd.readAsText(f);
});

/* ---------------------------------------------------------------- export */
async function exportHTML(word) {
  const live = [...ed.querySelectorAll('figure.drw,figure.dimg')];
  const c = ed.cloneNode(true);
  const cf = [...c.querySelectorAll('figure.drw,figure.dimg')];
  c.querySelectorAll('figure.sel').forEach(f => f.classList.remove('sel'));
  for (let i = 0; i < cf.length; i++) {
    const f = cf[i], lv = live[i], wp = +(f.dataset.wp || 100), al = f.style.textAlign || 'center';
    if (f.classList.contains('drw')) {
      if (word) {
        let d;
        try { d = JSON.parse(f.dataset.drw); } catch (_) { continue; }
        const W = Math.round(620 * wp / 100), H = Math.round(W * d.h / d.w);
        try {
          const png = await svgToPng(buildSVG(d, { px: 1 }), d.w, d.h, Math.min(2, 2400 / d.w));
          const p = document.createElement('p');
          p.setAttribute('style', 'text-align:' + al);
          p.innerHTML = '<img src="' + png + '" width="' + W + '" height="' + H + '">';
          f.replaceWith(p);
        } catch (_) { f.remove(); }
      } else f.removeAttribute('contenteditable');
    } else {
      const im = lv.querySelector('img');
      if (word && im) {
        const W = Math.round(620 * wp / 100), H = Math.round(W * (im.naturalHeight || 1) / (im.naturalWidth || 1));
        const p = document.createElement('p');
        p.setAttribute('style', 'text-align:' + al);
        p.innerHTML = '<img src="' + im.src + '" width="' + W + '" height="' + H + '">';
        f.replaceWith(p);
      } else f.removeAttribute('contenteditable');
    }
  }
  const font = ed.style.getPropertyValue('--doc-font') || "'Noto Sans Malayalam',sans-serif";
  const size = ed.style.getPropertyValue('--doc-size') || '20px', lh = ed.style.getPropertyValue('--lh') || '1.8';
  const ns = word ? " xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'" : '';
  return '<!DOCTYPE html><html' + ns + '><head><meta charset="utf-8"><title>' + esc($('#title').value) +
    '</title><style>body{font-family:' + font + ';font-size:' + size + ';line-height:' + lh +
    '}table{border-collapse:collapse}td,th{border:1px solid #888;padding:4px 6px}figure{margin:10px 0;text-align:center}hr.pb{page-break-after:always;border:0}</style></head><body>' +
    c.innerHTML + '</body></html>';
}

/* ------------------------------------------------------------------ menu */
function act(a) {
  $('#menu').hidden = true;
  switch (a) {
    case 'new': saveNow(); newDoc(); ed.focus(); break;
    case 'newmap': newMap(); break;
    case 'library': saveNow(); $('#libQ').value = ''; renderLibrary(); $('#dlgOpen').showModal(); break;
    case 'open': openFile(); break;
    case 'save':
      saveNow().then(() => toast('Saved in this browser'));
      if (fileHandle) saveFile(false);
      break;
    case 'savefile': saveFile(true); break;
    case 'history': saveNow(); openHistory(); break;
    case 'doc': exportHTML(true).then(h => dlBlob(fname('doc'), 'application/msword', h)); break;
    case 'txt': dlBlob(fname('txt'), 'text/plain;charset=utf-8', docText()); break;
    case 'html': exportHTML(false).then(h => dlBlob(fname('html'), 'text/html;charset=utf-8', h)); break;
    case 'print': selectBlk(null); window.print(); break;
    case 'copy':
      (navigator.clipboard ? navigator.clipboard.writeText(docText()) : Promise.reject()).then(() => toast('Text copied'), () => {
        const r = document.createRange(); r.selectNodeContents(ed);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        document.execCommand('copy'); toast('Text copied');
      });
      break;
    case 'find': $('#findbar').hidden = false; $('#fq').focus(); break;
    case 'help': $('#dlgHelp').showModal(); break;
    case 'delete':
      if (confirm('Delete this document? This cannot be undone.')) deleteDoc(cur);
      break;
  }
}
$('#menu').addEventListener('click', e => { const b = e.target.closest('button'); if (b) act(b.dataset.act); });
$('#menuBtn').addEventListener('click', e => { e.stopPropagation(); $('#menu').hidden = !$('#menu').hidden; });
document.addEventListener('click', e => { if (!e.target.closest('#menu') && !e.target.closest('#menuBtn')) $('#menu').hidden = true; });
$('#saveBtn').addEventListener('click', () => act('save'));
$('#openBtn').addEventListener('click', () => act('open'));
$('#histBtn').addEventListener('click', () => act('history'));
$('#histNow').addEventListener('click', async () => {
  const label = prompt('Name this version (optional)', '') || 'Saved version';
  await addSnap(label, captureDoc());
  openHistory();
  toast('Version saved');
});
document.addEventListener('keydown', e => {
  if (studioOpen()) return;
  const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
  if (mod && k === 's') { e.preventDefault(); act(e.shiftKey ? 'savefile' : 'save'); }
  else if (mod && k === 'o') { e.preventDefault(); act('open'); }
  else if (mod && k === 'f' && document.activeElement === ed) { e.preventDefault(); act('find'); }
});
window.addEventListener('beforeunload', () => { captureDoc(); persistDoc(cur); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { if (studioOpen()) Draft.flush(); else saveNow(); }
});

/* ------------------------------------------- drawing draft (crash recovery) */
const Draft = (() => {
  let t = null;
  async function write() {
    t = null;
    if (!studioOpen() || !DS.data || !DS.dirty) return;
    try { await Store.put('drafts', { id: 'studio', t: Date.now(), fid: DS.meta && DS.meta.fid, data: DS.data }); } catch (_) { /* ignore */ }
  }
  return {
    touch() { if (t) clearTimeout(t); t = setTimeout(write, 1500); },
    flush() { if (t) clearTimeout(t); return write(); },
    async clear() { if (t) { clearTimeout(t); t = null; } try { await Store.del('drafts', 'studio'); } catch (_) { /* ignore */ } },
    async load() { try { return await Store.get('drafts', 'studio'); } catch (_) { return null; } }
  };
})();
