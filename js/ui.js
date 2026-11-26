'use strict';
/* =====================================================================
   ui.js - menu bars, layers panel, dock tabs, document zoom.
   Menus never contain their own logic: every item calls an existing
   function or presses an existing button, so toolbar, keys and menus
   always behave the same.
   ===================================================================== */

/* ------------------------------------------------------------ menu bars */
const pressBtn = sel => () => { const e = $(sel); if (e) e.click(); };
const doAct = n => () => act(n);

function closeMenus() {
  $$('.mm.open').forEach(m => { m.classList.remove('open'); m.querySelector('.mpop').hidden = true; });
}

function buildMenus(host, defs) {
  host.innerHTML = '';
  defs.forEach(def => {
    const wrap = document.createElement('div'); wrap.className = 'mm';
    const btn = document.createElement('button'); btn.className = 'mt'; btn.textContent = def.t;
    btn.setAttribute('aria-haspopup', 'true');
    const pop = document.createElement('div'); pop.className = 'mpop'; pop.hidden = true; pop.setAttribute('role', 'menu');
    def.items.forEach(it => {
      if (it === '-') { pop.appendChild(document.createElement('hr')); return; }
      const x = document.createElement('button');
      x.setAttribute('role', 'menuitem');
      x.innerHTML = (it.i ? ic(it.i) : '<span style="width:18px;flex:none"></span>') + '<span>' + esc(it.t) + '</span>' + (it.k ? '<kbd>' + esc(it.k) + '</kbd>' : '');
      if (it.danger) x.classList.add('danger');
      if (it.on) x.classList.add('chk');
      x._it = it;
      pop.appendChild(x);
    });
    const open = () => {
      closeMenus();
      pop.querySelectorAll('button.chk').forEach(b => b.classList.toggle('on', !!b._it.on()));
      wrap.classList.add('open'); pop.hidden = false;
    };
    btn.addEventListener('click', e => { e.stopPropagation(); wrap.classList.contains('open') ? closeMenus() : open(); });
    btn.addEventListener('mouseenter', () => { if (document.querySelector('.mm.open') && !wrap.classList.contains('open')) open(); });
    pop.addEventListener('mousedown', e => e.preventDefault());          /* keep the text selection in the editor */
    pop.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      closeMenus();
      b._it.run();
    });
    wrap.append(btn, pop);
    host.appendChild(wrap);
  });
}

const DOC_MENUS = [
  { t: 'File', items: [
    { i: 'filenew', t: 'New document', run: doAct('new') },
    { i: 'map', t: 'New location map', run: doAct('newmap') },
    '-',
    { i: 'library', t: 'My documents…', run: doAct('library') },
    { i: 'open', t: 'Open file…', k: 'Ctrl+O', run: doAct('open') },
    { i: 'save', t: 'Save', k: 'Ctrl+S', run: doAct('save') },
    { i: 'download', t: 'Save as file…', k: 'Ctrl+Shift+S', run: doAct('savefile') },
    { i: 'history', t: 'Version history…', run: doAct('history') },
    '-',
    { i: 'download', t: 'Export Word (.doc)', run: doAct('doc') },
    { i: 'download', t: 'Export HTML', run: doAct('html') },
    { i: 'download', t: 'Export text (.txt)', run: doAct('txt') },
    { i: 'print', t: 'Print / save as PDF', run: doAct('print') },
    '-',
    { i: 'trash', t: 'Delete this document', danger: 1, run: doAct('delete') }
  ] },
  { t: 'Edit', items: [
    { i: 'undo', t: 'Undo', k: 'Ctrl+Z', run: pressBtn('#tools [data-cmd="undo"]') },
    { i: 'redo', t: 'Redo', k: 'Ctrl+Y', run: pressBtn('#tools [data-cmd="redo"]') },
    '-',
    { i: 'find', t: 'Find & replace', k: 'Ctrl+F', run: doAct('find') },
    { i: 'copy', t: 'Copy all text', run: doAct('copy') },
    { i: 'clearfmt', t: 'Clear formatting', run: pressBtn('#tools [data-cmd="removeFormat"]') }
  ] },
  { t: 'Insert', items: [
    { i: 'map', t: 'Drawing / location map', run: pressBtn('#tools [data-x="drawing"]') },
    { i: 'image', t: 'Image…', run: pressBtn('#tools [data-x="image"]') },
    { i: 'table', t: 'Table…', run: pressBtn('#tools [data-x="table"]') },
    { i: 'link', t: 'Link…', run: pressBtn('#tools [data-x="link"]') },
    '-',
    { i: 'pagebreak', t: 'Page break', run: pressBtn('#tools [data-x="pb"]') },
    { i: 'hr', t: 'Horizontal line', run: pressBtn('#tools [data-cmd="insertHorizontalRule"]') },
    { i: 'calendar', t: "Today's date", run: pressBtn('#tools [data-x="date"]') }
  ] },
  { t: 'View', items: [
    { i: 'zoomIn', t: 'Zoom in', run: pressBtn('#dzIn') },
    { i: 'zoomOut', t: 'Zoom out', run: pressBtn('#dzOut') },
    { i: 'fit', t: 'Zoom 100%', run: () => setDocZoom(1) }
  ] },
  { t: 'Help', items: [{ i: 'help', t: 'Help & shortcuts', run: doAct('help') }] }
];

const studioSelectAll = () => {
  if (DS.tool !== 'select') setTool('select');
  setSel(DS.data.objs.filter(o => !o.locked).map(o => o.id));
};
const STUDIO_MENUS = [
  { t: 'File', items: [
    { i: 'open', t: 'Open drawing file…', run: pressBtn('#dfOpen') },
    { i: 'save', t: 'Save drawing file', run: pressBtn('#dfSave') },
    '-',
    { i: 'image', t: 'Export PNG image', run: pressBtn('#dfPng') },
    { i: 'download', t: 'Export SVG', run: pressBtn('#dfSvg') },
    '-',
    { i: 'page', t: 'Page setup…', run: pressBtn('#sPage') },
    { i: 'orient', t: 'Portrait / landscape', run: pressBtn('#sOrient') },
    { i: 'history', t: 'Revert to how it was when opened', run: pressBtn('#dfRevert') },
    { i: 'trash', t: 'Clear drawing', danger: 1, run: pressBtn('#dfClear') },
    '-',
    { i: 'close', t: 'Close without inserting', run: pressBtn('#sCancel') }
  ] },
  { t: 'Edit', items: [
    { i: 'undo', t: 'Undo', k: 'Ctrl+Z', run: () => undo() },
    { i: 'redo', t: 'Redo', k: 'Ctrl+Y', run: () => redo() },
    '-',
    { i: 'copy', t: 'Duplicate', k: 'Ctrl+D', run: () => dupSel() },
    { i: 'select', t: 'Select all', k: 'Ctrl+A', run: studioSelectAll },
    '-',
    { i: 'group', t: 'Group', k: 'Ctrl+G', run: () => action('group') },
    { i: 'ungroup', t: 'Ungroup', k: 'Ctrl+Shift+G', run: () => action('ungroup') },
    { i: 'lock', t: 'Lock / unlock', run: () => action('lock') },
    '-',
    { i: 'trash', t: 'Delete', k: 'Del', run: () => delSel() }
  ] },
  { t: 'View', items: [
    { i: 'zoomIn', t: 'Zoom in', run: pressBtn('#sZoomIn') },
    { i: 'zoomOut', t: 'Zoom out', run: pressBtn('#sZoomOut') },
    { i: 'fit', t: 'Fit page', run: pressBtn('#sFit') },
    '-',
    { i: 'grid', t: 'Grid', on: () => DS.grid, run: pressBtn('#sGrid') },
    { i: 'magnet', t: 'Snap to points', on: () => DS.snap, run: pressBtn('#sSnap') },
    '-',
    { i: 'edit', t: 'Properties panel', run: () => dockTab('prop') },
    { i: 'group', t: 'Layers panel', run: () => dockTab('layers') }
  ] },
  { t: 'Insert', items: [
    { i: 'symbol', t: 'Symbol…', run: () => setTool('sym') },
    { i: 'text', t: 'Text', k: 'T', run: () => setTool('text') },
    { i: 'image', t: 'Image…', run: () => setTool('image') },
    { i: 'qr', t: 'Map QR code…', run: () => setTool('qr') },
    '-',
    { i: 'rect', t: 'Rectangle', run: () => setTool('rect') },
    { i: 'ellipse', t: 'Ellipse', run: () => setTool('ellipse') },
    { i: 'plotbox', t: 'Plot box', run: () => setTool('plotbox') }
  ] },
  { t: 'Arrange', items: [
    { i: 'front', t: 'Bring to front', run: () => action('front') },
    { i: 'up', t: 'Forward', run: () => action('up') },
    { i: 'down', t: 'Backward', run: () => action('down') },
    { i: 'back', t: 'Send to back', run: () => action('back') },
    '-',
    { i: 'rotCcw', t: 'Rotate 90° left', run: () => action('rotL') },
    { i: 'rotCw', t: 'Rotate 90° right', k: 'R', run: () => action('rotR') },
    { i: 'angle', t: 'Rotate by angle…', run: () => action('rotN') },
    '-',
    { i: 'alignPL', t: 'Align to page left', run: () => alignPage('l') },
    { i: 'alignPC', t: 'Centre on page (horizontal)', run: () => alignPage('c') },
    { i: 'alignPR', t: 'Align to page right', run: () => alignPage('r') },
    { i: 'alignPT', t: 'Align to page top', run: () => alignPage('t') },
    { i: 'alignPM', t: 'Centre on page (vertical)', run: () => alignPage('m') },
    { i: 'alignPB', t: 'Align to page bottom', run: () => alignPage('b') }
  ] },
  { t: 'Help', items: [{ i: 'help', t: 'Help & shortcuts', run: pressBtn('#sHelp') }] }
];

/* ------------------------------------------------------------ layers + dock */
function dockTab(t) {
  $$('.dtabs button').forEach(b => b.classList.toggle('on', b.dataset.dt === t));
  $('#sCtx').hidden = t !== 'prop';
  $('#sLayers').hidden = t !== 'layers';
  if (t === 'layers') paintLayers();
}

const LY_ICON = { path: 'nodes', rect: 'rect', ellipse: 'ellipse', text: 'text', sym: 'symbol', img: 'image', qr: 'qr' };
function layerName(o) {
  switch (o.type) {
    case 'path':
      if (o.rtype && ROAD_PRESETS[o.rtype]) return ROAD_PRESETS[o.rtype].n + ' road';
      if (ROAD_PRESETS[o.kind]) return ROAD_PRESETS[o.kind].n + ' road';
      return (K[o.kind] && K[o.kind].n) || 'Line';
    case 'rect': return 'Rectangle';
    case 'ellipse': return 'Ellipse';
    case 'text': return (String(o.text || 'Text').split('\n')[0] || 'Text').slice(0, 26);
    case 'sym': { const S = SYMMAP[o.sym] || ONLINE[o.sym]; return o.label ? o.label.split('\n')[0] : (S ? S.e : 'Symbol'); }
    case 'img': return 'Image';
    case 'qr': return 'QR code';
  }
  return 'Object';
}

let _lyRaf = 0;
function renderLayers() {
  if (_lyRaf) return;
  _lyRaf = requestAnimationFrame(() => { _lyRaf = 0; paintLayers(); });
}
function paintLayers() {
  if (!DS.data || !studioOpen()) return;
  const objs = DS.data.objs, cnt = $('#lyCount');
  if (cnt) cnt.textContent = objs.length || '';
  if ($('#sLayers').hidden) return;
  const list = $('#lyList');
  if (!objs.length) { list.innerHTML = '<p class="none">No objects yet.<br>Draw something and it appears here.</p>'; return; }
  let h = '';
  for (let i = objs.length - 1; i >= 0; i--) {
    const o = objs[i], on = DS.sel.includes(o.id);
    h += '<div class="ly' + (on ? ' on' : '') + (o.locked ? ' lk' : '') + '" data-id="' + o.id + '">' +
      '<span class="lyi">' + ic(LY_ICON[o.type] || 'rect', '', 16) + '</span>' +
      '<span class="lyn">' + esc(layerName(o)) + '</span>' +
      '<button data-ly="lock" title="' + (o.locked ? 'Unlock' : 'Lock') + '" class="' + (o.locked ? 'on' : '') + '">' + ic(o.locked ? 'lock' : 'unlock', '', 15) + '</button>' +
      '<button data-ly="del" title="Delete">' + ic('trash', '', 15) + '</button></div>';
  }
  list.innerHTML = h;
}

function onLayerClick(e) {
  const row = e.target.closest('.ly'); if (!row) return;
  const o = obj(row.dataset.id); if (!o) return;
  const b = e.target.closest('button[data-ly]');
  if (b) {
    pushH();
    if (b.dataset.ly === 'lock') {
      o.locked = !o.locked;
      if (o.locked) DS.sel = DS.sel.filter(i => i !== o.id);
    } else {
      DS.data.objs = DS.data.objs.filter(x => x.id !== o.id);
      DS.sel = DS.sel.filter(i => i !== o.id);
    }
    renderStudio(); syncCtx();
    return;
  }
  if (DS.tool !== 'select') setTool('select');
  if (e.shiftKey || e.ctrlKey || e.metaKey) toggleSel(o); else setSel([o.id]);
}

/* ------------------------------------------------------------ document zoom */
let docZoom = 1;
function setDocZoom(z) {
  docZoom = Math.max(0.5, Math.min(2, Math.round(z * 100) / 100));
  ed.style.setProperty('--pz', docZoom);
  $('#dzLbl').textContent = Math.round(docZoom * 100) + '%';
  if (typeof selBlk !== 'undefined' && selBlk && typeof showBar === 'function') showBar();
}

/* ------------------------------------------------------------ start-up */
function initUI() {
  buildMenus($('#mbar'), DOC_MENUS);
  buildMenus($('#sMbar'), STUDIO_MENUS);
  document.addEventListener('click', e => { if (!e.target.closest('.mm')) closeMenus(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); }, true);
  window.addEventListener('blur', closeMenus);

  $$('.dtabs button').forEach(b => b.addEventListener('click', () => dockTab(b.dataset.dt)));
  $('#lyList').addEventListener('click', onLayerClick);

  $('#dzIn').addEventListener('click', () => setDocZoom(docZoom + 0.1));
  $('#dzOut').addEventListener('click', () => setDocZoom(docZoom - 0.1));
  $('#dzLbl').addEventListener('dblclick', () => setDocZoom(1));

  /* on a phone the dock is only the property bar: always show it */
  if (window.matchMedia) {
    const mq = window.matchMedia('(max-width:820px)');
    const fix = () => { if (mq.matches) dockTab('prop'); };
    if (mq.addEventListener) mq.addEventListener('change', fix); else if (mq.addListener) mq.addListener(fix);
  }
}
