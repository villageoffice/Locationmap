'use strict';
/* =====================================================================
   STUDIO
   ===================================================================== */
const svg=$('#sSvg');
DS.symCat='all';DS.symLang='en';DS.symMode='lib';DS.olSeq=0;DS.meta={};DS.orig=null;
const obj=id=>DS.data.objs.find(o=>o.id===id);
const selObjs=()=>DS.sel.map(obj).filter(Boolean);
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const studioOpen=()=>$('#studio').classList.contains('on');

const HINT={select:'Tap to select · drag for a box · handles resize / rotate · double-tap to edit',
 pan:'Drag to move the page · wheel or pinch to zoom',erase:'Tap or drag over items to erase',text:'Tap where the text should go',
 sym:'Pick a symbol, then tap the page to place it (drag to set the size)',
 draw:'Drag to draw · tap for each bend · double-tap / Enter / tick to finish',box:'Drag to set the size'};
function hint(s){$('#sHint').textContent=s||'';}
function toolHint(){const t=DS.tool;hint(HINT[t]||(K[t]?HINT.draw:HINT.box));}

/* ---- history ---- */
function snapStr(){const d=DS.data;return JSON.stringify({w:d.w,h:d.h,bg:d.bg,frame:d.frame,objs:d.objs});}
function pushH(key){
  const now=Date.now();
  if(key&&DS.lastKey===key&&now-DS.lastKeyT<1000){DS.lastKeyT=now;DS.dirty=true;return;}
  DS.lastKey=key||'';DS.lastKeyT=now;
  DS.undo.push(snapStr());if(DS.undo.length>100)DS.undo.shift();
  DS.redo=[];DS.dirty=true;updUR();
}
function restoreSnap(s){
  Object.assign(DS.data,JSON.parse(s));
  DS.sel=DS.sel.filter(id=>obj(id));DS.nodeMode=false;
  applyPage();renderStudio();syncCtx();updUR();
}
function undo(){if(!DS.undo.length)return;DS.redo.push(snapStr());restoreSnap(DS.undo.pop());DS.lastKey='';}
function redo(){if(!DS.redo.length)return;DS.undo.push(snapStr());restoreSnap(DS.redo.pop());DS.lastKey='';}
function updUR(){$('#sUndo').disabled=!DS.undo.length;$('#sRedo').disabled=!DS.redo.length;}

/* ---- view ---- */
function applyView(){
  $('#vw').setAttribute('transform','translate('+f2(DS.view.x)+' '+f2(DS.view.y)+') scale('+DS.view.z+')');
  $('#sZoomLbl').textContent=Math.round(DS.view.z*100)+'%';
  renderOverlay();
}
function fitView(){
  const r=svg.getBoundingClientRect(),d=DS.data;
  if(!r.width||!d)return;
  const z=Math.max(.05,Math.min((r.width-30)/d.w,(r.height-30)/d.h,3));
  DS.view={z,x:(r.width-d.w*z)/2,y:(r.height-d.h*z)/2};
  applyView();
}
function zoomAt(cx,cy,fac){
  const r=svg.getBoundingClientRect(),v=DS.view;
  const z=Math.max(.05,Math.min(10,v.z*fac));
  const wx=(cx-r.left-v.x)/v.z,wy=(cy-r.top-v.y)/v.z;
  DS.view={z,x:cx-r.left-wx*z,y:cy-r.top-wy*z};applyView();
}
function applyPage(){
  const d=DS.data;
  [['#pgRect'],['#pgGrid'],['#pgBorder']].forEach(a=>{const e=$(a[0]);e.setAttribute('width',d.w);e.setAttribute('height',d.h);});
  const sh=$('#pgShadow');sh.setAttribute('width',d.w);sh.setAttribute('height',d.h);sh.setAttribute('x',4);sh.setAttribute('y',4);
  $('#pgRect').setAttribute('fill',d.bg||'#fff');
  $('#pgBorder').style.display=d.frame===false?'none':'';
  $('#pgGrid').style.display=DS.grid?'':'none';
}
function pt(e){const r=svg.getBoundingClientRect();return [(e.clientX-r.left-DS.view.x)/DS.view.z,(e.clientY-r.top-DS.view.y)/DS.view.z];}

/* ---- render ---- */
function renderStudio(){
  if(DS.dirty&&typeof Draft!=='undefined')Draft.touch();
  $('#gObj').innerHTML=renderObjs(DS.data,true);
  renderOverlay();
}
function outlineHTML(o,z){
  const st='fill="none" stroke="#1a73e8" stroke-width="'+f2(1/z)+'" stroke-dasharray="'+f2(4/z)+' '+f2(3/z)+'"';
  if(isBox(o)) return '<polygon points="'+corners(o).map(p=>f2(p[0])+','+f2(p[1])).join(' ')+'" '+st+'/>';
  const b=bboxOf(o);return '<rect x="'+f2(b.x0)+'" y="'+f2(b.y0)+'" width="'+f2(b.x1-b.x0)+'" height="'+f2(b.y1-b.y0)+'" '+st+'/>';
}
function selFrame(){
  const os=selObjs();if(!os.length)return null;
  if(os.length===1&&isBox(os[0])){const o=os[0];return {cx:o.x+o.w/2,cy:o.y+o.h/2,w:o.w,h:o.h,rot:o.rot||0};}
  const b=unionBox(os);let w=b.x1-b.x0,h=b.y1-b.y0;
  return {cx:(b.x0+b.x1)/2,cy:(b.y0+b.y1)/2,w:Math.max(12,w),h:Math.max(12,h),rot:0};
}
function handlesHTML(F,z){
  const hs=(COARSE?18:10)/z,sw=f2(1.5/z);
  const P=(lx,ly)=>rotPt(F.cx+lx,F.cy+ly,F.cx,F.cy,F.rot);
  const hw=F.w/2,hh=F.h/2;
  let s='<polygon points="'+[P(-hw,-hh),P(hw,-hh),P(hw,hh),P(-hw,hh)].map(p=>f2(p[0])+','+f2(p[1])).join(' ')+'" fill="none" stroke="#1a73e8" stroke-width="'+sw+'"/>';
  [['nw',-hw,-hh,'nwse'],['n',0,-hh,'ns'],['ne',hw,-hh,'nesw'],['e',hw,0,'ew'],['se',hw,hh,'nwse'],['s',0,hh,'ns'],['sw',-hw,hh,'nesw'],['w',-hw,0,'ew']].forEach(a=>{
    const p=P(a[1],a[2]);
    s+='<rect data-h="'+a[0]+'" x="'+f2(p[0]-hs/2)+'" y="'+f2(p[1]-hs/2)+'" width="'+f2(hs)+'" height="'+f2(hs)+'" fill="#fff" stroke="#1a73e8" stroke-width="'+sw+'" pointer-events="all" style="cursor:'+a[3]+'-resize"/>';
  });
  const rp=P(0,-hh-32/z),tp=P(0,-hh);
  s+='<line x1="'+f2(tp[0])+'" y1="'+f2(tp[1])+'" x2="'+f2(rp[0])+'" y2="'+f2(rp[1])+'" stroke="#1a73e8" stroke-width="'+sw+'"/>';
  s+='<circle data-h="rot" cx="'+f2(rp[0])+'" cy="'+f2(rp[1])+'" r="'+f2(hs*0.65)+'" fill="#1a73e8" stroke="#fff" stroke-width="'+sw+'" pointer-events="all" style="cursor:grab"/>';
  return s;
}
function renderOverlay(){
  if(!DS.data)return;
  const z=DS.view.z,os=selObjs();let s='';
  os.forEach(o=>{s+=outlineHTML(o,z);});
  if(DS.tool==='select'&&os.length){
    if(DS.nodeMode&&os.length===1&&os[0].type==='path'){
      os[0].pts.forEach((p,i)=>{s+='<circle data-n="'+i+'" cx="'+f2(p[0])+'" cy="'+f2(p[1])+'" r="'+f2((COARSE?10:6)/z)+'" fill="#fff" stroke="#1a73e8" stroke-width="'+f2(2/z)+'" pointer-events="all" style="cursor:move"/>';});
    }else{const F=selFrame();if(F)s+=handlesHTML(F,z);}
  }
  const d=DS.draw;
  if(d){
    const pts=d.free?d.pts:(d.cur?d.pts.concat([d.cur]):d.pts);
    if(pts.length>=2){const tmp=mkPath(d.kind,pts.map(p=>p.slice()));tmp.closed=false;s+='<g opacity=".85">'+renderObjs({objs:[tmp]},false)+'</g>';}
    d.pts.forEach(p=>{s+='<circle cx="'+f2(p[0])+'" cy="'+f2(p[1])+'" r="'+f2(4/z)+'" fill="#fff" stroke="#1a73e8" stroke-width="'+f2(1.5/z)+'"/>';});
  }
  const D=DS.drag;
  if(D&&D.type==='marquee'){
    const x=Math.min(D.p0[0],D.p1[0]),y=Math.min(D.p0[1],D.p1[1]),w=Math.abs(D.p0[0]-D.p1[0]),h=Math.abs(D.p0[1]-D.p1[1]);
    s+='<rect x="'+f2(x)+'" y="'+f2(y)+'" width="'+f2(w)+'" height="'+f2(h)+'" fill="rgba(26,115,232,.12)" stroke="#1a73e8" stroke-width="'+f2(1/z)+'"/>';
  }
  if(D&&D.type==='box'){
    const x=Math.min(D.p0[0],D.p1[0]),y=Math.min(D.p0[1],D.p1[1]),w=Math.abs(D.p0[0]-D.p1[0]),h=Math.abs(D.p0[1]-D.p1[1]);
    const st='fill="rgba(26,115,232,.08)" stroke="#1a73e8" stroke-width="'+f2(1.5/z)+'" stroke-dasharray="'+f2(5/z)+' '+f2(3/z)+'"';
    s+=D.tool==='ellipse'?'<ellipse cx="'+f2(x+w/2)+'" cy="'+f2(y+h/2)+'" rx="'+f2(w/2)+'" ry="'+f2(h/2)+'" '+st+'/>':'<rect x="'+f2(x)+'" y="'+f2(y)+'" width="'+f2(w)+'" height="'+f2(h)+'" '+st+'/>';
  }
  if(DS.snapPt) s+='<circle cx="'+f2(DS.snapPt[0])+'" cy="'+f2(DS.snapPt[1])+'" r="'+f2(7/z)+'" fill="none" stroke="#10b981" stroke-width="'+f2(2/z)+'"/>';
  $('#gOver').innerHTML=s;
}

/* ---- selection ---- */
function setSel(ids){
  const set=new Set(ids);
  DS.data.objs.forEach(o=>{if(o.gid&&ids.some(i=>{const x=obj(i);return x&&x.gid===o.gid;}))set.add(o.id);});
  DS.sel=[...set];
  DS.nodeMode=DS.nodeMode&&DS.sel.length===1&&obj(DS.sel[0])&&obj(DS.sel[0]).type==='path';
  renderOverlay();syncCtx();
}
function toggleSel(o){
  const ids=DS.sel.slice();
  const grp=o.gid?DS.data.objs.filter(x=>x.gid===o.gid).map(x=>x.id):[o.id];
  if(ids.includes(o.id)) setSel(ids.filter(i=>!grp.includes(i)));
  else setSel(ids.concat(grp));
}

/* ---- transforms ---- */
const Tmove=(dx,dy)=>({mp:p=>[p[0]+dx,p[1]+dy],sx:1,sy:1,dr:0});
const Trot=(cx,cy,deg)=>({mp:p=>rotPt(p[0],p[1],cx,cy,deg),sx:1,sy:1,dr:deg});
function Tframe(F0,F1){
  const sx=F0.w>1e-6?F1.w/F0.w:1,sy=F0.h>1e-6?F1.h/F0.h:1,r=F0.rot;
  return {mp:p=>{const l=rotPt(p[0],p[1],F0.cx,F0.cy,-r);return rotPt(F1.cx+(l[0]-F0.cx)*sx,F1.cy+(l[1]-F0.cy)*sy,F1.cx,F1.cy,r);},sx,sy,dr:0};
}
function xformInto(s,o,T){
  if(s.type==='path'){o.pts=s.pts.map(p=>T.mp(p));return;}
  const c=T.mp([s.x+s.w/2,s.y+s.h/2]);
  o.w=Math.max(2,s.w*T.sx);o.h=Math.max(2,s.h*T.sy);
  o.rot=(((s.rot||0)+T.dr)%360+360)%360;
  if(s.type==='text'&&(Math.abs(T.sx-1)>1e-6||Math.abs(T.sy-1)>1e-6)){o.fs=Math.max(4,s.fs*Math.sqrt(T.sx*T.sy));fitText(o);}
  o.x=c[0]-o.w/2;o.y=c[1]-o.h/2;
}
function applySnaps(snaps,T){snaps.forEach(s=>{const o=obj(s.id);if(o)xformInto(s,o,T);});}
function resizeFrame(F0,h,pw,shift){
  const r=F0.rot,q=rotPt(pw[0],pw[1],F0.cx,F0.cy,-r),lx=q[0]-F0.cx,ly=q[1]-F0.cy;
  const hx=h.includes('e')?1:h.includes('w')?-1:0,hy=h.includes('s')?1:h.includes('n')?-1:0;
  let w=F0.w,hh=F0.h,ox=0,oy=0;
  if(hx){const ax=-hx*F0.w/2;w=Math.max(4,(lx-ax)*hx);ox=ax+hx*w/2;}
  if(hy){const ay=-hy*F0.h/2;hh=Math.max(4,(ly-ay)*hy);oy=ay+hy*hh/2;}
  if(shift&&hx&&hy){const s=Math.max(w/F0.w,hh/F0.h);w=F0.w*s;hh=F0.h*s;ox=-hx*F0.w/2+hx*w/2;oy=-hy*F0.h/2+hy*hh/2;}
  const c=rotPt(F0.cx+ox,F0.cy+oy,F0.cx,F0.cy,r);
  return {cx:c[0],cy:c[1],w,h:hh,rot:r};
}
function moveRaw(o,dx,dy){if(o.type==='path')o.pts=o.pts.map(p=>[p[0]+dx,p[1]+dy]);else{o.x+=dx;o.y+=dy;}}

/* ---- snapping ---- */
function vertsOf(o){if(o.type==='path')return o.pts;const c=corners(o);c.push([o.x+o.w/2,o.y+o.h/2]);return c;}
function snapPoint(p,e,exId){
  DS.snapPt=null;
  if(e&&(e.altKey||e.ctrlKey))return p;
  if(DS.snap){
    let best=null,bd=12/DS.view.z;
    DS.data.objs.forEach(o=>{if(o.id===exId)return;vertsOf(o).forEach(v=>{const d=dist(v,p);if(d<bd){bd=d;best=v;}});});
    if(best){DS.snapPt=best;return [best[0],best[1]];}
    if(DS.grid)return [Math.round(p[0]/20)*20,Math.round(p[1]/20)*20];
  }
  return p;
}
function axisLock(a,b){
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),ang=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*(Math.PI/4);
  return [a[0]+L*Math.cos(ang),a[1]+L*Math.sin(ang)];
}

/* ---- pointer handling ---- */
function onDown(e){
  if(!DS.data)return;
  try{svg.setPointerCapture(e.pointerId);}catch(_){}
  DS.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(DS.ptrs.size===2){cancelDrag();startPinch();return;}
  if(DS.ptrs.size>2)return;
  if(DS.edit)commitEdit();
  const p=pt(e),t=DS.tool;
  if(e.button===1||DS.space||t==='pan'){DS.drag={type:'pan',sx:e.clientX,sy:e.clientY,vx:DS.view.x,vy:DS.view.y};return;}
  if(e.button===2)return;
  if(t==='select')return downSelect(e,p);
  if(t==='erase'){DS.drag={type:'erase',pushed:false};eraseAt(e);return;}
  if(t==='text'){DS.drag={type:'textplace',p0:p,sx:e.clientX,sy:e.clientY};return;}
  if(t==='sym'){if(!DS.symId){toast('Pick a symbol first');return;}DS.drag={type:'box',tool:'sym',p0:p,p1:p,sx:e.clientX,sy:e.clientY};return;}
  if(t==='rect'||t==='ellipse'||t==='plotbox'){if(DS.sel.length)setSel([]);DS.drag={type:'box',tool:t,p0:p,p1:p,sx:e.clientX,sy:e.clientY};return;}
  if(K[t])return downDraw(e,p);
}
function downSelect(e,p){
  const tg=e.target;
  const hEl=tg.closest&&tg.closest('[data-h]');
  if(hEl){
    const F=selFrame();if(!F)return;
    const snaps=selObjs().map(clone),h=hEl.dataset.h;
    if(h==='rot')DS.drag={type:'rot',F,snaps,a0:Math.atan2(p[1]-F.cy,p[0]-F.cx),pushed:false,single:snaps.length===1&&isBox(snaps[0])};
    else DS.drag={type:'resize',h,F,snaps,pushed:false};
    return;
  }
  const nEl=tg.closest&&tg.closest('[data-n]');
  if(nEl&&DS.nodeMode){const o=selObjs()[0];DS.drag={type:'node',i:+nEl.dataset.n,id:o.id,pushed:false,sx:e.clientX,sy:e.clientY};return;}
  const iEl=tg.closest&&tg.closest('[data-id]');
  const o=iEl?obj(iEl.dataset.id):null;
  const multi=e.shiftKey||e.ctrlKey||e.metaKey;
  if(o&&!o.locked){
    if(multi){toggleSel(o);DS.drag=null;return;}
    if(!DS.sel.includes(o.id))setSel([o.id]);
    DS.drag={type:'move',p0:p,snaps:selObjs().map(clone),pushed:false,sx:e.clientX,sy:e.clientY,tapId:o.id};
  }else{
    if(!multi&&DS.sel.length)setSel([]);
    DS.drag={type:'marquee',p0:p,p1:p,add:multi,base:DS.sel.slice()};
  }
  renderOverlay();
}
function downDraw(e,p){
  const k=K[DS.tool];
  if(DS.sel.length)setSel([]);
  if(k.cat==='free'){DS.draw={kind:DS.tool,pts:[p],free:true};DS.drag={type:'draw'};return;}
  const sp=snapPoint(p,e);
  if(!DS.draw){DS.draw={kind:DS.tool,pts:[sp],cur:sp,first:true,multi:false,sx:e.clientX,sy:e.clientY,dragged:false};}
  else{DS.draw.sx=e.clientX;DS.draw.sy=e.clientY;DS.draw.dragged=false;DS.draw.cur=sp;}
  DS.drag={type:'draw'};
  renderOverlay();
}
function onMove(e){
  if(!DS.data)return;
  if(DS.ptrs.has(e.pointerId))DS.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(DS.pinch&&DS.ptrs.size>=2){
    const a=[...DS.ptrs.values()],d=Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1;
    const m={x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},P=DS.pinch,r=svg.getBoundingClientRect();
    const z=Math.max(.05,Math.min(10,P.v0.z*d/P.d0));
    const wx=(P.m0.x-r.left-P.v0.x)/P.v0.z,wy=(P.m0.y-r.top-P.v0.y)/P.v0.z;
    DS.view={z,x:m.x-r.left-wx*z,y:m.y-r.top-wy*z};applyView();return;
  }
  const D=DS.drag,p=pt(e);
  if(!D){
    if(DS.draw&&!DS.draw.free&&DS.tool===DS.draw.kind){DS.draw.cur=snapPoint(p,e);renderOverlay();}
    return;
  }
  switch(D.type){
    case 'pan':DS.view.x=D.vx+e.clientX-D.sx;DS.view.y=D.vy+e.clientY-D.sy;applyView();break;
    case 'move':{
      if(!D.pushed&&Math.hypot(e.clientX-D.sx,e.clientY-D.sy)<4)return;
      if(!D.pushed){pushH();D.pushed=true;}
      let dx=p[0]-D.p0[0],dy=p[1]-D.p0[1];
      if(e.shiftKey){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0;}
      applySnaps(D.snaps,Tmove(dx,dy));renderStudio();break;}
    case 'marquee':D.p1=p;renderOverlay();break;
    case 'rot':{
      if(!D.pushed){pushH();D.pushed=true;}
      let da=(Math.atan2(p[1]-D.F.cy,p[0]-D.F.cx)-D.a0)*180/Math.PI;
      const base=D.single?(D.snaps[0].rot||0):0,tot=base+da,rr=Math.round(tot/15)*15;
      if(e.shiftKey||Math.abs(tot-rr)<3)da=rr-base;
      applySnaps(D.snaps,Trot(D.F.cx,D.F.cy,da));hint(Math.round(((base+da)%360+360)%360)+'°');renderStudio();break;}
    case 'resize':{
      if(!D.pushed){pushH();D.pushed=true;}
      const F1=resizeFrame(D.F,D.h,p,e.shiftKey);
      applySnaps(D.snaps,Tframe(D.F,F1));renderStudio();break;}
    case 'node':{
      if(!D.pushed&&Math.hypot(e.clientX-D.sx,e.clientY-D.sy)<4)return;
      if(!D.pushed){pushH();D.pushed=true;}
      const o=obj(D.id);if(o){o.pts[D.i]=snapPoint(p,e,D.id);renderStudio();}break;}
    case 'draw':{
      const d=DS.draw;if(!d)break;
      if(d.free){const l=d.pts[d.pts.length-1];if(dist(l,p)>2/DS.view.z)d.pts.push(p);}
      else{let sp=snapPoint(p,e);if(e.shiftKey&&d.pts.length)sp=axisLock(d.pts[d.pts.length-1],sp);d.cur=sp;if(Math.hypot(e.clientX-d.sx,e.clientY-d.sy)>6)d.dragged=true;}
      renderOverlay();break;}
    case 'box':D.p1=p;renderOverlay();break;
    case 'erase':eraseAt(e);break;
  }
}
function onUp(e){
  DS.ptrs.delete(e.pointerId);
  try{svg.releasePointerCapture(e.pointerId);}catch(_){}
  if(DS.pinch){if(DS.ptrs.size<2)DS.pinch=null;DS.drag=null;return;}
  const D=DS.drag;if(!D)return;
  const p=pt(e);
  switch(D.type){
    case 'move':if(!D.pushed)handleTap(e,D.tapId,p);break;
    case 'marquee':finishMarquee(D);break;
    case 'rot':case 'resize':toolHint();break;
    case 'node':if(!D.pushed)nodeTap(D,e);break;
    case 'draw':DS.drag=null;upDraw(e);return;
    case 'box':finishBox(D,e);break;
    case 'textplace':{
      if(Math.hypot(e.clientX-D.sx,e.clientY-D.sy)<8){
        const T=tmpl('text');
        const o={id:uid(),type:'text',x:D.p0[0],y:D.p0[1],w:40,h:T.fs*1.3,text:'',rot:0,font:T.font,fs:T.fs,bold:T.bold,italic:T.italic,ul:T.ul,align:T.align,stroke:T.stroke};
        DS.drag=null;openEdit(o,false,true);return;
      }break;}
  }
  DS.drag=null;renderOverlay();syncCtx();
}
function cancelDrag(){
  const D=DS.drag;
  if(D&&D.pushed&&D.snaps){applySnaps(D.snaps,Tmove(0,0));DS.undo.pop();updUR();renderStudio();}
  DS.drag=null;
}
function startPinch(){
  const a=[...DS.ptrs.values()];
  DS.pinch={d0:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1,m0:{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2},v0:Object.assign({},DS.view)};
}
function handleTap(e,id,p){
  const now=Date.now(),lt=DS.lastTap;
  DS.lastTap={t:now,id,x:e.clientX,y:e.clientY};
  if(!(lt&&lt.id===id&&now-lt.t<420&&Math.hypot(e.clientX-lt.x,e.clientY-lt.y)<24))return;
  DS.lastTap=null;
  const o=obj(id);if(!o)return;
  if(o.type==='text')openEdit(o,false);
  else if(o.type==='sym')openEdit(o,true);
  else if(o.type==='path'){if(!DS.nodeMode)DS.nodeMode=true;else insertNode(o,p);}
}
function nodeTap(D,e){
  const now=Date.now(),lt=DS.lastTap;
  DS.lastTap={t:now,id:D.id+':'+D.i,x:e.clientX,y:e.clientY};
  if(lt&&lt.id===D.id+':'+D.i&&now-lt.t<420){
    DS.lastTap=null;const o=obj(D.id);
    const min=(o.closed?3:2);
    if(o&&o.pts.length>min){pushH();o.pts.splice(D.i,1);renderStudio();}
  }
}
function insertNode(o,p){
  const P=o.pts,n=P.length;let best=-1,bd=1e9,bp=null;
  const segs=o.closed?n:n-1;
  for(let i=0;i<segs;i++){
    const a=P[i],b=P[(i+1)%n],dx=b[0]-a[0],dy=b[1]-a[1],L2=dx*dx+dy*dy||1;
    let t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2;t=Math.max(0,Math.min(1,t));
    const q=[a[0]+t*dx,a[1]+t*dy],d=dist(q,p);
    if(d<bd){bd=d;best=i;bp=q;}
  }
  if(best>=0){pushH();P.splice(best+1,0,[f2(bp[0]),f2(bp[1])]);renderStudio();}
}
function finishMarquee(D){
  const x0=Math.min(D.p0[0],D.p1[0]),x1=Math.max(D.p0[0],D.p1[0]),y0=Math.min(D.p0[1],D.p1[1]),y1=Math.max(D.p0[1],D.p1[1]);
  if(x1-x0<3&&y1-y0<3){return;}
  const ids=DS.data.objs.filter(o=>{if(o.locked)return false;const b=bboxOf(o);return b.x1>=x0&&b.x0<=x1&&b.y1>=y0&&b.y0<=y1;}).map(o=>o.id);
  setSel(D.add?D.base.concat(ids):ids);
}
function finishBox(D,e){
  const dragged=Math.hypot(e.clientX-D.sx,e.clientY-D.sy)>=8;
  let x=Math.min(D.p0[0],D.p1[0]),y=Math.min(D.p0[1],D.p1[1]),w=Math.abs(D.p0[0]-D.p1[0]),h=Math.abs(D.p0[1]-D.p1[1]);
  const t=D.tool;
  if(t==='sym'){
    if(!dragged){w=h=48;x=D.p0[0]-24;y=D.p0[1]-24;}else{w=h=Math.max(w,h);}
    const S=SYMMAP[DS.symId]||ONLINE[DS.symId],T=tmpl('sym');
    if(!S){toast('Pick a symbol first');return;}
    pushH();
    const o={id:uid(),type:'sym',sym:DS.symId,x,y,w,h,rot:0,stroke:T.stroke,label:DS.symAuto?symLabel(S):'',fs:13};
    if(S.online){o.osvg=S.s;o.oname=S.id;}
    DS.data.objs.push(o);setSel([o.id]);renderStudio();return;
  }
  if(!dragged){w=120;h=t==='plotbox'?120:80;x=D.p0[0]-w/2;y=D.p0[1]-h/2;}
  const T=tmpl(t);pushH();
  const o={id:uid(),type:t==='ellipse'?'ellipse':'rect',x,y,w,h,rot:0,stroke:T.stroke,sw:T.sw,dash:T.dash,fill:T.fill};
  DS.data.objs.push(o);setSel([o.id]);renderStudio();
}
function eraseAt(e){
  const el=document.elementFromPoint(e.clientX,e.clientY);
  const t=el&&el.closest&&el.closest('[data-id]');if(!t)return;
  const o=obj(t.dataset.id);if(!o||o.locked)return;
  if(!DS.drag.pushed){pushH();DS.drag.pushed=true;}
  DS.data.objs=DS.data.objs.filter(x=>x.id!==o.id);
  DS.sel=DS.sel.filter(i=>i!==o.id);renderStudio();
}
function upDraw(e){
  const d=DS.draw;if(!d)return;
  if(d.free){finishDraw();return;}
  const k=K[d.kind],cur=d.cur;
  if(d.first){
    d.first=false;
    if(d.dragged){
      d.pts.push(cur);
      if(!k.nodrag){finishDraw();return;}
      d.multi=true;
    }else d.multi=true;
  }else{
    const last=d.pts[d.pts.length-1];
    if(dist(cur,last)<3/DS.view.z){finishDraw();return;}
    if(k.closed&&d.pts.length>=3&&dist(cur,d.pts[0])<12/DS.view.z){finishDraw();return;}
    d.pts.push(cur);
    if(k.two&&d.pts.length>=2){finishDraw();return;}
  }
  syncFin();renderOverlay();
}
function finishDraw(){
  const d=DS.draw;if(!d)return;
  const k=K[d.kind];
  let pts=d.pts;
  if(pts.length<(k.min||2)){cancelDraw();return;}
  pushH();
  const o=mkPath(d.kind,pts.map(p=>[f2(p[0]),f2(p[1])]));
  if(k.closed)o.closed=true;
  DS.data.objs.push(o);DS.draw=null;DS.drag=null;DS.snapPt=null;
  setSel([o.id]);renderStudio();syncFin();
}
function cancelDraw(){DS.draw=null;DS.drag=null;DS.snapPt=null;syncFin();renderOverlay();}
function syncFin(){$('#sFin').hidden=!(DS.draw&&DS.draw.multi);}

/* ---- text editing ---- */
function openEdit(o,isLabel,isNew){
  DS.edit={o,isLabel,isNew};
  const ta=$('#sTa'),z=DS.view.z,r=svg.getBoundingClientRect(),wr=$('#sWrap').getBoundingClientRect();
  const fs=(o.fs||13)*z;
  let x=isLabel?o.x+o.w/2:o.x,y=isLabel?o.y+o.h+4:o.y;
  const sx=x*z+DS.view.x+(r.left-wr.left),sy=y*z+DS.view.y+(r.top-wr.top);
  ta.value=isLabel?(o.label||''):(o.text||'');
  const width=isLabel?150:Math.max(140,o.w*z+40);
  Object.assign(ta.style,{display:'block',left:(isLabel?sx-width/2:sx)+'px',top:sy+'px',width:width+'px',height:Math.max(34,fs*2.6)+'px',
    fontSize:fs+'px',fontFamily:isLabel?'inherit':(o.font||FONT),fontWeight:(!isLabel&&o.bold)?'700':'400',fontStyle:(!isLabel&&o.italic)?'italic':'normal',
    color:isLabel?'#111':o.stroke,textAlign:isLabel?'center':(o.align||'left')});
  ta.focus();
}
function commitEdit(){
  const E=DS.edit;if(!E)return;DS.edit=null;
  const ta=$('#sTa'),v=ta.value;ta.style.display='none';
  const o=E.o;
  if(E.isLabel){if((o.label||'')!==v){pushH();o.label=v;}}
  else if(E.isNew){if(v.trim()){pushH();o.text=v;fitText(o);DS.data.objs.push(o);setSel([o.id]);}}
  else if(o.text!==v){
    pushH();
    if(!v.trim()){DS.data.objs=DS.data.objs.filter(x=>x.id!==o.id);DS.sel=DS.sel.filter(i=>i!==o.id);}
    else{o.text=v;fitText(o);}
  }
  renderStudio();syncCtx();
}
function cancelEdit(){DS.edit=null;$('#sTa').style.display='none';renderStudio();}

/* ---- context bar ---- */
const noBend=['line','arrow','curve','cconn','scribble'];
function ctxGroups(){
  const g=new Set(),os=selObjs();
  const addPath=k=>{const c=K[k].cat;g.add('stroke');if(!noBend.includes(k))g.add('bend');if(c==='road'){g.add('road');g.add('fill');}else if(K[k].closed)g.add('fill');};
  if(os.length){
    os.forEach(o=>{
      if(o.type==='path')addPath(o.kind);
      else if(o.type==='rect'||o.type==='ellipse'){g.add('stroke');g.add('fill');}
      else if(o.type==='text'){g.add('text');g.add('stroke');}
      else if(o.type==='sym'){g.add('stroke');}
    });
    g.add('sel');
  }else{
    const t=DS.tool;
    if(K[t])addPath(t);
    else if(t==='rect'||t==='ellipse'||t==='plotbox'){g.add('stroke');g.add('fill');}
    else if(t==='text'){g.add('text');g.add('stroke');}
    else if(t==='sym'){g.add('stroke');}
  }
  if(DS.data&&DS.data.objs.some(o=>o.locked))g.add('lockall');
  return g;
}
function curSrc(){const os=selObjs();return os.length?os[0]:(DS.tool!=='select'&&DS.tool!=='pan'&&DS.tool!=='erase'?tmpl(DS.tool):null);}
function syncCtx(){
  if(!DS.data)return;
  const g=ctxGroups(),o=curSrc(),os=selObjs();
  $$('#sCtx .cg').forEach(el=>{el.hidden=!g.has(el.dataset.for);});
  if(o){
    $('#cStroke').value=toHex(o.stroke||'#1b1f24');
    $('#cSW').value=String(o.sw||2);
    $('#cDash').value=o.dash||'';
    $('#cFillOn').classList.toggle('on',!!o.fill);
    $('#cFill').value=toHex(o.fill||'#fff3b0');
    $('#cRW').value=o.rw||'';
    const rtSel=$('#cRoadType');
    rtSel.style.display=ROAD_KINDS.includes(o.kind)?'':'none';
    rtSel.value=o.rtype||(ROAD_PRESETS[o.kind]?o.kind:'');
    $('#cCenter').classList.toggle('on',!!o.center);
    $('#cBend').classList.toggle('on',(o.r||0)>0);
    $('#cR').value=o.r||'';
    if(o.font)$('#cFont').value=o.font;
    if(o.fs)$('#cFS').value=String(Math.round(o.fs));
    $$('#sCtx [data-t]').forEach(b=>b.classList.toggle('on',!!o[b.dataset.t]));
    $$('#sCtx [data-al]').forEach(b=>b.classList.toggle('on',(o.align||'left')===b.dataset.al));
  }
  const q=s=>$('#sCtx [data-a="'+s+'"]');
  if(q('ungroup'))q('ungroup').style.display=os.some(x=>x.gid)?'':'none';
  q('group').style.display=os.length>1?'':'none';
  q('nodes').style.display=(os.length===1&&os[0].type==='path')?'':'none';
  q('nodes').classList.toggle('on',DS.nodeMode);
  q('lock').classList.toggle('on',os.length>0&&os.every(x=>x.locked));
}
function toHex(c){return /^#[0-9a-f]{6}$/i.test(c)?c:(/^#[0-9a-f]{3}$/i.test(c)?'#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]:'#000000');}
function setProp(p,v){
  const os=selObjs();
  if(os.length){
    pushH('p:'+p);
    os.forEach(o=>{o[p]=v;if(o.type==='text'&&['fs','font','bold','italic'].includes(p))fitText(o);});
    renderStudio();
  }else{
    const t=DS.tool;if(t==='select'||t==='pan'||t==='erase')return;
    (DS.over[t]=DS.over[t]||{})[p]=v;
  }
  syncCtx();
}
function setProps(map,key){
  const os=selObjs();
  if(os.length){pushH(key);os.forEach(o=>Object.assign(o,map));renderStudio();}
  else{const t=DS.tool;if(t==='select'||t==='pan'||t==='erase')return;Object.assign(DS.over[t]=DS.over[t]||{},map);}
  syncCtx();
}
function wireCtx(){
  $('#cStroke').addEventListener('input',e=>setProp('stroke',e.target.value));
  $('#cSW').addEventListener('change',e=>setProp('sw',parseFloat(e.target.value)));
  $('#cDash').addEventListener('change',e=>setProp('dash',e.target.value));
  $('#cFillOn').addEventListener('click',()=>{const o=curSrc();setProp('fill',o&&o.fill?null:$('#cFill').value);});
  $('#cFill').addEventListener('input',e=>setProp('fill',e.target.value));
  $('#cRW').addEventListener('change',e=>{const v=parseFloat(e.target.value);if(v>0)setProps({rw:v,rtype:''},'p:rw');});
  $('#cRoadType').addEventListener('change',e=>{
    const k=e.target.value,pr=ROAD_PRESETS[k];
    if(pr)setProps({rw:pr.rw,rtype:k},'p:rtype');else setProps({rtype:''},'p:rtype');
  });
  $('#cCenter').addEventListener('click',()=>{const o=curSrc();setProp('center',!(o&&o.center));});
  $('#cBend').addEventListener('click',()=>{const o=curSrc();setProp('r',(o&&o.r>0)?0:(parseFloat($('#cR').value)||14));});
  $('#cR').addEventListener('change',e=>{const v=parseFloat(e.target.value);setProp('r',v>0?v:0);});
  $('#cFont').addEventListener('change',e=>setProp('font',e.target.value));
  $('#cFS').addEventListener('change',e=>setProp('fs',parseFloat(e.target.value)));
  $$('#sCtx [data-t]').forEach(b=>b.addEventListener('click',()=>{const o=curSrc();setProp(b.dataset.t,!(o&&o[b.dataset.t]));}));
  $$('#sCtx [data-al]').forEach(b=>b.addEventListener('click',()=>setProp('align',b.dataset.al)));
  $$('#sCtx [data-al2]').forEach(b=>b.addEventListener('click',()=>alignPage(b.dataset.al2)));
  $$('#sCtx [data-a]').forEach(b=>b.addEventListener('click',()=>action(b.dataset.a)));
}
function action(a){
  switch(a){
    case 'rotL':rotateSel(-90);break;case 'rotR':rotateSel(90);break;case 'rot180':rotateSel(180);break;
    case 'rotN':{const v=parseFloat(prompt('Rotate by angle (degrees, + = clockwise):','15'));if(!isNaN(v))rotateSel(v);break;}
    case 'group':if(DS.sel.length>1){pushH();const g=uid();selObjs().forEach(o=>o.gid=g);syncCtx();toast('Grouped');}break;
    case 'ungroup':pushH();selObjs().forEach(o=>{delete o.gid;});syncCtx();break;
    case 'nodes':DS.nodeMode=!DS.nodeMode;renderOverlay();syncCtx();break;
    case 'front':case 'back':case 'up':case 'down':order(a);break;
    case 'dup':dupSel();break;
    case 'lock':{const os=selObjs();if(!os.length)break;pushH();const v=!os.every(o=>o.locked);os.forEach(o=>o.locked=v);if(v)setSel([]);renderStudio();syncCtx();break;}
    case 'unlockall':pushH();DS.data.objs.forEach(o=>{delete o.locked;});renderStudio();syncCtx();break;
    case 'del':delSel();break;
  }
}
function rotateSel(deg){
  const F=selFrame();if(!F)return;pushH();
  applySnaps(selObjs().map(clone),Trot(F.cx,F.cy,deg));renderStudio();
}
function order(k){
  const ids=new Set(DS.sel);if(!ids.size)return;pushH();
  const a=DS.data.objs,sel=a.filter(o=>ids.has(o.id)),rest=a.filter(o=>!ids.has(o.id));
  if(k==='front'){sel.forEach(o=>{o.lvl='above';});DS.data.objs=rest.concat(sel);}
  else if(k==='back'){sel.forEach(o=>{o.lvl='below';});DS.data.objs=sel.concat(rest);}
  else if(k==='up'){for(let i=a.length-2;i>=0;i--){if(ids.has(a[i].id)&&!ids.has(a[i+1].id)){const t=a[i];a[i]=a[i+1];a[i+1]=t;}}}
  else{for(let i=1;i<a.length;i++){if(ids.has(a[i].id)&&!ids.has(a[i-1].id)){const t=a[i];a[i]=a[i-1];a[i-1]=t;}}}
  renderStudio();
}
function alignPage(k){
  const os=selObjs();if(!os.length)return;
  const b=unionBox(os),W=DS.data.w,H=DS.data.h;let dx=0,dy=0;
  if(k==='l')dx=-b.x0;if(k==='c')dx=W/2-(b.x0+b.x1)/2;if(k==='r')dx=W-b.x1;
  if(k==='t')dy=-b.y0;if(k==='m')dy=H/2-(b.y0+b.y1)/2;if(k==='b')dy=H-b.y1;
  pushH();applySnaps(os.map(clone),Tmove(dx,dy));renderStudio();
}
function cloneSel(){
  const map={};
  return selObjs().map(o=>{const c=clone(o);c.id=uid();if(c.gid){map[c.gid]=map[c.gid]||uid();c.gid=map[c.gid];}return c;});
}
function dupSel(){
  if(!DS.sel.length)return;pushH();
  const nw=cloneSel();nw.forEach(c=>moveRaw(c,20,20));
  DS.data.objs.push(...nw);setSel(nw.map(c=>c.id));renderStudio();
}
function delSel(){
  if(!DS.sel.length)return;pushH();
  const ids=new Set(DS.sel);DS.data.objs=DS.data.objs.filter(o=>!ids.has(o.id));
  DS.sel=[];DS.nodeMode=false;renderStudio();syncCtx();
}

/* ---- rail / symbols ---- */
const RAIL=[
 ['',[['select'],['pan'],['erase']]],
 ['Lines',[['line'],['arrow'],['elbow'],['cconn'],['curve'],['poly'],['polygon'],['scribble']]],
 ['Roads & lines',[['custom'],['mud'],['foot'],['stream'],['rail'],['elec'],['plot']]],
 ['Shapes',[['rect'],['ellipse'],['plotbox'],['text']]],
 ['Insert',[['sym'],['image'],['qr']]]
];
const TLBL={select:'Select',pan:'Pan',erase:'Erase',rect:'Rectangle',ellipse:'Ellipse',plotbox:'Plot box',text:'Text',sym:'Symbols',image:'Image',qr:'QR code'};
const TICON={select:'select',pan:'pan',erase:'eraser',rect:'rect',ellipse:'ellipse',plotbox:'plotbox',text:'text',sym:'symbol',image:'image',qr:'qr'};
function toolIcon(id){
  if(K[id]){
    const k=K[id];
    let P=[[4,18],[17,6],[30,16]];
    if(['line','arrow','elbow','cconn'].includes(id))P=[[4,18],[30,6]];
    if(id==='curve')P=[[4,18],[12,5],[22,18],[30,7]];
    if(id==='polygon')P=[[6,19],[17,4],[30,17]];
    if(id==='scribble')P=[[4,16],[9,6],[14,18],[20,6],[26,18],[30,10]];
    const o=mkPath(id,P,{});
    if(k.cat==='road'){o.rw=Math.min(o.rw*0.42,7);o.sw=1;}
    if(id==='polygon'){o.closed=true;o.fill='#d7e8ff';}
    if(id==='rail')o.sw=1.2;
    if(id==='plot'||id==='foot')o.sw=2;
    return '<svg viewBox="0 0 34 24" width="34" height="24">'+renderObjs({objs:[o]},false)+'</svg>';
  }
  if(id==='plotbox')return ic('plotbox','',22).replace(/currentColor/g,'#d32f2f');
  return ic(TICON[id],'',22);
}
function buildRail(){
  let h='';
  RAIL.forEach(g=>{
    if(g[0])h+='<div class="gl">'+g[0]+'</div>';
    g[1].forEach(it=>{const id=it[0];h+='<button class="tb" data-tool="'+id+'" title="'+esc(K[id]?K[id].t:TLBL[id])+'"><span class="ti">'+toolIcon(id)+'</span><span>'+(K[id]?K[id].n:TLBL[id])+'</span></button>';});
  });
  $('#sRail').innerHTML=h;
}
function symLabel(S){return DS.symLang==='ml'&&S.m?S.m:S.e;}
function buildSymCats(){
  $('#sSymCats').innerHTML=SYM_CATS.map(c=>'<button data-cat="'+c[0]+'" class="'+(DS.symCat===c[0]?'on':'')+'">'+c[1]+'</button>').join('');
}
function buildSymGrid(){
  const q=($('#sSymQ').value||'').toLowerCase().trim();
  if(DS.symMode==='web'){renderOnline();return;}
  const list=SYM.filter(s=>(DS.symCat==='all'||s.c===DS.symCat)&&(!q||s.e.toLowerCase().includes(q)||(s.m||'').toLowerCase().includes(q)||s.id.includes(q)));
  $('#sSymGrid').innerHTML=list.map(s=>'<button data-sym="'+s.id+'" title="'+esc(s.e)+'" class="'+(DS.symId===s.id?'on':'')+'"><svg viewBox="0 0 100 100" width="40" height="40">'+s.s.replace(/\{c\}/g,'#1b1f24')+'</svg><span>'+esc(DS.symLang==='ml'&&s.m?s.m:s.e)+'</span></button>').join('')||'<p class="none">No symbols found</p>';
}
/* ---- online symbol search (Iconify: https://iconify.design, open-source icon sets) ---- */
const ONLINE = {};          /* picked online symbols, by id "set:name" */
const OL = { api: 'https://api.iconify.design', results: [], cols: {}, data: {}, state: 'idle', msg: '', timer: null };
function olQuery(q) {
  q = q.trim();
  if (!/[^\x00-\x7f]/.test(q)) return q;                 /* Malayalam word: find it in our own symbol names */
  const hit = SYM.filter(s => s.m && (s.m.indexOf(q) >= 0 || q.indexOf(s.m) >= 0));
  return hit.length ? hit[0].e : q;
}
async function olSearch() {
  const raw = $('#sSymQ').value.trim();
  if (raw.length < 2) { OL.results = []; OL.state = 'idle'; renderOnline(); return; }
  const seq = ++DS.olSeq;
  OL.state = 'busy'; renderOnline();
  try {
    const r = await fetch(OL.api + '/search?limit=72&query=' + encodeURIComponent(olQuery(raw)));
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (seq !== DS.olSeq) return;
    OL.cols = j.collections || {};
    const names = j.icons || [], byP = {};
    names.forEach(n => { const i = n.indexOf(':'); (byP[n.slice(0, i)] = byP[n.slice(0, i)] || []).push(n.slice(i + 1)); });
    let failed = 0;
    const jobs = [];
    Object.keys(byP).forEach(p => {
      const list = byP[p].sort();
      for (let k = 0; k < list.length; k += 20) jobs.push(olLoad(p, list.slice(k, k + 20)).catch(() => { failed++; }));
    });
    await Promise.all(jobs);
    if (seq !== DS.olSeq) return;
    OL.results = names.filter(n => OL.data[n]);
    OL.state = OL.results.length ? 'ok' : (failed ? 'err' : 'none');
  } catch (_) {
    if (seq !== DS.olSeq) return;
    OL.results = []; OL.state = 'err';
  }
  renderOnline();
}
/* Drawings arrive as JSON (not as <img> files), so they show even when image loading is restricted. */
async function olLoad(prefix, names) {
  const r = await fetch(OL.api + '/' + encodeURIComponent(prefix) + '.json?icons=' + names.map(encodeURIComponent).join(','));
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json(), icons = j.icons || {};
  Object.keys(icons).forEach(n => {
    const ic = icons[n];
    if (ic && ic.body) OL.data[prefix + ':' + n] = { b: ic.body, w: ic.width || j.width || 24, h: ic.height || j.height || 24 };
  });
}
function olSvg(name, color) {
  const d = OL.data[name];
  if (!d) return '';
  return safeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + d.w + ' ' + d.h + '">' + d.b.replace(/currentColor/g, color) + '</svg>');
}
function renderOnline() {
  const g = $('#sSymGrid'), note = $('#sSymNote');
  const msg = { idle: 'Type a word (English) to search online icons.', busy: 'Searching…', none: 'No icons found. Try another word.',
    err: 'Could not reach the online library. Check your internet connection.' }[OL.state];
  if (OL.state !== 'ok') { g.innerHTML = '<p class="none">' + msg + '</p>'; note.textContent = ''; return; }
  g.innerHTML = OL.results.map(n => '<button data-ol="' + esc(n) + '" title="' + esc(n) + '" class="' + (DS.symId === 'ol:' + n ? 'on' : '') +
    '">' + olSvg(n, '#1b1f24') + '<span>' + esc(n.split(':')[1]) + '</span></button>').join('');
  note.textContent = 'Icons from Iconify open-source sets. Check the licence of a set before publishing.';
}
function olPick(name) {
  const clean = olSvg(name, '{c}');
  if (!clean) { toast('Could not load that icon'); return; }
  const id = 'ol:' + name, col = OL.cols[name.split(':')[0]] || {}, lic = col.license && (col.license.spdx || col.license.title) || '';
  ONLINE[id] = { id, e: name.split(':')[1].replace(/[-_]/g, ' '), s: clean, online: true, lic, set: col.name || '' };
  DS.symId = id; buildSymGrid();
  hint(ONLINE[id].e + (lic ? ' (' + lic + ')' : '') + ' — tap the page to place it');
  if (window.matchMedia && window.matchMedia('(max-width:720px)').matches) openSymPanel(false);
}
function setSymMode(m) {
  DS.symMode = m;
  $$('#sSymTabs button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#sSym').classList.toggle('web', m === 'web');
  $('#sSymQ').placeholder = m === 'web' ? 'Search online icons (English)…' : 'Search symbols…';
  buildSymGrid();
  if (m === 'web' && $('#sSymQ').value.trim().length >= 2 && OL.state === 'idle') olSearch();
}
function openSymPanel(on){DS.symOpen=on;$('#sSym').classList.toggle('open',on);}
function setTool(t){
  if(DS.draw){(DS.draw.pts.length>=(K[DS.draw.kind].min||2))?finishDraw():cancelDraw();}
  commitEdit();
  if(t==='image'){$('#sImgIn').click();return;}
  if(t==='qr'){addQR();return;}
  DS.tool=t;DS.drag=null;DS.nodeMode=false;
  if(t!=='select'&&DS.sel.length)DS.sel=[];
  $$('#sRail .tb').forEach(b=>b.classList.toggle('on',b.dataset.tool===t));
  if(t==='sym'){openSymPanel(true);buildSymGrid();}else openSymPanel(false);
  svg.style.cursor=t==='pan'?'grab':(t==='select'?'default':'crosshair');
  toolHint();renderOverlay();syncCtx();
}

/* ---- images / QR ---- */
function loadImg(file,maxd,cb){
  const rd=new FileReader();
  rd.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const s=Math.min(1,maxd/Math.max(im.naturalWidth,im.naturalHeight));
      const c=document.createElement('canvas');c.width=Math.max(1,Math.round(im.naturalWidth*s));c.height=Math.max(1,Math.round(im.naturalHeight*s));
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      const png=file.type==='image/png';
      cb(c.toDataURL(png?'image/png':'image/jpeg',0.82),c.width,c.height);
    };
    im.onerror=()=>toast('Could not read the image');
    im.src=rd.result;
  };
  rd.readAsDataURL(file);
}
function addImageObj(url,w,h){
  const d=DS.data,s=Math.min(1,d.w*0.9/w,d.h*0.9/h),W=w*s,H=h*s,key='i'+uid();
  d.imgs[key]=url;pushH();
  const o={id:uid(),type:'img',src:key,x:(d.w-W)/2,y:(d.h-H)/2,w:W,h:H,rot:0,lvl:'below'};
  d.objs.unshift(o);setSel([o.id]);renderStudio();
  if(DS.tool!=='select')setTool('select');
  toast('Image added — lock it to draw on top');
}
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
function addQR(){
  let t=prompt('Google Maps link or GPS coordinates (e.g. 10.52,76.21):');
  if(!t)return;t=t.trim();
  if(/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t))t='https://www.google.com/maps?q='+t.replace(/\s+/g,'');
  const go=()=>{
    try{
      const q=qrcode(0,'M');q.addData(t);q.make();
      const n=q.getModuleCount(),pad=2,rows=[];
      for(let r=-pad;r<n+pad;r++){let s='';for(let c=-pad;c<n+pad;c++)s+=(r>=0&&c>=0&&r<n&&c<n&&q.isDark(r,c))?'1':'0';rows.push(s);}
      pushH();
      const d=DS.data,S=110;
      const o={id:uid(),type:'qr',m:rows,x:d.w-S-20,y:d.h-S-20,w:S,h:S,rot:0,text:t};
      d.objs.push(o);setSel([o.id]);renderStudio();
    }catch(_){toast('Could not make the QR code (text too long?)');}
  };
  if(window.qrcode)go();
  else loadScript('vendor/qrcode.js').then(go,()=>toast('Could not load the QR library'));
}

/* ---- page setup dialog ---- */
const PRESETS={a4:[794,1123],a3:[1123,1587],a5:[559,794],std:[900,600],wide:[960,540],sq:[900,900]};
function openPage(){
  const d=DS.data;
  $('#pgW').value=d.w;$('#pgH').value=d.h;$('#pgBg').value=toHex(d.bg||'#ffffff');$('#pgFrameChk').checked=d.frame!==false;
  $('#dlgPage').showModal();
}
function setPageSize(w,h){
  w=Math.max(100,Math.min(6000,Math.round(w)));h=Math.max(100,Math.min(6000,Math.round(h)));
  if(w===DS.data.w&&h===DS.data.h){toast(w>=h?'Already landscape':'Already portrait');return;}
  pushH();DS.data.w=w;DS.data.h=h;
  applyPage();renderStudio();fitView();
  $('#pgW').value=w;$('#pgH').value=h;
  toast(w>=h?'Landscape':'Portrait');
}
function wirePage(){
  $$('#pgPresets [data-p]').forEach(b=>b.addEventListener('click',()=>{
    const a=PRESETS[b.dataset.p],land=DS.data.w>=DS.data.h,mx=Math.max(a[0],a[1]),mn=Math.min(a[0],a[1]);
    setPageSize(land?mx:mn,land?mn:mx);
  }));
  $$('#dlgPage [data-o]').forEach(b=>b.addEventListener('click',()=>{
    const mx=Math.max(DS.data.w,DS.data.h),mn=Math.min(DS.data.w,DS.data.h);
    setPageSize(b.dataset.o==='l'?mx:mn,b.dataset.o==='l'?mn:mx);
  }));
  $('#pgApply').addEventListener('click',()=>{
    const w=Math.max(100,Math.min(6000,+$('#pgW').value||900)),h=Math.max(100,Math.min(6000,+$('#pgH').value||600));
    pushH();Object.assign(DS.data,{w,h,bg:$('#pgBg').value,frame:$('#pgFrameChk').checked});
    applyPage();renderStudio();fitView();$('#dlgPage').close();
  });
  $('#pgCrop').addEventListener('click',()=>{
    const os=DS.data.objs;if(!os.length){toast('Nothing to crop to');return;}
    pushH();const b=unionBox(os),m=24,dx=m-b.x0,dy=m-b.y0;
    applySnaps(os.map(clone),Tmove(dx,dy));
    DS.data.w=Math.ceil(b.x1-b.x0+2*m);DS.data.h=Math.ceil(b.y1-b.y0+2*m);
    applyPage();renderStudio();fitView();$('#dlgPage').close();
  });
  $('#pgImg').addEventListener('click',()=>{$('#dlgPage').close();$('#sImgIn').click();});
}

/* ---- drawing file dialog: open / save / export / revert ---- */
function usedImgs(d){const o={};d.objs.forEach(x=>{if(x.type==='img'&&d.imgs[x.src])o[x.src]=d.imgs[x.src];});return o;}
function drawingJSON(){
  const d=DS.data;
  return JSON.stringify({app:'docstudio-drawing',v:1,saved:new Date().toISOString(),data:{w:d.w,h:d.h,bg:d.bg,frame:d.frame,objs:d.objs,imgs:usedImgs(d)}});
}
function loadDrawingText(text){
  let j;try{j=JSON.parse(text);}catch(_){toast('Not a valid drawing file');return false;}
  const d=j&&j.app==='docstudio-drawing'?j.data:(j&&Array.isArray(j.objs)?j:null);
  if(!d||!Array.isArray(d.objs)){toast('This is not a drawing file');return false;}
  pushH();
  DS.data.w=d.w||900;DS.data.h=d.h||600;DS.data.bg=d.bg||'#ffffff';DS.data.frame=d.frame!==false;
  DS.data.objs=d.objs;DS.data.imgs=d.imgs||{};
  DS.sel=[];DS.nodeMode=false;applyPage();renderStudio();fitView();syncCtx();toast('Drawing opened');
  return true;
}
function wireDFile(){
  $('#dfOpen').addEventListener('click',()=>$('#dfIn').click());
  $('#dfIn').addEventListener('change',e=>{
    const f=e.target.files[0];e.target.value='';if(!f)return;
    const r=new FileReader();r.onload=()=>{if(loadDrawingText(String(r.result)))$('#dlgDFile').close();};r.readAsText(f);
  });
  $('#dfSave').addEventListener('click',()=>{dlBlob('location-map.drawing.json','application/json',drawingJSON());toast('Drawing file saved');});
  $('#dfPng').addEventListener('click',()=>{
    const d=DS.data;svgToPng(buildSVG(d,{px:1}),d.w,d.h,Math.min(3,3000/d.w)).then(u=>dlUrl('drawing.png',u),()=>toast('Could not make the PNG'));
  });
  $('#dfSvg').addEventListener('click',()=>{dlBlob('drawing.svg','image/svg+xml',buildSVG(DS.data,{px:1}));});
  $('#dfRevert').addEventListener('click',()=>{
    if(!DS.orig)return;
    if(confirm('Go back to how this drawing looked when you opened it? (You can still undo.)')){pushH();restoreSnap(DS.orig);fitView();$('#dlgDFile').close();}
  });
  $('#dfClear').addEventListener('click',()=>{
    if(confirm('Remove everything from this drawing? (You can still undo.)')){pushH();DS.data.objs=[];DS.sel=[];renderStudio();syncCtx();$('#dlgDFile').close();}
  });
}

/* ---- open / close ---- */
function openStudio(data,cb,meta){
  DS.data=JSON.parse(JSON.stringify(data));DS.data.imgs=DS.data.imgs||{};
  DS.cb=cb;DS.meta=meta||{};DS.undo=[];DS.redo=[];DS.sel=[];DS.dirty=false;DS.draw=null;DS.drag=null;DS.nodeMode=false;DS.edit=null;
  DS.orig=snapStr();
  $('#studio').classList.add('on');document.body.style.overflow='hidden';
  updUR();syncFin();
  setTool('select');applyPage();
  requestAnimationFrame(()=>{fitView();renderStudio();syncCtx();});
}
function closeStudio(save){
  commitEdit();
  if(DS.draw){(DS.draw.pts.length>=(K[DS.draw.kind].min||2))?finishDraw():cancelDraw();}
  const d=DS.data;
  if(typeof Draft!=='undefined')Draft.clear();
  if(save&&DS.cb){
    d.imgs=usedImgs(d);
    DS.cb(clone(d));
  }
  $('#studio').classList.remove('on');document.body.style.overflow='';
  openSymPanel(false);DS.data=null;DS.meta={};
}
function wireStudio(){
  buildRail();buildSymCats();wireCtx();wirePage();wireDFile();
  $('#sRail').addEventListener('click',e=>{const b=e.target.closest('.tb');if(b){if(b.dataset.tool==='sym'&&DS.tool==='sym'){openSymPanel(!DS.symOpen);return;}setTool(b.dataset.tool);}});
  svg.addEventListener('pointerdown',onDown);svg.addEventListener('pointermove',onMove);
  svg.addEventListener('pointerup',onUp);svg.addEventListener('pointercancel',onUp);
  svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(e.clientX,e.clientY,Math.exp(-e.deltaY*0.0015));},{passive:false});
  svg.addEventListener('contextmenu',e=>e.preventDefault());
  $('#sCancel').addEventListener('click',()=>{if(DS.dirty&&!confirm('Discard your changes to this drawing?'))return;closeStudio(false);});
  $('#sDone').addEventListener('click',()=>closeStudio(true));
  $('#sUndo').addEventListener('click',undo);$('#sRedo').addEventListener('click',redo);
  $('#sZoomIn').addEventListener('click',()=>{const r=svg.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,1.25);});
  $('#sZoomOut').addEventListener('click',()=>{const r=svg.getBoundingClientRect();zoomAt(r.left+r.width/2,r.top+r.height/2,0.8);});
  $('#sFit').addEventListener('click',fitView);
  $('#sGrid').addEventListener('click',e=>{DS.grid=!DS.grid;e.currentTarget.classList.toggle('on',DS.grid);applyPage();});
  $('#sSnap').addEventListener('click',e=>{DS.snap=!DS.snap;e.currentTarget.classList.toggle('on',DS.snap);});
  $('#sPage').addEventListener('click',openPage);
  $('#sFile').addEventListener('click',()=>$('#dlgDFile').showModal());
  $('#sOrient').addEventListener('click',()=>setPageSize(DS.data.h,DS.data.w));
  $('#sHelp').addEventListener('click',()=>$('#dlgHelp').showModal());
  $('#sFinOk').addEventListener('click',()=>finishDraw());$('#sFinNo').addEventListener('click',cancelDraw);
  $('#sSymX').addEventListener('click',()=>openSymPanel(false));
  $('#sSymQ').addEventListener('input',()=>{
    if(DS.symMode==='web'){clearTimeout(OL.timer);OL.timer=setTimeout(olSearch,450);}else buildSymGrid();
  });
  $('#sSymQ').addEventListener('keydown',e=>{if(e.key==='Enter'&&DS.symMode==='web'){clearTimeout(OL.timer);olSearch();}});
  $('#sSymTabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setSymMode(b.dataset.m);});
  $('#sSymAuto').addEventListener('change',e=>{DS.symAuto=e.target.checked;});
  $('#sSymLang').addEventListener('change',e=>{DS.symLang=e.target.value;buildSymGrid();});
  $('#sSymCats').addEventListener('click',e=>{const b=e.target.closest('[data-cat]');if(!b)return;DS.symCat=b.dataset.cat;buildSymCats();buildSymGrid();});
  $('#sSymGrid').addEventListener('click',e=>{
    const ob=e.target.closest('[data-ol]');if(ob){olPick(ob.dataset.ol);return;}
    const b=e.target.closest('[data-sym]');if(!b)return;
    DS.symId=b.dataset.sym;buildSymGrid();
    hint(SYMMAP[DS.symId].e+' — tap the page to place it');
    if(window.matchMedia('(max-width:720px)').matches)openSymPanel(false);
  });
  const ta=$('#sTa');
  ta.addEventListener('blur',commitEdit);
  ta.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();cancelEdit();}else if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();ta.blur();}});
  $('#sImgIn').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';if(f&&DS.data)loadImg(f,1600,addImageObj);});
  window.addEventListener('resize',()=>{if(studioOpen())renderOverlay();});
  document.addEventListener('keydown',e=>{
    if(!studioOpen())return;
    const tag=(e.target.tagName||'').toLowerCase(),typing=tag==='input'||tag==='textarea'||tag==='select';
    if(DS.edit||typing)return;
    if($('#dlgPage').open||$('#dlgHelp').open)return;
    const k=e.key.toLowerCase(),mod=e.ctrlKey||e.metaKey;
    if(e.key===' '){DS.space=true;svg.style.cursor='grab';e.preventDefault();return;}
    if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
    if(mod&&k==='s'){e.preventDefault();if(typeof Draft!=='undefined')Draft.flush();toast('Draft saved');return;}
    if(mod&&k==='y'){e.preventDefault();redo();return;}
    if(mod&&k==='d'){e.preventDefault();dupSel();return;}
    if(mod&&k==='g'){e.preventDefault();action(e.shiftKey?'ungroup':'group');return;}
    if(mod&&k==='a'){e.preventDefault();DS.tool!=='select'&&setTool('select');setSel(DS.data.objs.filter(o=>!o.locked).map(o=>o.id));return;}
    if(mod&&k==='c'){DS.clip=cloneSel();return;}
    if(mod&&k==='v'){if(DS.clip&&DS.clip.length){e.preventDefault();pushH();const nw=DS.clip.map(c=>{const n=clone(c);n.id=uid();moveRaw(n,24,24);return n;});DS.clip=nw.map(clone);DS.data.objs.push(...nw);setSel(nw.map(c=>c.id));renderStudio();}return;}
    if(k==='delete'||k==='backspace'){e.preventDefault();delSel();return;}
    if(k==='enter'&&DS.draw){e.preventDefault();finishDraw();return;}
    if(k==='escape'){
      if(DS.draw)cancelDraw();else if(DS.sel.length)setSel([]);else if(DS.tool!=='select')setTool('select');
      return;
    }
    if(k.startsWith('arrow')&&DS.sel.length){
      e.preventDefault();const st=e.shiftKey?10:1;
      pushH('nudge');selObjs().forEach(o=>moveRaw(o,k==='arrowleft'?-st:k==='arrowright'?st:0,k==='arrowup'?-st:k==='arrowdown'?st:0));renderStudio();return;
    }
    if(!mod){
      if(k==='v')setTool('select');else if(k==='h')setTool('pan');else if(k==='t')setTool('text');else if(k==='e')setTool('erase');
      else if(k==='r'&&DS.sel.length)rotateSel(90);
    }
  },true);
  document.addEventListener('keyup',e=>{if(e.key===' '&&DS.space){DS.space=false;if(studioOpen())svg.style.cursor=DS.tool==='pan'?'grab':'default';}});
}

