const TARGET_TITLES=new Set(['リスト管理','共有設定','デザイン設定','通知設定','購入履歴','リストを並び替え']);
let startX=0,startY=0,lastX=0,lastY=0,tracking=false;
const title=()=>document.querySelector('main header h1')?.textContent?.trim();
const isTargetPanel=()=>TARGET_TITLES.has(title());
const interactiveTarget=el=>!!el?.closest?.('input,textarea,select,button,[contenteditable="true"],.sheet,.shade');
const token=()=>localStorage.getItem('listell_token');
const request=async(path,init={})=>{const r=await fetch('/api/'+path,{...init,headers:{'content-type':'application/json',...(token()?{authorization:'Bearer '+token()}:{}),...(init.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||'通信エラー');return j};
const backFromReorder=()=>document.querySelector('[data-panel="manage"]')?.click();

// リスト並び替えはリスト管理内への展開ではなく、購入履歴と同じ独立ページで表示する。
document.addEventListener('click',async e=>{
  const trigger=e.target?.closest?.('#reorderLists');
  if(!trigger)return;
  e.preventDefault();e.stopImmediatePropagation();
  const main=document.querySelector('#app > main, app > main, main');
  if(!main)return;
  main.innerHTML='<header><em>LIST ORDER</em><h1>リストを並び替え</h1></header><div class="panel-loading" aria-label="読み込み中"></div>';
  try{
    const result=await request('lists'),ids=[...(result.lists||[])];
    const draw=()=>{
      main.innerHTML=`<header><em>LIST ORDER</em><h1>リストを並び替え</h1></header><section class="card reorder-panel reorder-page">${ids.map((x,i)=>`<div class="reorder-row"><strong>${x.name}</strong><span><button data-up="${i}" ${i===0?'disabled':''}>↑</button><button data-down="${i}" ${i===ids.length-1?'disabled':''}>↓</button></span></div>`).join('')}<button class="primary" id="saveListOrderPage">並び順を保存</button></section>`;
      main.querySelectorAll('[data-up]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.up);[ids[i-1],ids[i]]=[ids[i],ids[i-1]];navigator.vibrate?.(10);draw()});
      main.querySelectorAll('[data-down]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.down);[ids[i+1],ids[i]]=[ids[i],ids[i+1]];navigator.vibrate?.(10);draw()});
      main.querySelector('#saveListOrderPage').onclick=async()=>{try{await request('lists/reorder',{method:'POST',body:JSON.stringify({ids:ids.map(x=>x.id)})});navigator.vibrate?.(10);backFromReorder()}catch(err){alert(err.message)}};
    };
    draw();
  }catch(err){alert(err.message);backFromReorder()}
},{capture:true});

// 共有設定/通知設定はAPI待ちの間も画面遷移を即時に見せる。
document.addEventListener('click',e=>{
  const trigger=e.target?.closest?.('[data-panel="sharing"],[data-panel="notifications"]');
  if(!trigger)return;
  const panel=trigger.dataset.panel,title=panel==='sharing'?'共有設定':'通知設定';
  const main=document.querySelector('#app > main, app > main, main');
  if(!main)return;
  main.innerHTML=`<header><em>SETTINGS</em><h1>${title}</h1></header><div class="panel-loading" aria-label="読み込み中"></div>`;
},{capture:true});

// 同じ設定データへの短時間の再アクセスは通信結果を再利用して待ち時間を減らす。
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
style.textContent='.panel-loading{width:22px;height:22px;margin:32px auto;border:2px solid var(--line,#333);border-top-color:var(--accent,#fff);border-radius:50%;animation:panelLoading .65s linear infinite}@keyframes panelLoading{to{transform:rotate(360deg)}}.reorder-page{margin-top:18px}';
document.head.appendChild(style);

document.addEventListener('touchstart',e=>{if(e.touches.length!==1||!isTargetPanel()||interactiveTarget(e.target))return;const t=e.touches[0];if(t.clientX>32)return;startX=lastX=t.clientX;startY=lastY=t.clientY;tracking=true},{passive:true});
document.addEventListener('touchmove',e=>{if(!tracking||e.touches.length!==1)return;const t=e.touches[0];lastX=t.clientX;lastY=t.clientY;if(Math.abs(lastY-startY)>Math.abs(lastX-startX)*1.2)tracking=false},{passive:true});
document.addEventListener('touchend',()=>{if(!tracking)return;tracking=false;const dx=lastX-startX,dy=Math.abs(lastY-startY);if(dx<70||dy>60||dx<dy*1.3)return;if(title()==='リストを並び替え')backFromReorder();else document.querySelector('[data-tab="menu"]')?.click()},{passive:true});
document.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
