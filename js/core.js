'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ed=$('#editor');
const f2=n=>Math.round(n*100)/100;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone=o=>JSON.parse(JSON.stringify(o));
const COARSE=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const FONT="'Noto Sans Malayalam','Nirmala UI',sans-serif";
let toastT;
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),1800);}
let _uid=0;const uid=()=>'o'+Date.now().toString(36)+(++_uid).toString(36);

/* =====================================================================
   DRAWING CORE : kinds, symbols, renderer
   ===================================================================== */
const K={
 line:{n:'Line',t:'Straight line',cat:'line',two:1,col:'#1b1f24',sw:2},
 arrow:{n:'Arrow',t:'Arrow',cat:'line',two:1,col:'#1b1f24',sw:2},
 elbow:{n:'Elbow',t:'Elbow connector (90 degrees)',cat:'line',two:1,col:'#1b1f24',sw:2},
 cconn:{n:'Connector',t:'Curved connector',cat:'line',two:1,col:'#1b1f24',sw:2},
 curve:{n:'Curve',t:'Smooth curve through points',cat:'line',col:'#1b1f24',sw:2},
 poly:{n:'Polyline',t:'Polyline (click points)',cat:'line',col:'#1b1f24',sw:2},
 polygon:{n:'Polygon',t:'Polygon (optional fill)',cat:'line',closed:1,nodrag:1,min:3,col:'#1b1f24',sw:2},
 scribble:{n:'Freehand',t:'Freehand scribble',cat:'free',col:'#1b1f24',sw:2},
 nh:{n:'NH',t:'National highway (wide, double line)',cat:'road',rw:16,sw:1.6,col:'#222222',fill:'#ffffff'},
 sh:{n:'SH',t:'State highway',cat:'road',rw:12,sw:1.6,col:'#222222',fill:'#ffffff'},
 pwd:{n:'PWD',t:'PWD / main road',cat:'road',rw:9,sw:1.6,col:'#222222',fill:'#ffffff'},
 pnch:{n:'Local',t:'Local / panchayat road',cat:'road',rw:7,sw:1.5,col:'#222222',fill:'#ffffff'},
 mud:{n:'Dirt',t:'Dirt road (dashed edges)',cat:'road',rw:6,sw:1.5,col:'#222222',fill:'#ffffff',dash:'dash'},
 stream:{n:'Stream',t:'Stream / canal',cat:'road',rw:9,sw:1.6,col:'#1769c2',fill:'#cfe6fb'},
 custom:{n:'Road',t:'Road: choose NH / SH / PWD / Panchayat or any width',cat:'road',rw:12,sw:1.6,col:'#222222',fill:'#ffffff'},
 foot:{n:'Path',t:'Footpath (dotted)',cat:'line',col:'#1b1f24',sw:2.4,dash:'dot'},
 rail:{n:'Rail',t:'Railway track (double line with cross ties)',cat:'line',rw:8,col:'#222222',sw:1.8},
 elec:{n:'Power',t:'Electric line',cat:'line',col:'#c62828',sw:1.8,dash:'dd'},
 plot:{n:'Plot',t:'Plot boundary (red)',cat:'line',col:'#d32f2f',sw:2.2}
};
/* Road types offered in the road tool. NH/SH/PWD/PNCH are no longer separate tools, only widths of the one road tool
   (old drawings that used those kinds still draw correctly). */
const ROAD_PRESETS={nh:{n:'NH',rw:16},sh:{n:'SH',rw:12},pwd:{n:'PWD',rw:9},pnch:{n:'Panchayat',rw:7}};
const ROAD_KINDS=['custom','nh','sh','pwd','pnch'];
const BASE={
 rect:{stroke:'#1b1f24',sw:2,dash:'',fill:null},
 ellipse:{stroke:'#1b1f24',sw:2,dash:'',fill:null},
 plotbox:{stroke:'#d32f2f',sw:2.2,dash:'',fill:null},
 text:{stroke:'#1b1f24',font:"'Noto Sans Malayalam',sans-serif",fs:20,bold:false,italic:false,ul:false,align:'left'},
 sym:{stroke:'#1b1f24'}
};
const DS={data:null,cb:null,sel:[],tool:'select',view:{x:0,y:0,z:1},undo:[],redo:[],dirty:false,over:{},snap:true,grid:false,
 symId:null,symAuto:false,draw:null,drag:null,ptrs:new Map(),nodeMode:false,edit:null,clip:null,snapPt:null,space:false,
 lastTap:null,pinch:null,lastKey:'',lastKeyT:0,symOpen:false};

function mkPath(kind,pts,ov){
  const k=K[kind];
  const o={id:uid(),type:'path',kind,pts,closed:!!k.closed,stroke:k.col,sw:k.sw,dash:k.dash||'',fill:k.cat==='road'?k.fill:null,rw:k.rw||0,center:false,r:0};
  Object.assign(o,ov||DS.over[kind]||{});
  return o;
}
function tmpl(tool){
  if(K[tool]) return mkPath(tool,[]);
  return Object.assign({},BASE[tool]||{},DS.over[tool]||{});
}

/* ---- geometry ---- */
function rotPt(x,y,cx,cy,deg){const a=deg*Math.PI/180,c=Math.cos(a),s=Math.sin(a),dx=x-cx,dy=y-cy;return [cx+dx*c-dy*s,cy+dx*s+dy*c];}
const isBox=o=>o.type!=='path';
function corners(o){const cx=o.x+o.w/2,cy=o.y+o.h/2;return [[o.x,o.y],[o.x+o.w,o.y],[o.x+o.w,o.y+o.h],[o.x,o.y+o.h]].map(p=>rotPt(p[0],p[1],cx,cy,o.rot||0));}
function bboxOf(o){
  const pts=o.type==='path'?o.pts:corners(o);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  pts.forEach(p=>{x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);});
  if(o.type==='path'){const pad=K[o.kind].cat==='road'?o.rw/2+o.sw:(o.kind==='rail'?(o.rw||8)/2+o.sw+2.5:(o.sw||1)/2);x0-=pad;y0-=pad;x1+=pad;y1+=pad;}
  return {x0,y0,x1,y1};
}
function unionBox(os){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  os.forEach(o=>{const b=bboxOf(o);x0=Math.min(x0,b.x0);y0=Math.min(y0,b.y0);x1=Math.max(x1,b.x1);y1=Math.max(y1,b.y1);});
  return {x0,y0,x1,y1};
}
function elbowPts(a,b){
  if(Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])){const mx=(a[0]+b[0])/2;return [a,[mx,a[1]],[mx,b[1]],b];}
  const my=(a[1]+b[1])/2;return [a,[a[0],my],[b[0],my],b];
}
const pf=p=>f2(p[0])+' '+f2(p[1]);
function roundedD(P,closed,r){
  const n=P.length;if(n<2)return '';
  if(!(r>0)||(n<3&&!closed)) return 'M'+P.map(pf).join('L')+(closed?'Z':'');
  const idx=i=>(i+n)%n;
  const corner=i=>{
    const a=P[idx(i-1)],b=P[i],c=P[idx(i+1)];
    const l1=Math.hypot(a[0]-b[0],a[1]-b[1]),l2=Math.hypot(c[0]-b[0],c[1]-b[1]);
    const t=Math.min(r,l1/2,l2/2);
    if(t<0.01||l1<0.01||l2<0.01) return {p1:b,p2:b,b};
    return {p1:[b[0]+(a[0]-b[0])*t/l1,b[1]+(a[1]-b[1])*t/l1],p2:[b[0]+(c[0]-b[0])*t/l2,b[1]+(c[1]-b[1])*t/l2],b};
  };
  let d='';
  if(!closed){
    d='M'+pf(P[0]);
    for(let i=1;i<n-1;i++){const c=corner(i);d+='L'+pf(c.p1)+'Q'+pf(c.b)+' '+pf(c.p2);}
    d+='L'+pf(P[n-1]);
  }else{
    const cs=P.map((_,i)=>corner(i));
    d='M'+pf(cs[0].p2);
    for(let i=1;i<n;i++){d+='L'+pf(cs[i].p1)+'Q'+pf(cs[i].b)+' '+pf(cs[i].p2);}
    d+='L'+pf(cs[0].p1)+'Q'+pf(cs[0].b)+' '+pf(cs[0].p2)+'Z';
  }
  return d;
}
function smoothD(P){
  const n=P.length;let d='M'+pf(P[0]);
  if(n===2) return d+'L'+pf(P[1]);
  for(let i=0;i<n-1;i++){
    const p0=P[i-1]||P[i],p1=P[i],p2=P[i+1],p3=P[i+2]||p2;
    d+='C'+f2(p1[0]+(p2[0]-p0[0])/6)+' '+f2(p1[1]+(p2[1]-p0[1])/6)+' '+f2(p2[0]-(p3[0]-p1[0])/6)+' '+f2(p2[1]-(p3[1]-p1[1])/6)+' '+pf(p2);
  }
  return d;
}
function pathD(o){
  const P=o.pts;if(!P||P.length<2)return '';
  switch(o.kind){
    case 'elbow': return roundedD(elbowPts(P[0],P[P.length-1]),false,o.r||0);
    case 'cconn':{
      const a=P[0],b=P[P.length-1];
      if(Math.abs(b[0]-a[0])>=Math.abs(b[1]-a[1])){const mx=(a[0]+b[0])/2;return 'M'+pf(a)+'C'+f2(mx)+' '+f2(a[1])+' '+f2(mx)+' '+f2(b[1])+' '+pf(b);}
      const my=(a[1]+b[1])/2;return 'M'+pf(a)+'C'+f2(a[0])+' '+f2(my)+' '+f2(b[0])+' '+f2(my)+' '+pf(b);
    }
    case 'curve':case 'scribble': return smoothD(P);
    default: return roundedD(P,o.closed,o.r||0);
  }
}
function dashAttr(o){
  const w=o.sw||2;
  if(o.dash==='dash')return ' stroke-dasharray="'+f2(w*5)+' '+f2(w*3)+'"';
  if(o.dash==='dot')return ' stroke-dasharray="0.1 '+f2(w*2.6)+'"';
  if(o.dash==='dd')return ' stroke-dasharray="'+f2(w*6)+' '+f2(w*2.5)+' '+f2(w)+' '+f2(w*2.5)+'"';
  return '';
}
function hitPath(o,d){
  const fillable=(o.closed)&&o.fill;
  return '<path data-id="'+o.id+'" d="'+d+'" fill="'+(fillable?'transparent':'none')+'" stroke="transparent" stroke-width="16" vector-effect="non-scaling-stroke" pointer-events="'+(fillable?'all':'stroke')+'"/>';
}
function drawLine(o,d,studio){
  const w=o.sw,col=o.stroke;
  const fill=o.closed&&o.fill?o.fill:'none';
  let s='';
  if(o.kind==='rail'){
    /* two parallel rails + cross ties: outer stroke, white inner stroke (leaves two lines), then short ties across both */
    const g=o.rw||8;
    s='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+f2(g+w)+'" stroke-linejoin="round"/>'+
      '<path d="'+d+'" fill="none" stroke="#fff" stroke-width="'+f2(Math.max(0.5,g-w))+'" stroke-linejoin="round"/>'+
      '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+f2(g+w+4)+'" stroke-dasharray="'+f2(Math.max(1,w*0.9))+' '+f2(Math.max(5,w*4))+'" stroke-linejoin="round"/>';
  }else{
    s='<path d="'+d+'" fill="'+fill+'" stroke="'+col+'" stroke-width="'+w+'" stroke-linejoin="round" stroke-linecap="round"'+dashAttr(o)+'/>';
  }
  if(o.kind==='arrow'){
    const P=o.pts,a=P[P.length-2],b=P[P.length-1],ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
    const L=Math.max(10,w*5),W=L*0.5,cs=Math.cos(ang),sn=Math.sin(ang);
    const bx=b[0]-L*cs,by=b[1]-L*sn;
    s+='<polygon points="'+f2(b[0])+','+f2(b[1])+' '+f2(bx-W*sn)+','+f2(by+W*cs)+' '+f2(bx+W*sn)+','+f2(by-W*cs)+'" fill="'+col+'"/>';
  }
  return s+(studio?hitPath(o,d):'');
}
function lbl(o,cx,y0,studio){
  const fs=o.fs||13,L=String(o.label).split('\n');
  let s='<text font-family="'+FONT+'" font-size="'+fs+'" font-weight="600" fill="#111" text-anchor="middle" style="white-space:pre">'+
   L.map((l,i)=>'<tspan x="'+f2(cx)+'" y="'+f2(y0+fs*1.1+i*fs*1.25)+'">'+(esc(l)||' ')+'</tspan>').join('')+'</text>';
  if(studio){const lw=Math.max(...L.map(l=>l.length))*fs*0.62+8;s+='<rect x="'+f2(cx-lw/2)+'" y="'+f2(y0)+'" width="'+f2(lw)+'" height="'+f2(L.length*fs*1.25+4)+'" fill="transparent"/>';}
  return s;
}
/* Online symbols come from a third party (or from a file someone sent you), so their SVG is
   cleaned before it is drawn: scripts, event handlers and external links are removed. */
const _safeCache = new Map();
function safeSvg(str) {
  if (_safeCache.has(str)) return _safeCache.get(str);
  let out = '';
  try {
    const doc = new DOMParser().parseFromString(str, 'image/svg+xml');
    const root = doc.documentElement;
    if (root && root.nodeName.toLowerCase() === 'svg' && !doc.querySelector('parsererror')) {
      root.querySelectorAll('script,foreignObject,iframe,object,embed,image,use,a,animate,set,animateTransform,animateMotion').forEach(n => n.remove());
      [root, ...root.querySelectorAll('*')].forEach(n => {
        [...n.attributes].forEach(a => {
          const nm = a.name.toLowerCase(), v = a.value;
          if (nm.indexOf('on') === 0 || nm === 'href' || nm === 'xlink:href' || /javascript:|url\(\s*['"]?https?:|data:text\/html/i.test(v)) n.removeAttribute(a.name);
        });
      });
      root.setAttribute('width', '100'); root.setAttribute('height', '100');
      root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      out = new XMLSerializer().serializeToString(root);
    }
  } catch (_) { out = ''; }
  _safeCache.set(str, out);
  return out;
}
function drawShape(o,studio,data){
  const hid=studio?' data-id="'+o.id+'"':'';
  const cx=o.x+o.w/2,cy=o.y+o.h/2;
  const tr='rotate('+f2(o.rot||0)+' '+f2(cx)+' '+f2(cy)+')';
  switch(o.type){
    case 'rect':{
      let s='<rect x="'+f2(o.x)+'" y="'+f2(o.y)+'" width="'+f2(o.w)+'" height="'+f2(o.h)+'" transform="'+tr+'" fill="'+(o.fill||'none')+'" stroke="'+o.stroke+'" stroke-width="'+o.sw+'" stroke-linejoin="round" stroke-linecap="round"'+dashAttr(o)+'/>';
      if(studio) s+='<rect data-id="'+o.id+'" x="'+f2(o.x)+'" y="'+f2(o.y)+'" width="'+f2(o.w)+'" height="'+f2(o.h)+'" transform="'+tr+'" fill="'+(o.fill?'transparent':'none')+'" stroke="transparent" stroke-width="14" vector-effect="non-scaling-stroke" pointer-events="'+(o.fill?'all':'stroke')+'"/>';
      return s;
    }
    case 'ellipse':{
      let s='<ellipse cx="'+f2(cx)+'" cy="'+f2(cy)+'" rx="'+f2(o.w/2)+'" ry="'+f2(o.h/2)+'" transform="'+tr+'" fill="'+(o.fill||'none')+'" stroke="'+o.stroke+'" stroke-width="'+o.sw+'" stroke-linecap="round"'+dashAttr(o)+'/>';
      if(studio) s+='<ellipse data-id="'+o.id+'" cx="'+f2(cx)+'" cy="'+f2(cy)+'" rx="'+f2(o.w/2)+'" ry="'+f2(o.h/2)+'" transform="'+tr+'" fill="'+(o.fill?'transparent':'none')+'" stroke="transparent" stroke-width="14" vector-effect="non-scaling-stroke" pointer-events="'+(o.fill?'all':'stroke')+'"/>';
      return s;
    }
    case 'text':{
      const lines=String(o.text||'').split('\n'),lh=o.fs*1.3;
      const ax=o.align==='center'?o.x+o.w/2:o.align==='right'?o.x+o.w:o.x;
      const an=o.align==='center'?'middle':o.align==='right'?'end':'start';
      let s='<g'+hid+' transform="'+tr+'">';
      if(studio) s+='<rect x="'+f2(o.x)+'" y="'+f2(o.y)+'" width="'+f2(o.w)+'" height="'+f2(o.h)+'" fill="transparent"/>';
      s+='<text font-family="'+(o.font||FONT)+'" font-size="'+o.fs+'" font-weight="'+(o.bold?700:400)+'" font-style="'+(o.italic?'italic':'normal')+'" fill="'+o.stroke+'" text-anchor="'+an+'"'+(o.ul?' text-decoration="underline"':'')+' style="white-space:pre">'+
        lines.map((l,i)=>'<tspan x="'+f2(ax)+'" y="'+f2(o.y+o.fs*1.02+i*lh)+'">'+(esc(l)||' ')+'</tspan>').join('')+'</text></g>';
      return s;
    }
    case 'sym':{
      const S=SYMMAP[o.sym]||(o.osvg?{s:safeSvg(o.osvg)}:null);if(!S)return '';
      let s='<g'+hid+' transform="'+tr+'">';
      if(studio) s+='<rect x="'+f2(o.x)+'" y="'+f2(o.y)+'" width="'+f2(o.w)+'" height="'+f2(o.h)+'" fill="transparent"/>';
      s+='<g transform="translate('+f2(o.x)+' '+f2(o.y)+') scale('+f2(o.w/100)+' '+f2(o.h/100)+')">'+S.s.replace(/\{c\}/g,o.stroke||'#1b1f24')+'</g>';
      if(o.label) s+=lbl(o,cx,o.y+o.h,studio);
      return s+'</g>';
    }
    case 'img':{
      const href=(data&&data.imgs&&data.imgs[o.src])||'';
      return '<image'+hid+' href="'+href+'" xlink:href="'+href+'" x="'+f2(o.x)+'" y="'+f2(o.y)+'" width="'+f2(o.w)+'" height="'+f2(o.h)+'" preserveAspectRatio="none" opacity="'+(o.op||1)+'" transform="'+tr+'"/>';
    }
    case 'qr':{
      const n=o.m.length;let d='';
      for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(o.m[r][c]==='1')d+='M'+c+' '+r+'h1v1h-1z';
      return '<g'+hid+' transform="'+tr+'"><g transform="translate('+f2(o.x)+' '+f2(o.y)+') scale('+f2(o.w/n)+' '+f2(o.h/n)+')"><rect width="'+n+'" height="'+n+'" fill="#fff"/><path d="'+d+'" fill="#000" shape-rendering="crispEdges"/></g></g>';
    }
  }
  return '';
}
function renderObjs(data,studio){
  const below=[],rc=[],rf=[],rm=[],rh=[],above=[];
  for(const o of data.objs){
    if(o.type==='path'){
      const k=K[o.kind]||K.line,d=pathD(o);
      if(!d) continue;
      if(k.cat==='road'){
        const hid=studio?' data-id="'+o.id+'"':'';
        rc.push('<path'+hid+' d="'+d+'" fill="none" stroke="'+o.stroke+'" stroke-width="'+f2(o.rw+2*o.sw)+'" stroke-linejoin="round"'+dashAttr(o)+'/>');
        rf.push('<path'+hid+' d="'+d+'" fill="none" stroke="'+(o.fill||'#fff')+'" stroke-width="'+f2(o.rw)+'" stroke-linejoin="round"/>');
        if(o.center) rm.push('<path d="'+d+'" fill="none" stroke="'+o.stroke+'" stroke-width="'+f2(Math.max(1,o.sw*0.8))+'" stroke-dasharray="8 6"/>');
        if(studio) rh.push(hitPath(o,d));
      }else (o.lvl==='below'?below:above).push(drawLine(o,d,studio));
    }else (o.lvl==='below'?below:above).push(drawShape(o,studio,data));
  }
  return below.join('')+rc.join('')+rf.join('')+rm.join('')+rh.join('')+above.join('');
}
function buildSVG(d,o){
  o=o||{};
  const ns='xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';
  const head=o.px?'<svg '+ns+' width="'+d.w+'" height="'+d.h+'" viewBox="0 0 '+d.w+' '+d.h+'">'
    :'<svg '+ns+' viewBox="0 0 '+d.w+' '+d.h+'" style="width:'+(o.pct||100)+'%;max-width:100%;height:auto">';
  let body='<rect width="'+d.w+'" height="'+d.h+'" fill="'+(d.bg||'#fff')+'"/>'+(typeof tplSVG==='function'?tplSVG(d):'')+renderObjs(d,false);
  if(d.frame!==false) body+='<rect x="0.75" y="0.75" width="'+(d.w-1.5)+'" height="'+(d.h-1.5)+'" fill="none" stroke="#333" stroke-width="1.5"/>';
  let s=head+body+'</svg>';
  if(o.px) s=s.replace(/font-family="([^"]*)"/g,(m,f)=>'font-family="'+f+",'Nirmala UI','Kartika','Noto Sans Malayalam',sans-serif"+'"');
  return s;
}
function svgToPng(svg,w,h,scale){
  return new Promise((res,rej)=>{
    const im=new Image();
    im.onload=()=>{const c=document.createElement('canvas');c.width=Math.round(w*scale);c.height=Math.round(h*scale);const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);res(c.toDataURL('image/png'));};
    im.onerror=()=>rej(new Error('svg'));
    im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  });
}
function newData(w,h){return {v:1,w,h,bg:'#ffffff',frame:true,tpl:null,objs:[],imgs:{}};}
function fitText(o){
  const t=$('#sMT');
  t.setAttribute('font-family',o.font||FONT);t.setAttribute('font-size',o.fs);
  t.setAttribute('font-weight',o.bold?700:400);t.setAttribute('font-style',o.italic?'italic':'normal');
  const L=String(o.text||'').split('\n');let w=0;
  for(const l of L){t.textContent=l||' ';let x;try{x=t.getComputedTextLength();}catch(_){x=0;}if(!x)x=l.length*o.fs*0.6;w=Math.max(w,x);}
  o.w=Math.max(8,w+2);o.h=L.length*o.fs*1.3+2;
}


/* ---- download helpers ---- */
function dlUrl(name,url){const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500);}
function dlBlob(name,mime,content){const u=URL.createObjectURL(new Blob([content],{type:mime}));dlUrl(name,u);setTimeout(()=>URL.revokeObjectURL(u),1500);}
