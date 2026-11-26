'use strict';
/* =====================================================================
   icons.js - UI icon set (24x24 line icons, drawn with currentColor)
   Usage in HTML:  <i data-i="save"></i>   (replaced at start-up)
   Usage in JS:    ic('save')  ->  '<svg ...>'
   ===================================================================== */
const cp = (x, y, r) =>   // circle as a path string
  'M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0z';

const ICON_PATHS = {
  globe: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9S14.500 18.300 12 21c-2.500-2.700-3.800-5.700-3.800-9S9.500 5.700 12 3',
  /* history / text */
  undo: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11',
  redo: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13',
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M19 4h-9M14 20H5M15 4L9 20',
  underline: 'M6 4v7a6 6 0 0 0 12 0V4M4 21h16',
  strike: 'M16 5.5A4 4 0 0 0 12 4c-2.5 0-4 1.3-4 3.2 0 4 8 2.6 8 6.6 0 2-1.8 3.2-4 3.2a4.5 4.5 0 0 1-4.2-2.2M4 12h16',
  alignL: 'M3 6h18M3 10h12M3 14h18M3 18h12',
  alignC: 'M3 6h18M6 10h12M3 14h18M6 18h12',
  alignR: 'M3 6h18M9 10h12M3 14h18M9 18h12',
  alignJ: 'M3 6h18M3 10h18M3 14h18M3 18h18',
  listUl: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01',
  listOl: 'M10 6h11M10 12h11M10 18h11M4 5l1.5-1v5M3.5 13.5a1.6 1.6 0 1 1 2.6 1.2L3.5 17H6.5',
  outdent: 'M3 6h18M11 10h10M11 14h10M3 18h18M7 9l-3 3 3 3',
  indent: 'M3 6h18M11 10h10M11 14h10M3 18h18M4 9l3 3-3 3',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
  image: 'M3 5h18v14H3zM8.5 10.5h.01M21 16l-5-5-8 8',
  pagebreak: 'M5 3v6h14V3M5 21v-6h14v6M3 12h2M8 12h2M13 12h2M18 12h3',
  hr: 'M3 12h18',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  clearfmt: 'M4 7V4h16v3M9 20h6M12 4v6M15 14l5 5M20 14l-5 5',
  find: cp(11, 11, 7) + 'M16 16l5 5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  more: 'M5 12h.01M12 12h.01M19 12h.01',

  /* files */
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  save: 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 21v-7h8v7',
  open: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  download: 'M12 4v11M7 11l5 5 5-5M4 20h16',
  upload: 'M12 16V5M7 9l5-5 5 5M4 20h16',
  print: 'M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M7 14h10v7H7z',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L20 7',
  history: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2',
  filenew: 'M6 3h9l4 4v14H6zM15 3v4h4M12 11v6M9 14h6',
  library: 'M4 4h4v16H4zM10 4h4v16h-4zM16.5 5l3.5 1-4 14-3.5-1z',
  help: cp(12, 12, 9) + 'M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01',
  edit: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3',

  /* view */
  zoomIn: cp(11, 11, 7) + 'M16 16l5 5M8 11h6M11 8v6',
  zoomOut: cp(11, 11, 7) + 'M16 16l5 5M8 11h6',
  fit: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  grid: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
  magnet: 'M6 3v8a6 6 0 0 0 12 0V3h-4v8a2 2 0 0 1-4 0V3zM6 7h4M14 7h4',
  page: 'M6 3h9l4 4v14H6zM15 3v4h4',
  orient: '<rect x="2" y="9" width="12" height="9" rx="1"/><rect x="16.5" y="4" width="5.5" height="14" rx="1"/>',

  /* edit */
  rotCw: 'M20 11A8 8 0 1 0 18 17M20 4v7h-7',
  rotCcw: 'M4 11a8 8 0 1 1 2 6M4 4v7h7',
  angle: 'M4 20h16M4 20L16 8M9 20a5 5 0 0 0-1.5-3.5',
  group: 'M3 3h18v18H3zM7 7h5v5H7zM12 12h5v5h-5z',
  ungroup: 'M3 3h8v8H3zM13 13h8v8h-8z',
  nodes: 'M4 19l6-11 5 7 5-10M3 18h3v3H3zM8.5 6.5h3v3h-3zM13.5 13.5h3v3h-3zM18.5 3.5h3v3h-3z',
  front: '<path d="M4 4h10v10H4z"/><path d="M10 10h10v10H10z" fill="currentColor"/>',
  back: '<path d="M4 4h10v10H4z" fill="currentColor"/><path d="M10 10h10v10H10z"/>',
  up: 'M12 20V5M6 11l6-6 6 6',
  down: 'M12 4v15M6 13l6 6 6-6',
  alignPL: 'M4 3v18M8 7h12v4H8zM8 14h7v4H8z',
  alignPC: 'M12 3v18M6 7h12v4H6zM8.5 14h7v4h-7z',
  alignPR: 'M20 3v18M4 7h12v4H4zM9 14h7v4H9z',
  alignPT: 'M3 4h18M7 8v12h4V8zM14 8v7h4V8z',
  alignPM: 'M3 12h18M7 6v12h4V6zM14 8.5v7h4v-7z',
  alignPB: 'M3 20h18M7 4v12h4V4zM14 9v7h4V9z',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2',
  fill: 'M4 12l8-8 8 8-8 8zM20 17c0 1.5-1 2.5-2 2.5s-2-1-2-2.5 2-3.5 2-3.5 2 2 2 3.5z',
  bend: 'M4 20v-8a8 8 0 0 1 8-8h8',
  centerline: 'M3 12h4M10 12h4M17 12h4M3 6h18M3 18h18',

  /* tools */
  select: 'M5 3l14 7-6 2-2 6z',
  pan: 'M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 14',
  eraser: 'M3 17l9-9 7 7-4 4H7zM8 12l7 7',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  rect: 'M4 6h16v12H4z',
  ellipse: 'M12 5c5 0 9 3 9 7s-4 7-9 7-9-3-9-7 4-7 9-7z',
  plotbox: 'M7 4h10v16H7z',
  symbol: 'M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 11.5h.01',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z'
};

function ic(name, cls, size) {
  const p = ICON_PATHS[name];
  if (p == null) return '';
  const inner = p.charAt(0) === '<' ? p : '<path d="' + p + '"/>';
  const s = size || 18;
  return '<svg class="i' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" width="' + s + '" height="' + s +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
}

function hydrateIcons(root) {
  (root || document).querySelectorAll('i[data-i]').forEach(function (el) {
    el.outerHTML = ic(el.dataset.i);
  });
}
