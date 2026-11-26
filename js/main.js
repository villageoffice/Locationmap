'use strict';
/* =====================================================================
   main.js - start-up. Scripts load in this order:
   icons, store, symbols, symbols-pictos, core, studio, editor, files, main
   ===================================================================== */
(async function start() {
  hydrateIcons();
  wireStudio();
  initUI();
  await loadLibrary();
  let last = null;
  try { last = localStorage.getItem(CURK); } catch (_) { /* ignore */ }
  const ids = Object.keys(docs);
  if (last && docs[last]) loadDoc(last);
  else if (ids.length) loadDoc(ids.sort((a, b) => docs[b].updated - docs[a].updated)[0]);
  else newDoc();
  ed.focus();

  /* an unsaved drawing from a closed tab / crash? offer to recover it */
  const dr = await Draft.load();
  if (dr && dr.data) {
    if (confirm('A drawing from ' + fmtDate(dr.t) + ' was not finished.\nOpen it again?')) recoverDrawing(dr.data, dr.fid);
    else Draft.clear();
  }

  if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode is optional */ });
  }
  window.App = { DS, K, SYM, SYMMAP, Store, renderObjs, buildSVG, mkPath, newData, docs: () => docs, ready: true };
})();
