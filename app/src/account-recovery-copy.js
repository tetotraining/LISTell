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
  copy.className='link recovery-card-copy';
  copy.textContent='復旧コードをコピー';
  regenerate.before(actions);
  actions.append(copy,regenerate);

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
.recovery-card-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.recovery-card-actions .link{margin:0!important}
.recovery-card-copy.copied{color:var(--accent)!important}
`;
document.head.appendChild(style);
