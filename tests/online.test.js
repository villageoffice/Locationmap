/* Online symbol search test: the Iconify API is replaced by a fake, so no internet is needed. */
const {JSDOM}=require('jsdom');const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');const fakeIDB=require('fake-indexeddb');
let fails=0;const ok=(c,m)=>{if(!c)fails++;console.log((c?'PASS ':'FAIL ')+m);};
const SVG='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z" onclick="alert(1)"/><script>alert(2)</script></svg>';
JSDOM.fromFile(root+'/index.html',{runScripts:'dangerously',resources:'usable',pretendToBeVisual:true,
 beforeParse(w){
  w.document.execCommand=()=>true;w.indexedDB=fakeIDB.indexedDB;w.IDBKeyRange=fakeIDB.IDBKeyRange;
  w.SVGElement.prototype.getComputedTextLength=function(){return 8;};
  w.Element.prototype.setPointerCapture=()=>{};w.Element.prototype.releasePointerCapture=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','')};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open')};
  w.matchMedia=()=>({matches:false});w.confirm=()=>true;
  w.fetch=async u=>{
    if(/\/search\?/.test(u)){w.__q=decodeURIComponent(u.split('query=')[1]);return {ok:true,json:async()=>({icons:['mdi:bridge','tabler:bridge'],collections:{mdi:{name:'Material Design Icons',license:{spdx:'Apache-2.0'}}}})};}
    if(/\.svg/.test(u))return {ok:true,text:async()=>SVG};
    return {ok:false};
  };
 }}).then(async dom=>{
  const w=dom.window,$=s=>w.document.querySelector(s),ev=w.eval,wait=ms=>new Promise(r=>setTimeout(r,ms));
  for(let i=0;i<60&&!(w.App&&w.App.ready);i++)await wait(100);
  $('#drawBtn').click();await wait(200);
  $('[data-tool="sym"]').click();
  $('#sSymTabs [data-m="web"]').click();
  $('#sSymQ').value='bridge';$('#sSymQ').dispatchEvent(new w.Event('input'));
  await wait(800);
  const items=w.document.querySelectorAll('#sSymGrid [data-ol]');
  ok(items.length===2,'online results listed ('+items.length+')');
  $('#sSymQ').value='പാലം';$('#sSymQ').dispatchEvent(new w.Event('input'));await wait(800);
  ok(w.__q==='Bridge','Malayalam word mapped to English ('+w.__q+')');
  w.document.querySelector('#sSymGrid [data-ol]').click();await wait(300);
  const S=ev("ONLINE['ol:mdi:bridge']");
  ok(S&&S.online&&S.s.indexOf('{c}')>0,'icon fetched, colour slot kept');
  ok(S.s.indexOf('script')<0&&S.s.indexOf('onclick')<0,'script and handlers removed');
  const box=$('#sSvg');box.getBoundingClientRect=()=>({left:0,top:0,width:800,height:500,right:800,bottom:500});
  const DS=w.App.DS;DS.view={x:0,y:0,z:1};
  const ev2=(t,x,y)=>{const e=new w.MouseEvent(t,{clientX:x,clientY:y,bubbles:true});e.pointerId=1;return e;};
  box.dispatchEvent(ev2('pointerdown',300,200));box.dispatchEvent(ev2('pointerup',300,200));
  const o=DS.data.objs.find(x=>x.type==='sym');
  ok(o&&o.sym==='ol:mdi:bridge'&&o.osvg,'online symbol placed with its own svg');
  const svg=w.App.buildSVG(DS.data,{px:1});
  ok(svg.indexOf('M4 4h16v16H4z')>0&&svg.indexOf('script')<0,'renders in drawing, without script');
  // a tampered file must still be cleaned
  DS.data.objs.push({id:'x',type:'sym',sym:'nope',x:0,y:0,w:40,h:40,rot:0,stroke:'#000',osvg:SVG});
  ok(w.App.buildSVG(DS.data,{px:1}).indexOf('alert')<0,'tampered file cleaned on render');
  console.log(fails?fails+' FAILED':'ALL PASSED');process.exit(fails?1:0);
 });
