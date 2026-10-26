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

const style=document.createElement('style');
style.textContent=`
.recovery-card-actions{display:flex;align-items:center;gap:10px;width:100%;margin-top:10px}
.recovery-card-action{flex:1;min-width:0;height:46px;margin:0!important;padding:0 10px!important;border:1px solid rgba(255,255,255,.2)!important;border-radius:14px!important;background:#202020!important;color:#fff!important;font:inherit!important;font-size:14px!important;font-weight:750!important;display:flex!important;align-items:center!important;justify-content:center!important;box-sizing:border-box!important;white-space:nowrap!important}
.recovery-card-copy{border-color:color-mix(in srgb,var(--accent) 60%,rgba(255,255,255,.18))!important}
.recovery-card-copy.copied{color:var(--accent)!important}
html[data-theme="light"] .recovery-card-action{background:#f3f3f3!important;color:#111!important;border-color:rgba(0,0,0,.14)!important}
html[data-theme="light"] .recovery-card-copy{border-color:color-mix(in srgb,var(--accent) 70%,rgba(0,0,0,.12))!important}
`;
document.head.appendChild(style);
