'use strict';
/* =====================================================================
   editor.js - rich-text document, figures (drawings / images), toolbar,
   find & replace, word count
   ===================================================================== */

/* ---- document helpers ---- */
function textNodes() {
  const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT, {
    acceptNode: n => n.parentElement && n.parentElement.closest('figure') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  const a = [];
  while (w.nextNode()) a.push(w.currentNode);
  return a;
}
function docText() { return textNodes().map(n => n.data).join(' ').replace(/ /g, ' '); }
/* HTML that is stored: drawings are kept as data only (re-rendered on load) */
function getHTML() {
  const c = ed.cloneNode(true);
  c.querySelectorAll('figure.drw').forEach(f => { f.innerHTML = ''; });
  c.querySelectorAll('figure.sel').forEach(f => f.classList.remove('sel'));
  return c.innerHTML;
}
function updateStats() {
  const t = docText().trim();
  const words = t ? t.split(/\s+/).filter(Boolean).length : 0;
  const figs = ed.querySelectorAll('figure').length;
  $('#wc').textContent = words + ' words · ' + t.replace(/\s/g, '').length + ' characters' + (figs ? ' · ' + figs + ' figure' + (figs > 1 ? 's' : '') : '');
  ed.classList.toggle('empty', !t && !ed.querySelector('table,figure,hr'));
}
let saveT;
function changed() {
  updateStats();
  if (typeof setState === 'function') setState('Saving…');
  clearTimeout(saveT);
  saveT = setTimeout(() => { if (typeof saveNow === 'function') saveNow(); }, 600);
}

/* ---- selection save / restore so toolbar buttons work ---- */
let saved = null;
document.addEventListener('selectionchange', () => {
  const s = getSelection();
  if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange();
});
function restore() {
  ed.focus();
  if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); }
}
function exec(c, v) { restore(); document.execCommand(c, false, v == null ? null : v); changed(); }
document.execCommand('defaultParagraphSeparator', false, 'p');
try { document.execCommand('styleWithCSS', false, true); } catch (_) { /* ignore */ }

/* ---- figures (drawings + images) ---- */
let selBlk = null;
const newFid = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function renderFig(fig) {
  let d;
  try { d = JSON.parse(fig.dataset.drw); } catch (_) { return; }
  fig.contentEditable = 'false';
  fig.innerHTML = buildSVG(d, { pct: +(fig.dataset.wp || 100) });
}
function hydrate() {
  ed.querySelectorAll('figure.drw').forEach(f => { if (!f.dataset.fid) f.dataset.fid = newFid(); renderFig(f); });
  ed.querySelectorAll('figure.dimg').forEach(f => { f.contentEditable = 'false'; });
}
function makeFig(data, fid) {
  const fg = document.createElement('figure');
  fg.className = 'drw';
  fg.dataset.wp = '100';
  fg.dataset.fid = fid || newFid();
  fg.dataset.drw = JSON.stringify(data);
  renderFig(fg);
  return fg;
}
function insertBlock(el) {
  let n = saved && saved.startContainer;
  while (n && n.parentNode !== ed) n = n.parentNode;
  const blk = n && n.parentNode === ed ? n : null;
  if (blk && blk.tagName === 'P' && !blk.textContent.trim() && !blk.querySelector('img,figure')) ed.replaceChild(el, blk);
  else if (blk) blk.after(el);
  else ed.appendChild(el);
  if (!el.nextElementSibling || el.nextElementSibling.tagName !== 'P') {
    const p = document.createElement('p'); p.innerHTML = '<br>'; el.after(p);
  }
  saved = null;
  changed();
}
function insertDrawing() {
  const fid = newFid();
  openStudio(newData(900, 600), nd => {
    const fg = makeFig(nd, fid);
    insertBlock(fg);
    selectBlk(fg);
  }, { fid });
}
function editFigure(fig) {
  let d;
  try { d = JSON.parse(fig.dataset.drw); } catch (_) { return; }
  if (!fig.dataset.fid) fig.dataset.fid = newFid();
  openStudio(d, nd => {
    fig.dataset.drw = JSON.stringify(nd);
    renderFig(fig);
    changed();
    selectBlk(fig);
  }, { fid: fig.dataset.fid });
}
/* used when a crashed / closed session left an unsaved drawing draft */
function recoverDrawing(data, fid) {
  const fig = fid ? ed.querySelector('figure.drw[data-fid="' + fid + '"]') : null;
  if (fig) {
    openStudio(data, nd => { fig.dataset.drw = JSON.stringify(nd); renderFig(fig); changed(); selectBlk(fig); }, { fid });
  } else {
    const nf = fid || newFid();
    openStudio(data, nd => {
      const fg = makeFig(nd, nf);
      ed.appendChild(fg);
      const p = document.createElement('p'); p.innerHTML = '<br>'; ed.appendChild(p);
      changed(); selectBlk(fg);
    }, { fid: nf });
  }
}
function newMap() {
  saveNow();
  newDoc();
  $('#title').value = 'Location map';
  ed.innerHTML = '<h2 style="text-align:center">Location map</h2>';
  const fg = makeFig(newData(794, 1000));
  ed.appendChild(fg);
  const p = document.createElement('p'); p.innerHTML = '<br>'; ed.appendChild(p);
  changed();
  editFigure(fg);
}
function selectBlk(el) {
  if (selBlk) selBlk.classList.remove('sel');
  selBlk = el;
  if (el) { el.classList.add('sel'); showBar(); } else $('#figBar').hidden = true;
}
function showBar() {
  if (!selBlk) return;
  const bar = $('#figBar'), r = selBlk.getBoundingClientRect();
  bar.hidden = false;
  $('#figBar [data-f="edit"]').style.display = selBlk.classList.contains('drw') ? '' : 'none';
  bar.style.left = Math.max(6, Math.min(innerWidth - bar.offsetWidth - 6, r.left + r.width / 2 - bar.offsetWidth / 2)) + 'px';
  bar.style.top = Math.max(50, Math.min(innerHeight - 60, r.top - bar.offsetHeight - 6)) + 'px';
}
function setWP(b, wp) {
  wp = Math.max(10, Math.min(100, wp));
  b.dataset.wp = wp;
  const el = b.querySelector('svg,img');
  if (el) el.style.width = wp + '%';
  changed(); showBar();
}
ed.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('figure.drw,figure.dimg');
  selectBlk(b && ed.contains(b) ? b : null);
  if (b) getSelection().removeAllRanges();
});
ed.addEventListener('dblclick', e => { const b = e.target.closest && e.target.closest('figure.drw'); if (b) editFigure(b); });
$('#figBar').addEventListener('mousedown', e => e.preventDefault());
$('#figBar').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || !selBlk) return;
  const a = b.dataset.f, fg = selBlk, wp = +(fg.dataset.wp || 100);
  if (a === 'edit') editFigure(fg);
  else if (a === 'l' || a === 'c' || a === 'r') { fg.style.textAlign = a === 'l' ? 'left' : a === 'r' ? 'right' : 'center'; changed(); }
  else if (a === 'minus') setWP(fg, wp - 10);
  else if (a === 'plus') setWP(fg, wp + 10);
  else if (a === 'del') { fg.remove(); selectBlk(null); if (!ed.firstChild) ed.innerHTML = '<p><br></p>'; changed(); }
});
$('main').addEventListener('scroll', () => { if (selBlk) showBar(); });
window.addEventListener('resize', () => { if (selBlk) showBar(); });
document.addEventListener('keydown', e => {
  if (studioOpen() || !selBlk) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault(); selBlk.remove(); selectBlk(null);
    if (!ed.firstChild) ed.innerHTML = '<p><br></p>';
    changed();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const p = document.createElement('p'); p.innerHTML = '<br>'; selBlk.after(p);
    selectBlk(null);
    const r = document.createRange(); r.setStart(p, 0); r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    changed();
  } else if (e.key === 'Escape') selectBlk(null);
});

/* ---- toolbar ---- */
$('#tools').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
$('#tools').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.cmd) { exec(b.dataset.cmd); return; }
  const x = b.dataset.x;
  if (x === 'link') { restore(); const u = prompt('Link address', 'https://'); if (u) exec('createLink', u); }
  else if (x === 'table') {
    const v = prompt('Table size: rows x columns', '3x3');
    if (!v) return;
    const m = /(\d+)\s*[x×,]\s*(\d+)/i.exec(v);
    if (!m) return;
    const r = Math.min(+m[1], 40), c = Math.min(+m[2], 12);
    let h = '<table>';
    for (let i = 0; i < r; i++) { h += '<tr>'; for (let j = 0; j < c; j++) h += '<td><br></td>'; h += '</tr>'; }
    exec('insertHTML', h + '</table><p><br></p>');
  }
  else if (x === 'date') exec('insertText', new Date().toLocaleDateString('en-GB'));
  else if (x === 'drawing') { restore(); insertDrawing(); }
  else if (x === 'image') { restore(); $('#imgIn').click(); }
  else if (x === 'pb') exec('insertHTML', '<hr class="pb"><p><br></p>');
  else if (b.dataset.act) act(b.dataset.act);
});
$('#drawBtn').addEventListener('click', insertDrawing);
$('#blockSel').addEventListener('change', e => exec('formatBlock', '<' + e.target.value + '>'));
$('#fontSel').addEventListener('change', e => {
  restore();
  if (getSelection().isCollapsed) { ed.style.setProperty('--doc-font', e.target.value); changed(); }
  else exec('fontName', e.target.value);
});
$('#sizeSel').addEventListener('change', e => {
  restore();
  const px = e.target.value;
  if (getSelection().isCollapsed) { ed.style.setProperty('--doc-size', px + 'px'); changed(); return; }
  document.execCommand('styleWithCSS', false, false);
  document.execCommand('fontSize', false, '7');
  document.execCommand('styleWithCSS', false, true);
  ed.querySelectorAll('font[size="7"]').forEach(f => {
    const s = document.createElement('span');
    s.style.fontSize = px + 'px';
    while (f.firstChild) s.appendChild(f.firstChild);
    f.replaceWith(s);
  });
  changed();
});
$('#lhSel').addEventListener('change', e => { ed.style.setProperty('--lh', e.target.value); changed(); });
$('#foreCol').addEventListener('input', e => exec('foreColor', e.target.value));
$('#backCol').addEventListener('input', e => exec('hiliteColor', e.target.value));
$('#imgIn').addEventListener('change', e => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  loadImg(f, 1400, url => {
    const fg = document.createElement('figure');
    fg.className = 'dimg'; fg.contentEditable = 'false'; fg.dataset.wp = '60';
    fg.innerHTML = '<img alt="" src="' + url + '" style="width:60%;max-width:100%;height:auto">';
    insertBlock(fg);
    selectBlk(fg);
  });
});

/* ---- find & replace ---- */
$('#fNext').onclick = () => {
  const q = $('#fq').value; if (!q) return;
  const ok = window.find(q, false, false, true, false, false, false);
  $('#fMsg').textContent = ok ? '' : 'Not found';
};
$('#fOne').onclick = () => {
  const q = $('#fq').value; if (!q) return;
  const s = getSelection();
  if (s.rangeCount && s.toString().toLowerCase() === q.toLowerCase() && ed.contains(s.anchorNode)) {
    document.execCommand('insertText', false, $('#fr').value); changed();
  }
  window.find(q, false, false, true, false, false, false);
};
$('#fAll').onclick = () => {
  const q = $('#fq').value; if (!q) return;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), rep = $('#fr').value;
  let n = 0;
  textNodes().forEach(t => { t.data = t.data.replace(re, () => { n++; return rep; }); });
  $('#fMsg').textContent = n + ' replaced';
  changed();
};
$('#fClose').onclick = () => { $('#findbar').hidden = true; };

ed.addEventListener('input', changed);
