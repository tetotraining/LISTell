async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    return true;
  }catch{}
  try{
    const area=document.createElement('textarea');
    area.value=text;
    area.setAttribute('readonly','');
    area.style.position='fixed';
    area.style.opacity='0';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0,text.length);
    const ok=document.execCommand('copy');
    area.remove();
    return ok;
  }catch{return false}
}

async function regenerateRecoveryCode(){
  const token=localStorage.getItem('listell_token');
  const response=await fetch('/api/account/recovery/regenerate',{
    method:'POST',
    headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
    body:'{}'
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'復旧コードの再発行に失敗しました');
  return data.recoveryCode||'';
}

function closeRegenerateConfirm(){
  document.querySelector('#accountRecoveryRegenerateShade')?.remove();
}

function enableSwipeDownToClose(shade){
  const sheet=shade?.querySelector('.sheet');
  if(!sheet)return;
  let startY=0,startX=0,lastY=0,lastX=0,tracking=false;
  sheet.addEventListener('touchstart',event=>{
    if(event.touches.length!==1)return;
    const touch=event.touches[0];
    startY=lastY=touch.clientY;
    startX=lastX=touch.clientX;
    tracking=true;
  },{passive:true});
  sheet.addEventListener('touchmove',event=>{
    if(!tracking||event.touches.length!==1)return;
    const touch=event.touches[0];
    lastY=touch.clientY;
    lastX=touch.clientX;
    if(Math.abs(lastX-startX)>Math.abs(lastY-startY)*1.2)tracking=false;
  },{passive:true});
  sheet.addEventListener('touchend',()=>{
    if(!tracking)return;
    tracking=false;
    const dy=lastY-startY,dx=Math.abs(lastX-startX);
    if(dy>=70&&dy>dx*1.2)closeRegenerateConfirm();
  },{passive:true});
  sheet.addEventListener('touchcancel',()=>{tracking=false},{passive:true});
}

function showRegenerateConfirm(button){
  closeRegenerateConfirm();
  document.body.insertAdjacentHTML('beforeend',`<div class="shade" id="accountRecoveryRegenerateShade"><section class="sheet list-icon-sheet delete-confirm-sheet"><div class="handle"></div><em>RECOVERY CODE</em><h1>復旧コードを再発行しますか？</h1><p class="delete-confirm-note">現在の復旧コードは無効になります。</p><div class="delete-confirm-actions"><button type="button" id="accountRecoveryRegenerateYes">再発行する</button><button type="button" id="accountRecoveryRegenerateNo">キャンセル</button></div></section></div>`);
  const shade=document.querySelector('#accountRecoveryRegenerateShade');
  if(!shade)return;
  shade.querySelector('#accountRecoveryRegenerateNo').onclick=closeRegenerateConfirm;
  shade.onclick=event=>{if(event.target===shade)closeRegenerateConfirm()};
  enableSwipeDownToClose(shade);
  shade.querySelector('#accountRecoveryRegenerateYes').onclick=async()=>{
    const yes=shade.querySelector('#accountRecoveryRegenerateYes');
    yes.disabled=true;
    try{
      const newCode=await regenerateRecoveryCode();
      const code=document.querySelector('.recovery-code');
      if(code)code.textContent=newCode;
      closeRegenerateConfirm();
      if(typeof window.__listellShowRecoverySuccess==='function'){
        await window.__listellShowRecoverySuccess(newCode,{
          title:'復旧コードを再発行しました',
          message:'新しい復旧コードです。<br>次回ログインできない時のために保管してください。',
          actionLabel:'閉じる'
        });
      }
    }catch(error){
      yes.disabled=false;
      alert(error.message);
    }finally{
      if(button.isConnected)button.disabled=false;
    }
  };
}

function enhanceRecoveryCard(card){
  if(!card||card.dataset.copyReady==='1')return;
  const code=card.querySelector('.recovery-code');
  const regenerate=card.querySelector('#regenerateRecovery');
  if(!code||!regenerate)return;
  card.dataset.copyReady='1';

  const actions=document.createElement('div');
  actions.className='recovery-card-actions';
  const copy=document.createElement('button');
  copy.type='button';
  copy.className='recovery-card-action recovery-card-copy';
  copy.textContent='復旧コードをコピー';
  regenerate.classList.add('recovery-card-action','recovery-card-regenerate');
  regenerate.before(actions);
  actions.append(regenerate,copy);

  let resetTimer=null;
  let fadeTimer=null;
  copy.onclick=async event=>{
    event.preventDefault();
    event.stopPropagation();
    if(resetTimer)clearTimeout(resetTimer);
    if(fadeTimer)clearTimeout(fadeTimer);
    copy.style.transition='none';
    copy.style.opacity='1';
    const value=code.textContent.trim();
    const ok=value&&value!=='読み込み中'&&await copyText(value);
    copy.textContent=ok?'コピーしました ✓':'コピーできませんでした';
    copy.classList.toggle('copied',!!ok);
    if(!ok)return;
    navigator.vibrate?.(10);
    resetTimer=setTimeout(()=>{
      if(!copy.isConnected)return;
      copy.style.transition='opacity .18s ease';
      copy.style.opacity='0';
      fadeTimer=setTimeout(()=>{
        if(!copy.isConnected)return;
        copy.textContent='復旧コードをコピー';
        copy.classList.remove('copied');
        requestAnimationFrame(()=>requestAnimationFrame(()=>{copy.style.opacity='1'}));
      },180);
    },2000);
  };
}

function enhance(){document.querySelectorAll('.recovery-card').forEach(enhanceRecoveryCard)}
new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
enhance();

document.addEventListener('click',event=>{
  const button=event.target.closest?.('#regenerateRecovery');
  if(!button)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  showRegenerateConfirm(button);
},{capture:true});

const style=document.createElement('style');
style.textContent=`
.recovery-card-actions{display:flex;align-items:center;gap:10px;width:100%;margin-top:10px}
.recovery-card-action{flex:1;min-width:0;height:46px;margin:0!important;padding:0 10px!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:14px!important;background:#202020!important;color:#fff!important;font:inherit!important;font-size:14px!important;font-weight:750!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;white-space:nowrap!important}
.recovery-card-copy{border-color:color-mix(in srgb,var(--accent) 60%,rgba(255,255,255,.18))!important}
.recovery-card-copy.copied{color:var(--accent)!important}
#accountRecoveryRegenerateShade .delete-confirm-actions #accountRecoveryRegenerateYes{background:#e5484d;color:#fff}
#accountRecoveryRegenerateShade .delete-confirm-actions #accountRecoveryRegenerateNo{background:var(--card,#222);color:var(--text,#fff)}
html[data-theme="light"] .recovery-card-action{background:#f3f3f3!important;color:#111!important;border-color:rgba(0,0,0,.14)!important}
html[data-theme="light"] .recovery-card-copy{border-color:color-mix(in srgb,var(--accent) 70%,rgba(0,0,0,.12))!important}
`;
document.head.appendChild(style);
