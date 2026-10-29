const TARGET_TITLES=new Set(['リスト管理','共有設定','デザイン設定','通知設定','購入履歴','リストを並び替え']);
let startX=0,startY=0,lastX=0,lastY=0,startTime=0,tracking=false,gestureLocked=false,swipeMain=null,swipeUnderlay=null,menuSnapshot='',manageSnapshot='';
const title=()=>document.querySelector('main header h1')?.textContent?.trim();
const isTargetPanel=()=>TARGET_TITLES.has(title());
const blockedTarget=el=>!!el?.closest?.('.sheet,.shade');
const token=()=>localStorage.getItem('listell_token');
const request=async(path,init={})=>{const r=await fetch('/api/'+path,{...init,headers:{'content-type':'application/json',...(token()?{authorization:'Bearer '+token()}:{}),...(init.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'通信エラー');return j};
const backToManage=()=>{const menu=document.querySelector('[data-tab="menu"]');if(!menu)return;menu.click();document.querySelector('[data-panel="manage"]')?.click()};
const backFromReorder=backToManage;
const applyMenuOrder=async()=>{try{const {lists=[]}=await request('lists');const rows=[...document.querySelectorAll('[data-list]')];if(!rows.length)return;const parent=rows[0].parentElement,map=new Map(rows.map(r=>[String(r.dataset.list),r]));lists.forEach(x=>{const row=map.get(String(x.id));if(row)parent.appendChild(row)})}catch{}};
const delayedLoader=main=>{const timer=setTimeout(()=>{if(main&&!main.querySelector('.panel-loading'))main.insertAdjacentHTML('beforeend','<div class="panel-loading" aria-label="読み込み中"></div>')},120);return()=>{clearTimeout(timer);main?.querySelector('.panel-loading')?.remove()}};
const currentMain=()=>document.querySelector('#app > main');
const cleanSnapshot=html=>{const box=document.createElement('div');box.innerHTML=html||'';box.querySelectorAll('.panel-loading').forEach(x=>x.remove());return box.innerHTML};
const captureSnapshots=()=>{const main=currentMain(),t=main?.querySelector('header h1')?.textContent?.trim();if(!main)return;if(t==='メニュー')menuSnapshot=cleanSnapshot(main.innerHTML);if(t==='リスト管理')manageSnapshot=cleanSnapshot(main.innerHTML)};
const destinationSnapshot=()=>{const t=title();return t==='リストを並び替え'||t==='購入履歴'?manageSnapshot:menuSnapshot};
const destinationBack=()=>{const t=title();if(t==='リストを並び替え'||t==='購入履歴')backToManage();else document.querySelector('[data-tab="menu"]')?.click()};
const removeSwipeLayer=()=>{swipeUnderlay?.remove();swipeUnderlay=null;if(swipeMain){swipeMain.classList.remove('edge-swipe-front');swipeMain.style.removeProperty('transform');swipeMain.style.removeProperty('transition');swipeMain.style.removeProperty('will-change');swipeMain.style.removeProperty('box-shadow')}swipeMain=null};
const prepareSwipeLayer=()=>{if(swipeMain&&swipeUnderlay)return true;const main=currentMain(),snapshot=destinationSnapshot();if(!main||!snapshot)return false;const app=document.querySelector('#app');if(!app)return false;const underlay=document.createElement('div');underlay.className='edge-swipe-underlay';underlay.setAttribute('aria-hidden','true');underlay.innerHTML=`<main>${snapshot}</main>`;app.insertBefore(underlay,main);swipeMain=main;swipeUnderlay=underlay;main.classList.add('edge-swipe-front');main.style.transition='none';main.style.willChange='transform';main.style.boxShadow='-12px 0 30px rgba(0,0,0,.28)';underlay.style.opacity='.16';return true};
const setSwipeProgress=dx=>{if(!swipeMain||!swipeUnderlay)return;const width=Math.max(1,window.innerWidth),x=Math.max(0,Math.min(width,dx)),p=Math.min(1,x/width);swipeMain.style.transform=`translate3d(${x}px,0,0)`;swipeUnderlay.style.opacity=String(.16+.84*p)};
const animateBack=()=>{if(!swipeMain||!swipeUnderlay){removeSwipeLayer();return}const main=swipeMain,underlay=swipeUnderlay;main.style.transition='transform .24s cubic-bezier(.22,.75,.2,1)';underlay.style.transition='opacity .24s ease';main.style.transform='translate3d(0,0,0)';underlay.style.opacity='.16';setTimeout(removeSwipeLayer,260)};
const animateComplete=()=>{if(!swipeMain||!swipeUnderlay){destinationBack();removeSwipeLayer();return}const main=swipeMain,underlay=swipeUnderlay,width=Math.max(window.innerWidth,main.getBoundingClientRect().width);main.style.transition='transform .22s cubic-bezier(.2,.72,.18,1)';underlay.style.transition='opacity .22s ease';main.style.transform=`translate3d(${width}px,0,0)`;underlay.style.opacity='1';setTimeout(()=>{removeSwipeLayer();destinationBack()},225)};

document.addEventListener('click',async e=>{
  const trigger=e.target?.closest?.('#reorderLists');
  if(!trigger)return;
  e.preventDefault();e.stopImmediatePropagation();
  const main=document.querySelector('#app > main, app > main, main');
  if(!main)return;
  main.innerHTML='<header><em>LIST ORDER</em><h1>リストを並び替え</h1></header>';
  const stopLoader=delayedLoader(main);
  try{
    const result=await request('lists'),ids=[...(result.lists||[])];
    stopLoader();
    let saving=false,pending=false;
    const save=async()=>{if(saving){pending=true;return}saving=true;try{await request('lists/reorder',{method:'POST',body:JSON.stringify({ids:ids.map(x=>x.id)})})}catch(err){alert(err.message)}finally{saving=false;if(pending){pending=false;save()}}};
    const draw=()=>{
      main.innerHTML=`<header><em>LIST ORDER</em><h1>リストを並び替え</h1></header><section class="card reorder-panel reorder-page">${ids.map((x,i)=>`<div class="reorder-row"><strong>${x.name}</strong><span class="reorder-actions"><button data-up="${i}" ${i===0?'disabled':''}>↑</button><button data-down="${i}" ${i===ids.length-1?'disabled':''}>↓</button></span></div>`).join('')}</section>`;
      main.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.up);[ids[i-1],ids[i]]=[ids[i],ids[i-1]];navigator.vibrate?.(10);draw();save()});
      main.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.down);[ids[i+1],ids[i]]=[ids[i],ids[i+1]];navigator.vibrate?.(10);draw();save()});
    };
    draw();
  }catch(err){stopLoader();alert(err.message);backFromReorder()}
},{capture:true});

document.addEventListener('click',e=>{if(e.target?.closest?.('[data-tab="menu"]'))setTimeout(()=>{applyMenuOrder().finally(()=>setTimeout(captureSnapshots,0))},0)},true);

document.addEventListener('click',e=>{
  const trigger=e.target?.closest?.('[data-panel="sharing"],[data-panel="notifications"]');
  if(!trigger)return;
  captureSnapshots();
  const panel=trigger.dataset.panel,title=panel==='sharing'?'共有設定':'通知設定';
  const main=document.querySelector('#app > main, app > main, main');
  if(!main)return;
  main.innerHTML=`<header><em>SETTINGS</em><h1>${title}</h1></header>`;
  const stopLoader=delayedLoader(main);
  setTimeout(stopLoader,1500);
},{capture:true});

document.addEventListener('click',e=>{const trigger=e.target?.closest?.('[data-panel="manage"],[data-panel="design"],[data-panel="history"]');if(trigger)captureSnapshots()},true);

const nativeFetch=window.fetch.bind(window),cache=new Map();
window.fetch=(input,init={})=>{
  const url=typeof input==='string'?input:input?.url||'';
  const method=(init?.method||'GET').toUpperCase();
  const cacheable=method==='GET'&&/\/api\/lists\/[^/]+\/(members|notifications)(?:\?|$)/.test(url);
  if(!cacheable){if(method!=='GET'&&url.includes('/api/'))cache.clear();return nativeFetch(input,init)}
  const key=url+'|'+JSON.stringify(init?.headers||{}),now=Date.now(),hit=cache.get(key);
  if(hit&&now-hit.time<5000)return hit.response.then(r=>r.clone());
  const response=nativeFetch(input,init).then(r=>{if(!r.ok)cache.delete(key);return r});cache.set(key,{time:now,response});return response.then(r=>r.clone());
};

const style=document.createElement('style');
style.textContent='.panel-loading{width:22px;height:22px;margin:32px auto;border:2px solid var(--line,#333);border-top-color:var(--accent,#fff);border-radius:50%;animation:panelLoading .65s linear infinite}@keyframes panelLoading{to{transform:rotate(360deg)}}.reorder-page{margin-top:18px}.reorder-page .reorder-row{display:flex;align-items:center}.reorder-page .reorder-row>strong{flex:1;min-width:0}.reorder-page .reorder-actions{margin-left:auto;display:flex;gap:8px;flex:0 0 auto}#app{position:relative;overflow-x:hidden}.edge-swipe-underlay{position:absolute;z-index:0;inset:0;min-height:100dvh;background:var(--base,#050605);pointer-events:none;overflow:hidden;will-change:opacity}.edge-swipe-underlay>main{min-height:100dvh}.edge-swipe-underlay button,.edge-swipe-underlay input,.edge-swipe-underlay select,.edge-swipe-underlay textarea{pointer-events:none}.edge-swipe-front{position:relative;z-index:2;background:var(--base,#050605);min-height:100dvh}';
document.head.appendChild(style);

new MutationObserver(()=>{if(!tracking)captureSnapshots()}).observe(document.querySelector('#app')||document.body,{childList:true,subtree:true});
setTimeout(captureSnapshots,0);

document.addEventListener('touchstart',e=>{if(e.touches.length!==1||!isTargetPanel()||blockedTarget(e.target))return;const t=e.touches[0];if(t.clientX>32)return;startX=lastX=t.clientX;startY=lastY=t.clientY;startTime=performance.now();tracking=true;gestureLocked=false},{passive:true});
document.addEventListener('touchmove',e=>{if(!tracking||e.touches.length!==1)return;const t=e.touches[0];lastX=t.clientX;lastY=t.clientY;const dx=lastX-startX,dy=lastY-startY,adx=Math.abs(dx),ady=Math.abs(dy);if(!gestureLocked){if(adx<7&&ady<7)return;if(dx<=0||ady>adx*1.12){tracking=false;removeSwipeLayer();return}gestureLocked=true;if(!prepareSwipeLayer()){tracking=false;return}}if(dx<0)return;if(ady>adx*1.35){tracking=false;animateBack();return}e.preventDefault();setSwipeProgress(dx)},{passive:false});
document.addEventListener('touchend',()=>{if(!tracking)return;tracking=false;if(!gestureLocked){removeSwipeLayer();return}const dx=Math.max(0,lastX-startX),dy=Math.abs(lastY-startY),elapsed=Math.max(1,performance.now()-startTime),velocity=dx/elapsed,width=Math.max(1,window.innerWidth),complete=dy<Math.max(70,dx*.7)&&(dx>=Math.max(88,width*.28)||velocity>.65);gestureLocked=false;if(complete)animateComplete();else animateBack()},{passive:true});
document.addEventListener('touchcancel',()=>{if(!tracking&&!swipeMain)return;tracking=false;gestureLocked=false;animateBack()},{passive:true});
