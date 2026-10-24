const TARGET_TITLES=new Set(['リスト管理','共有設定','デザイン設定','通知設定']);
let startX=0,startY=0,lastX=0,lastY=0,tracking=false;
const isTargetPanel=()=>TARGET_TITLES.has(document.querySelector('main header h1')?.textContent?.trim());
const interactiveTarget=el=>!!el?.closest?.('input,textarea,select,button,[contenteditable="true"],.sheet,.shade');

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
  if(!cacheable){
    if(method!=='GET'&&url.includes('/api/'))cache.clear();
    return nativeFetch(input,init);
  }
  const key=url+'|'+JSON.stringify(init?.headers||{}),now=Date.now(),hit=cache.get(key);
  if(hit&&now-hit.time<5000)return hit.response.then(r=>r.clone());
  const response=nativeFetch(input,init).then(r=>{if(!r.ok)cache.delete(key);return r});
  cache.set(key,{time:now,response});
  return response.then(r=>r.clone());
};

const style=document.createElement('style');
style.textContent='.panel-loading{width:22px;height:22px;margin:32px auto;border:2px solid var(--line,#333);border-top-color:var(--accent,#fff);border-radius:50%;animation:panelLoading .65s linear infinite}@keyframes panelLoading{to{transform:rotate(360deg)}}';
document.head.appendChild(style);

document.addEventListener('touchstart',e=>{
  if(e.touches.length!==1||!isTargetPanel()||interactiveTarget(e.target))return;
  const t=e.touches[0];
  if(t.clientX>32)return;
  startX=lastX=t.clientX;startY=lastY=t.clientY;tracking=true;
},{passive:true});
document.addEventListener('touchmove',e=>{
  if(!tracking||e.touches.length!==1)return;
  const t=e.touches[0];lastX=t.clientX;lastY=t.clientY;
  if(Math.abs(lastY-startY)>Math.abs(lastX-startX)*1.2)tracking=false;
},{passive:true});
document.addEventListener('touchend',()=>{
  if(!tracking)return;
  tracking=false;
  const dx=lastX-startX,dy=Math.abs(lastY-startY);
  if(dx<70||dy>60||dx<dy*1.3)return;
  document.querySelector('[data-tab="menu"]')?.click();
},{passive:true});
document.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
