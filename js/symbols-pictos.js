'use strict';
/* =====================================================================
   symbols-pictos.js - pictogram symbols (coloured badge + line glyph)
   Loaded after symbols.js; builds the final SYM list and SYMMAP.

   Row format:
     [id, English name, Malayalam search alias, category, badge colour, glyph, glyph colour?, shape?]
   Glyph (24 x 24 grid):  'M..'   stroked path
                          'F:M..' filled path
                          'T:ab|size' text
   Shape: 'c' = round badge (default rounded square)
   To add a symbol: add one row below. Categories: survey, buildings,
   services, transport, utilities, nature, water, safety, marks.
   ===================================================================== */
const SYM_PICTOS = (() => {
  const W = '#ffffff';
  const R = [
    /* ---------------- services ---------------- */
    ['police', 'Police station', 'പോലീസ് സ്റ്റേഷൻ', 'services', '#1e3a8a', 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z'],
    ['firestn', 'Fire station', 'ഫയർ സ്റ്റേഷൻ', 'services', '#d84315', 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z'],
    ['ambulance', 'Emergency / ambulance', 'ആംബുലൻസ്', 'services', '#c62828', 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z'],
    ['pharmacy', 'Pharmacy', 'മെഡിക്കൽ ഷോപ്പ്', 'services', '#2e7d32', 'M10.5 20.5a4.95 4.95 0 0 1-7-7l10-10a4.95 4.95 0 0 1 7 7zM8.5 8.5l7 7'],
    ['library', 'Library', 'ലൈബ്രറി', 'services', '#6d4c41', 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13'],
    ['college', 'College / university', 'കോളേജ്', 'services', '#3949ab', 'M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5'],
    ['govoffice', 'Government office', 'സർക്കാർ ഓഫീസ്', 'services', '#37474f', 'M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7z'],
    ['toilet', 'Toilet', 'ശൗചാലയം', 'services', '#00796b', 'T:WC|11'],
    ['parking', 'Parking', 'പാർക്കിംഗ്', 'services', '#1565c0', 'T:P|17'],
    ['atm', 'ATM', 'എടിഎം', 'services', '#00695c', 'T:ATM|8'],
    ['info', 'Information', 'വിവരം', 'services', '#1976d2', 'T:i|18'],
    ['hotel', 'Hotel / lodging', 'ഹോട്ടൽ', 'services', '#6a1b9a', 'M3 18V6M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6'],
    ['restaurant', 'Restaurant', 'ഭക്ഷണശാല', 'services', '#ef6c00', 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 21V3c-2 0-4 3-4 7 0 2 1 3 4 3'],
    ['cafe', 'Cafe / tea shop', 'ചായക്കട', 'services', '#795548', 'M5 8h12v6a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM17 9h2a2 2 0 0 1 0 5h-2M8 2v3M12 2v3'],
    ['market', 'Market', 'ചന്ത', 'services', '#e65100', 'M3 4h3l2 11h10l2-8H7M9 20h.01M17 20h.01'],
    ['evcharge', 'EV charging', 'ചാർജിംഗ്', 'services', '#2e7d32', 'M13 2L4 14h7l-1 8 9-12h-7z'],
    ['sports', 'Sports ground', 'കളിസ്ഥലം', 'services', '#00897b', cp(12, 12, 9) + 'M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18M3 12h18'],
    ['phone', 'Telephone', 'ടെലിഫോൺ', 'services', '#455a64', 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 14l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z'],

    /* ---------------- transport ---------------- */
    ['airport', 'Airport', 'വിമാനത്താവളം', 'transport', '#455a64', 'M2 14l8-3V5a2 2 0 0 1 4 0v6l8 3v2l-8-2v4l2 1.5V21l-4-1-4 1v-1.5L10 18v-4l-8 2z'],
    ['bus', 'Bus', 'ബസ്', 'transport', '#f57c00', 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10H4zM4 11h16M7 19v-3M17 19v-3'],
    ['train', 'Train', 'ട്രെയിൻ', 'transport', '#1565c0', 'M6 3h12a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V5a2 2 0 0 1 2-2zM4 11h16M8 21l2-3M16 21l-2-3'],
    ['ferry', 'Ferry / boat jetty', 'കടത്ത്', 'transport', '#0277bd', 'M2 18c2 2 4 2 6 0s4-2 6 0 4 2 6 0M5 14l1-6h12l1 6zM12 8V3'],
    ['bicycle', 'Bicycle', 'സൈക്കിൾ', 'transport', '#2e7d32', cp(6, 17, 3.5) + cp(18, 17, 3.5) + 'M6 17l4-8h5l3 8M10 9l3 8M9 6h3'],
    ['pedestrian', 'Pedestrian', 'കാൽനട', 'transport', '#455a64', cp(12, 5.5, 1.5) + 'M12 9v6M12 11l-4 3M12 11l4 3M12 15l-3 6M12 15l3 6'],
    ['car', 'Car / taxi', 'കാർ', 'transport', '#455a64', 'M5 17h14M5 17v-5l2-5h10l2 5v5M5 12h14M7.5 14.5h.01M16.5 14.5h.01'],
    ['tunnel', 'Tunnel', 'തുരങ്കം', 'transport', '#5d4037', 'M3 20V11a9 9 0 0 1 18 0v9M7 20v-8a5 5 0 0 1 10 0v8'],
    ['helipad', 'Helipad', 'ഹെലിപ്പാഡ്', 'transport', '#455a64', 'T:H|17'],

    /* ---------------- utilities ---------------- */
    ['powerstn', 'Power station', 'വൈദ്യുത നിലയം', 'utilities', '#ef6c00', 'M4 21V9l5-3v4l5-3v4l6-2v12zM8 21v-4h3v4'],
    ['substation', 'Substation', 'സബ്സ്റ്റേഷൻ', 'utilities', '#e65100', 'M4 21V8l8-5 8 5v13zM12 8v6M9 11h6'],
    ['solar', 'Solar panel', 'സോളാർ', 'utilities', '#f9a825', cp(12, 12, 4) + 'M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5', '#212121'],
    ['windturb', 'Wind turbine', 'കാറ്റാടി', 'utilities', '#0097a7', 'M12 11v11M9 22h6M12 11V3M12 11l6.9 4M12 11L5.1 15'],
    ['signal', 'Mobile tower / signal', 'സിഗ്നൽ', 'utilities', '#5e35b1', cp(12, 12, 1) + 'M8 8a5.7 5.7 0 0 0 0 8M16 8a5.7 5.7 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14'],
    ['streetlight', 'Street light', 'വഴിവിളക്ക്', 'utilities', '#f9a825', 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z', '#212121'],
    ['manhole', 'Manhole / drain', 'മാൻഹോൾ', 'utilities', '#546e7a', cp(12, 12, 9) + 'M5.5 8h13M5.5 16h13M8 5.5v13M16 5.5v13'],

    /* ---------------- nature ---------------- */
    ['forest', 'Forest / pine', 'വനം', 'nature', '#2e7d32', 'M12 3l6 8h-3l5 7H4l5-7H6zM12 18v3'],
    ['leaf', 'Vegetation / plant', 'ചെടി', 'nature', '#558b2f', 'M5 21c0-9 5-16 16-17 0 11-6 17-16 17zM5 21l9-9'],
    ['mountain', 'Mountain / peak', 'മല', 'nature', '#5d4037', 'M3 20l6-11 4 6 3-4 5 9z'],
    ['camp', 'Camp site', 'ക്യാമ്പ്', 'nature', '#00796b', 'M3 20L12 4l9 16zM12 20v-6'],
    ['viewpoint', 'Viewpoint / photo', 'കാഴ്ചസ്ഥലം', 'nature', '#6a1b9a', 'M4 8h3l2-3h6l2 3h3v11H4z' + cp(12, 13.5, 3.5)],
    ['farm', 'Farm / barn', 'കൃഷിയിടം', 'nature', '#8d6e63', 'M3 11l9-7 9 7v10H3zM9 21v-6h6v6'],
    ['fish', 'Fishing / fish', 'മത്സ്യം', 'nature', '#0277bd', 'M3 12c3-5 9-6 14-2l4-3v10l-4-3c-5 4-11 3-14-2zM8 11.5h.01'],

    /* ---------------- water ---------------- */
    ['lake', 'Lake / river', 'തടാകം', 'water', '#0277bd', 'M2 8c2 2 4 2 6 0s4-2 6 0 4 2 6 0M2 14c2 2 4 2 6 0s4-2 6 0 4 2 6 0M2 20c2 2 4 2 6 0s4-2 6 0 4 2 6 0'],
    ['drop', 'Water point / tap', 'ജലസ്രോതസ്', 'water', '#0288d1', 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z'],
    ['dam', 'Dam / weir', 'അണക്കെട്ട്', 'water', '#546e7a', 'M3 6h18v4l-3 11H6L3 10zM9 10v8M15 10v8'],

    /* ---------------- safety ---------------- */
    ['warning', 'Warning', 'മുന്നറിയിപ്പ്', 'safety', '#f9a825', 'M12 3l10 18H2zM12 10v5M12 18h.01', '#212121'],
    ['hv', 'High voltage', 'ഹൈ വോൾട്ടേജ്', 'safety', '#f9a825', 'M12 3l10 18H2zM13 9l-3 5h3l-2 4', '#212121'],
    ['danger', 'Danger', 'അപകടം', 'safety', '#c62828', cp(12, 12, 9) + 'M12 7v6M12 17h.01'],
    ['noentry', 'No entry', 'പ്രവേശനമില്ല', 'safety', '#c62828', cp(12, 12, 9) + 'M6 12h12'],
    ['stop', 'Stop', 'നിർത്തുക', 'safety', '#c62828', 'M8 3h8l5 5v8l-5 5H8l-5-5V8z'],
    ['hydrant', 'Fire hydrant', 'ഹൈഡ്രന്റ്', 'safety', '#d84315', 'M9 5h6M10 3h4v2M8 9h8v10H8zM5 12h3M16 12h3M7 21h10'],
    ['exit', 'Exit / assembly', 'പുറത്തേക്ക്', 'safety', '#2e7d32', 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9'],
    ['firstaid', 'First aid', 'പ്രഥമ ശുശ്രൂഷ', 'safety', '#2e7d32', 'M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z'],

    /* ---------------- survey ---------------- */
    ['totalstn', 'Total station / tripod', 'ടോട്ടൽ സ്റ്റേഷൻ', 'survey', '#6a1b9a', 'M12 3v7M8 3h8M12 10L6 21M12 10l6 11M12 10v11'],
    ['gps', 'GPS point', 'ജിപിഎസ്', 'survey', '#6a1b9a', cp(12, 12, 4) + 'M12 3v4M12 17v4M3 12h4M17 12h4'],
    ['boundary', 'Boundary stone', 'അതിർത്തിക്കല്ല്', 'survey', '#6a1b9a', 'M5 5h14v14H5zM12 12h.01'],
    ['peg', 'Survey peg', 'കുറ്റി', 'survey', '#6a1b9a', 'M12 3v14M9 17l3 4 3-4'],
    ['tape', 'Tape / measurement', 'അളവ്', 'survey', '#6a1b9a', 'M3 17L17 3l4 4L7 21zM8 12l2 2M11 9l2 2M14 6l2 2'],
    ['compass', 'Compass', 'കോമ്പസ്', 'survey', '#6a1b9a', cp(12, 12, 9) + 'M15.5 8.5l-2 5-5 2 2-5z'],
    ['contour', 'Contour lines', 'കോണ്ടൂർ', 'survey', '#6a1b9a', 'M3 7c3-3 6 3 9 0s6 3 9 0M3 13c3-3 6 3 9 0s6 3 9 0M3 19c3-3 6 3 9 0s6 3 9 0'],
    ['spot', 'Spot height', 'ഉയരം', 'survey', '#6a1b9a', 'M12 3l9 9-9 9-9-9zM12 12h.01'],

    /* ---------------- marks ---------------- */
    ['star', 'Star', 'നക്ഷത്രം', 'marks', '#f9a825', 'F:M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z'],
    ['check', 'Check mark', 'ശരി', 'marks', '#2e7d32', 'M5 12l5 5L20 7'],
    ['xmark', 'X mark', 'തെറ്റ്', 'marks', '#c62828', 'M6 6l12 12M18 6L6 18'],
    ['question', 'Question mark', 'ചോദ്യം', 'marks', '#1565c0', 'T:?|18'],
    ['heart', 'Heart', 'ഹൃദയം', 'marks', '#d81b60', 'F:M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z'],
    ['arrowup', 'Arrow up', 'മുകളിലേക്ക്', 'marks', '#455a64', 'M12 19V5M6 11l6-6 6 6'],
    ['arrowdown', 'Arrow down', 'താഴേക്ക്', 'marks', '#455a64', 'M12 5v14M6 13l6 6 6-6'],
    ['arrowleft', 'Arrow left', 'ഇടത്തേക്ക്', 'marks', '#455a64', 'M19 12H5M11 6l-6 6 6 6'],
    ['arrowright', 'Arrow right', 'വലത്തേക്ക്', 'marks', '#455a64', 'M5 12h14M13 6l6 6-6 6']
  ];
  /* numbered / lettered round markers: 1-9, A-D */
  for (let i = 1; i <= 9; i++) R.push(['num' + i, 'Marker ' + i, 'നമ്പർ ' + i, 'marks', '#c62828', 'T:' + i + '|17', W, 'c']);
  ['A', 'B', 'C', 'D'].forEach(l => R.push(['let' + l, 'Marker ' + l, '', 'marks', '#1565c0', 'T:' + l + '|17', W, 'c']));

  function glyph(g, fg) {
    if (g.indexOf('T:') === 0) {
      const p = g.slice(2).split('|');
      return '<text x="12" y="' + (12 + (+p[1]) * 0.36) + '" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="' + p[1] + '" fill="' + fg + '" stroke="none">' + p[0] + '</text>';
    }
    if (g.indexOf('F:') === 0) return '<path d="' + g.slice(2) + '" fill="' + fg + '" stroke="' + fg + '" stroke-width="1.5"/>';
    return '<path d="' + g + '"/>';
  }
  return R.map(a => {
    const fg = a[6] || W;
    const badge = a[7] === 'c'
      ? '<circle cx="50" cy="50" r="44" fill="' + a[4] + '"/>'
      : '<rect x="6" y="6" width="88" height="88" rx="20" fill="' + a[4] + '"/>';
    const g = '<g transform="translate(20 20) scale(2.5)" fill="none" stroke="' + fg + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + glyph(a[5], fg) + '</g>';
    return { id: a[0], e: a[1], m: a[2], c: a[3], s: badge + g };
  });
})();

/* ---- final symbol list ---- */
const SYM = SYM_BASE.concat(SYM_PICTOS);
const SYMMAP = {};
SYM.forEach(s => { SYMMAP[s.id] = s; });
const SYM_CATS = [
  ['all', 'All'], ['survey', 'Survey'], ['buildings', 'Buildings'], ['services', 'Services'], ['transport', 'Transport'],
  ['utilities', 'Utilities'], ['nature', 'Nature'], ['water', 'Water'], ['safety', 'Safety'], ['marks', 'Marks']
];
