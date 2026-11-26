const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const errs=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push('jsdomError: '+(e.detail&&e.detail.stack||e.message).split('\n').slice(0,3).join(' | ')));vc.on('error',e=>errs.push('console.error: '+e));
const fakeIDB=require('fake-indexeddb');
JSDOM.fromFile(root+'/index.html',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,virtualConsole:vc,
 beforeParse(w){
  w.document.execCommand=()=>true;
  w.indexedDB=fakeIDB.indexedDB;w.IDBKeyRange=fakeIDB.IDBKeyRange;
  w.SVGElement.prototype.getComputedTextLength=function(){return (this.textContent||'').length*8;};
  w.Element.prototype.setPointerCapture=()=>{};w.Element.prototype.releasePointerCapture=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
  w.URL.createObjectURL=()=>'blob:x';w.URL.revokeObjectURL=()=>{};
  w.confirm=()=>true;w.prompt=(m,d)=>d;
  w.HTMLAnchorElement.prototype.click=function(){w.__dl=(w.__dl||[]).concat(this.download)};
 }}).then(async dom=>{
  const w=dom.window,$=s=>w.document.querySelector(s);
  let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'PASS ':'FAIL ')+m);};
  for(let i=0;i<60&&!(w.App&&w.App.ready);i++)await new Promise(r=>setTimeout(r,100));
  ok(w.App&&w.App.ready,'app started');
  const ev=w.eval;
  // icons
  const missing=[...w.document.querySelectorAll('i[data-i]')];
  ok(missing.length===0,'all <i data-i> replaced ('+missing.length+' left)');
  const names=new Set([...fs.readFileSync(root+'/index.html','utf8').matchAll(/data-i="(\w+)"/g)].map(m=>m[1]));
  const bad=[...names].filter(n=>!(n in ev('ICON_PATHS')));
  ok(bad.length===0,'index icons defined '+JSON.stringify(bad));
  // symbols
  const SYM=ev('SYM'),CATS=ev('SYM_CATS');
  const ids=new Set(SYM.map(s=>s.id));
  ok(ids.size===SYM.length,'symbol ids unique ('+SYM.length+')');
  const cats=new Set(SYM.map(s=>s.c));
  ok([...cats].every(c=>CATS.some(x=>x[0]===c)),'categories valid '+[...cats].join(','));
  const bad2=SYM.filter(s=>{const d=new w.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">'+s.s+'</svg>','image/svg+xml');return d.querySelector('parsererror');});
  ok(bad2.length===0,'symbol svg parse ok '+bad2.map(s=>s.id));
  // UI: english only in static html
  const ml=/[ഀ-ൿ]/.test(fs.readFileSync(root+'/index.html','utf8').replace(/മലയാളം/,''));
  ok(!ml,'index.html has no Malayalam UI text');
  // doc edit + save
  const ed=$('#editor');
  ed.innerHTML='<p>Hello world test</p>';$('#title').value='Test doc';
  w.eval('changed()');
  await new Promise(r=>setTimeout(r,900));
  const list=await w.eval('Store.all("docs")');
  ok(list.some(d=>d.title==='Test doc'&&d.html.includes('Hello')),'auto-save wrote doc to IndexedDB (mode '+w.eval('Store.mode')+')');
  // studio: draw + insert
  $('#drawBtn').click();
  ok($('#studio').classList.contains('on'),'studio opens');
  const svgEl=$('#sSvg');svgEl.getBoundingClientRect=()=>({left:0,top:0,width:800,height:500,right:800,bottom:500});
  const DS=w.App.DS;DS.view={x:0,y:0,z:1};
  const mk=(t,x,y,o)=>{const e=new w.MouseEvent(t,Object.assign({clientX:x,clientY:y,bubbles:true,cancelable:true},o||{}));e.pointerId=1;return e;};
  $('[data-tool="custom"]').click();
  svgEl.dispatchEvent(mk('pointerdown',100,100));svgEl.dispatchEvent(mk('pointermove',400,100));svgEl.dispatchEvent(mk('pointerup',400,100));
  $('[data-tool="rail"]').click();
  svgEl.dispatchEvent(mk('pointerdown',100,200));svgEl.dispatchEvent(mk('pointermove',400,260));svgEl.dispatchEvent(mk('pointerup',400,260));
  ok(DS.data.objs.length===2,'drew road + rail');
  ok(!$('[data-tool="nh"]')&&!$('[data-tool="sh"]')&&!$('[data-tool="pwd"]')&&!$('[data-tool="pnch"]'),'NH/SH/PWD/Panchayat are no longer separate tools');
  ok(!!$('[data-tool="mud"]')&&!!$('[data-tool="foot"]'),'dirt road and path tools are kept');
  const rt=$('#cRoadType');DS.sel=[DS.data.objs[0].id];w.App.setSel&&0;
  rt.value='nh';rt.dispatchEvent(new w.Event('change'));
  ok(DS.data.objs[0].rw===16&&DS.data.objs[0].rtype==='nh','choosing NH sets the width to 16');
  rt.value='pnch';rt.dispatchEvent(new w.Event('change'));
  ok(DS.data.objs[0].rw===7,'choosing Panchayat sets the width to 7');
  const rsvg=w.App.buildSVG(DS.data,{px:1});
  const railPart=rsvg.slice(rsvg.indexOf('stroke-width="9.8"'));
  ok(/stroke-width="9.8"[^>]*\/>.*stroke-width="6.2"[^>]*\/>.*stroke-dasharray=/.test(rsvg.replace(/\n/g,'')),'railway = two rails + cross ties');
  // symbols panel
  $('[data-tool="sym"]').click();
  ok($('#sSym').classList.contains('open')&&$$('#sSymGrid [data-sym]').length>100,'symbol panel lists '+$$('#sSymGrid [data-sym]').length);
  function $$(s){return [...w.document.querySelectorAll(s)];}
  $('#sSymCats [data-cat="transport"]').click();
  const nT=$$('#sSymGrid [data-sym]').length;ok(nT>5&&nT<40,'category filter transport='+nT);
  $('#sSymQ').value='police';$('#sSymQ').dispatchEvent(new w.Event('input'));
  ok($$('#sSymGrid [data-sym]').length===0,'search crosses category filter (transport+police=0)');
  $('#sSymCats [data-cat="all"]').click();
  ok($$('#sSymGrid [data-sym]').length===1,'search "police" -> 1');
  $('#sSymQ').value='പോലീസ്';$('#sSymQ').dispatchEvent(new w.Event('input'));
  ok($$('#sSymGrid [data-sym]').length===1,'Malayalam alias search works');
  $('#sSymGrid [data-sym="police"]').click();
  $('#sSymAuto').checked=true;$('#sSymAuto').dispatchEvent(new w.Event('change'));
  svgEl.dispatchEvent(mk('pointerdown',300,350));svgEl.dispatchEvent(mk('pointerup',300,350));
  const sy=DS.data.objs.find(o=>o.type==='sym');
  ok(sy&&sy.sym==='police'&&sy.label==='Police station','symbol placed with English label');
  // draft
  w.eval('Draft.flush()');await new Promise(r=>setTimeout(r,200));
  const dr=await w.eval('Draft.load()');
  ok(dr&&dr.data&&dr.data.objs.length===3&&dr.fid,'drawing draft saved ('+(dr&&dr.data.objs.length)+' objs)');
  // page orientation
  const W0=DS.data.w;$('#sOrient').click();ok(DS.data.h===W0,'orientation toggles');
  // pgBorder fix
  ok($('#pgBorder').getAttribute('width')==String(DS.data.w),'page border sized');
  // drawing file
  const json=w.eval('drawingJSON()');ok(JSON.parse(json).app==='docstudio-drawing','drawing json');
  const n0=DS.data.objs.length;w.eval('DS.data.objs=[]');ok(w.eval('loadDrawingText')(json)&&DS.data.objs.length===n0,'drawing file reopen');
  // revert
  $('#dfRevert').click();ok(DS.data.objs.length===0,'revert to opened state');
  w.eval('loadDrawingText')(json);
  $('#sDone').click();
  ok(!$('#studio').classList.contains('on'),'studio closed');
  const fig=$('#editor figure.drw');ok(fig&&fig.querySelector('svg')&&fig.dataset.fid,'figure inserted with fid');
  const dr2=await w.eval('Draft.load()');ok(!dr2,'draft cleared after Insert');
  // snapshots
  await w.eval('addSnap("Manual one",captureDoc())');
  const snaps=await w.eval('Store.all("snaps")');ok(snaps.length>=1,'snapshot stored');
  ed.innerHTML='<p>changed text</p>';w.eval('changed()');await new Promise(r=>setTimeout(r,900));
  await w.eval('restoreVersion')(snaps.find(s=>s.label==='Manual one').id);
  ok($('#editor figure.drw')&&$('#editor').textContent.includes('Hello'),'restore snapshot brings back text+drawing');
  // save as file + open file
  const payload=JSON.parse(w.eval('filePayload()'));ok(payload.app==='docstudio'&&payload.html.includes('data-drw'),'file payload contains editable drawing');
  const before=Object.keys(w.eval('docs')).length;
  w.eval('importText')('Test doc.docstudio.json',JSON.stringify(payload),null);
  await new Promise(r=>setTimeout(r,300));
  ok(Object.keys(w.eval('docs')).length===before+1&&$('#editor figure.drw svg'),'open file -> new doc with drawing rendered');
  w.eval('importText')('note.txt','line1\nline2',null);
  ok($('#editor').textContent.includes('line2'),'open .txt');
  // new map
  w.eval('newMap()');ok($('#studio').classList.contains('on')&&w.App.DS.data.w===794,'new location map opens studio (A4 portrait)');
  $('#sCancel').click();
  // export word
  w.svgToPng=()=>Promise.resolve('data:image/png;base64,AAAA');const h=await w.eval('exportHTML(true)');ok(h.includes('<html'),'export html builds');
  // library
  w.eval('renderLibrary()');ok($$('#docList .row2').length>=2,'library lists docs');
  console.log('ERRORS:',errs.length?errs:'none');
    // QR library (vendored)
  try{const n=await w.eval("(async()=>{await loadScript('vendor/qrcode.js').catch(()=>0);return typeof window.qrcode})()");ok(n==='function','vendored QR library loads');}catch(e){ok(false,'QR '+e.message);}
  console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0);
 });
