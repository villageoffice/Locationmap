/* Page templates: a locked layer drawn behind the drawing (never selectable, never moved).
   d.tpl = {id:'locmap'}  built-in vector form
         = {src:'data:image/…'}  an uploaded picture used as the page background */
const TEMPLATES = {
  locmap: { name: 'Location Map form (Malayalam, A4)', w: 794, h: 1123 }
};
const TPL_FONT = "'Noto Sans Malayalam','Manjari','Nirmala UI','Kartika',sans-serif";

function tplOk(t) {
  if (!t || typeof t !== 'object') return null;
  if (t.id && TEMPLATES[t.id]) return { id: t.id };
  if (typeof t.src === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+\/=]+$/.test(t.src)) return { src: t.src };
  return null;
}

/* returns SVG markup (page coordinates 0..w, 0..h) */
function tplSVG(d) {
  const t = tplOk(d.tpl);
  if (!t) return '';
  const w = d.w, h = d.h;
  if (t.src) return '<image href="' + t.src + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none"/>';
  /* built-in form: positions are fractions of the page, so it stretches to any size */
  const X = f => +(f * w).toFixed(1), Y = f => +(f * h).toFixed(1), fs = w / 794;
  const T = (x, y, s, txt, o) => '<text x="' + X(x) + '" y="' + Y(y) + '" font-size="' + (s * fs).toFixed(1) + '" font-family="' + TPL_FONT + '" fill="#111"' + (o || '') + '>' + txt + '</text>';
  const L = (y) => '<line x1="' + X(0.028) + '" y1="' + Y(y) + '" x2="' + X(0.972) + '" y2="' + Y(y) + '" stroke="#333" stroke-width="1.2"/>';
  const rows = [['ജില്ല :', 'തണ്ടപ്പേര് :'], ['താലൂക്ക് :', 'റി. സ. :'], ['വില്ലേജ് :', 'വിസ്തീർണ്ണം :'], ['കൈവശം:', 'Doc No &amp; SRO .']];
  let s = '<g pointer-events="none">';
  s += '<rect x="' + X(0.026) + '" y="' + Y(0.017) + '" width="' + X(0.948) + '" height="' + Y(0.966) + '" fill="none" stroke="#333" stroke-width="2.4"/>';
  s += '<rect x="' + X(0.031) + '" y="' + Y(0.021) + '" width="' + X(0.938) + '" height="' + Y(0.958) + '" fill="none" stroke="#333" stroke-width="1"/>';
  s += T(0.5, 0.039, 22, 'ലൊക്കേഷൻ മാപ്പ്', ' text-anchor="middle" font-weight="700" text-decoration="underline"');
  rows.forEach((r, i) => {
    const y = 0.0715 + i * 0.0245;
    s += T(0.032, y, 15, r[0]) + T(0.507, y, 15, r[1]);
  });
  s += L(0.165) + L(0.746);
  s += T(0.054, 0.7745, 19, 'നാലതിരുകൾ', ' text-decoration="underline"');
  [['കിഴക്ക് :', 0.7945], ['വടക്ക് :', 0.8225], ['പടിഞ്ഞാറ് :', 0.851], ['തെക്ക് :', 0.879], ['സ്ഥലം :', 0.939], ['തിയതി:', 0.9665]].forEach(r => { s += T(0.04, r[1], 15, r[0]); });
  s += T(0.945, 0.9575, 15, 'വില്ലേജ് ഓഫീസറുടെ ഒപ്പ്', ' text-anchor="end"');
  return s + '</g>';
}

/* the drawable area inside the built-in form (used to centre new content) */
function tplArea(d) {
  const t = tplOk(d.tpl);
  if (t && t.id === 'locmap') return { x: d.w * 0.035, y: d.h * 0.168, w: d.w * 0.93, h: d.h * 0.576 };
  return null;
}
