let savedLoginNode=null;
let recoveryCode='';
let recoveryLoginId='';

const app=()=>document.querySelector('#app');

function restoreLogin(){
  const root=app();
  if(!root||!savedLoginNode)return;
  root.replaceChildren(savedLoginNode);
}

function ensureRecoveryModalStyle(){
  if(document.querySelector('#recoverySuccessStyle'))return;
  const style=document.createElement('style');
  style.id='recoverySuccessStyle';
  style.textContent=`
    .recovery-success-shade{position:fixed;z-index:100000;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
    .recovery-success-modal{width:min(100%,390px);background:#121212;border:1px solid rgba(255,255,255,.12);border-radius:28px;padding:28px 22px 22px;box-sizing:border-box;box-shadow:0 22px 70px rgba(0,0,0,.55);text-align:center}
    .recovery-success-icon{width:54px;height:54px;border-radius:18px;margin:0 auto 18px;display:grid;place-items:center;background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent);font-size:26px;font-weight:900}
    .recovery-success-modal h2{margin:0;color:var(--text,#fff);font-size:24px;line-height:1.25;letter-spacing:-.03em}
    .recovery-success-modal p{margin:10px 0 22px;color:var(--muted,#9b9b9b);font-size:14px;line-height:1.55}
    .recovery-code-box{display:flex;align-items:center;justify-content:center;min-height:62px;padding:0 14px;margin:0 0 12px;border-radius:18px;background:#080a08;border:1px solid rgba(255,255,255,.12);color:var(--text,#fff);font-size:20px;font-weight:800;letter-spacing:1.8px;word-break:break-all;user-select:all;-webkit-user-select:all}
    .recovery-copy-button,.recovery-open-button{width:100%;height:54px;border:0;border-radius:17px;font:inherit;font-size:16px;font-weight:800}
    .recovery-copy-button{margin-bottom:10px;background:#252525;color:#fff}
    .recovery-copy-button.copied{color:var(--accent)}
    .recovery-open-button{background:var(--accent);color:#000}
    html[data-theme="light"] .recovery-success-shade{background:rgba(0,0,0,.38)}
    html[data-theme="light"] .recovery-success-modal{background:#fff;border-color:rgba(0,0,0,.1)}
    html[data-theme="light"] .recovery-code-box{background:#f4f4f4;border-color:rgba(0,0,0,.08)}
    html[data-theme="light"] .recovery-copy-button{background:#ededed;color:#111}
  `;
  document.head.appendChild(style);
}

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

function showRecoverySuccess(code){
  ensureRecoveryModalStyle();
  return new Promise(resolve=>{
    document.querySelector('#recoverySuccessShade')?.remove();
    const shade=document.createElement('div');
    shade.className='recovery-success-shade';
    shade.id='recoverySuccessShade';
    shade.innerHTML=`<section class="recovery-success-modal" role="dialog" aria-modal="true" aria-labelledby="recoverySuccessTitle"><div class="recovery-success-icon">✓</div><h2 id="recoverySuccessTitle">パスワードを変更しました</h2><p>新しい復旧コードです。<br>次回ログインできない時のために保管してください。</p><div class="recovery-code-box" id="recoverySuccessCode">${code}</div><button type="button" class="recovery-copy-button" id="recoveryCopyButton">復旧コードをコピー</button><button type="button" class="recovery-open-button" id="recoveryOpenButton">LISTellを開く</button></section>`;
    document.body.appendChild(shade);
    const copyButton=shade.querySelector('#recoveryCopyButton');
    let copyResetTimer=null;
    copyButton.onclick=async()=>{
      if(copyResetTimer){clearTimeout(copyResetTimer);copyResetTimer=null}
      const ok=await copyText(code);
      copyButton.textContent=ok?'コピーしました ✓':'コピーできませんでした';
      copyButton.classList.toggle('copied',ok);
      if(ok){
        navigator.vibrate?.(10);
        copyResetTimer=setTimeout(()=>{
          if(!copyButton.isConnected)return;
          copyButton.textContent='復旧コードをコピー';
          copyButton.classList.remove('copied');
          copyResetTimer=null;
        },5000);
      }
    };
    shade.querySelector('#recoveryOpenButton').onclick=()=>{
      if(copyResetTimer)clearTimeout(copyResetTimer);
      shade.remove();
      resolve();
    };
  });
}

function showCodeStep(message=''){
  const root=app();
  if(!root)return;
  root.innerHTML=`<main class="auth"><em>LISTELL</em><h1>復旧コード</h1>${message?`<p class="error">${message}</p>`:''}<input id="recoveryCode" placeholder="復旧コード" autocomplete="off"><button class="primary" id="recoveryNext">次へ</button><button class="link" id="recoveryBack">ログインへ戻る</button></main>`;
  const codeInput=root.querySelector('#recoveryCode');
  codeInput.value=recoveryCode;
  root.querySelector('#recoveryNext').onclick=async()=>{
    const code=codeInput.value.trim();
    if(!code)return showCodeStep('復旧コードを入力してください');
    const button=root.querySelector('#recoveryNext');
    button.disabled=true;
    try{
      const response=await fetch('/api/recover/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||'復旧コードの確認に失敗しました');
      recoveryCode=code;
      recoveryLoginId=data.loginId||'';
      showPasswordStep();
    }catch(error){
      showCodeStep(error.message);
    }
  };
  root.querySelector('#recoveryBack').onclick=restoreLogin;
}

function showPasswordStep(message=''){
  const root=app();
  if(!root)return;
  root.innerHTML=`<main class="auth"><em>LISTELL</em><h1>新しいパスワード</h1>${message?`<p class="error">${message}</p>`:''}<p style="margin:0 0 18px;color:#fff;font-size:15px">ID：<strong>${recoveryLoginId}</strong></p><input id="recoveryPw" type="password" minlength="4" placeholder="新しいパスワード（4文字以上）"><input id="recoveryPw2" type="password" minlength="4" placeholder="新しいパスワードを再入力"><button class="primary" id="recoverySubmit">パスワードを変更</button><button class="link" id="recoveryEditCode">復旧コードを入力し直す</button><button class="link" id="recoveryLogin">ログインへ戻る</button></main>`;
  root.querySelector('#recoveryEditCode').onclick=()=>showCodeStep();
  root.querySelector('#recoveryLogin').onclick=restoreLogin;
  root.querySelector('#recoverySubmit').onclick=async()=>{
    const pw=root.querySelector('#recoveryPw').value;
    const pw2=root.querySelector('#recoveryPw2').value;
    if(pw.length<4)return showPasswordStep('パスワードは4文字以上で入力してください');
    if(pw!==pw2)return showPasswordStep('パスワードが一致しません');
    const button=root.querySelector('#recoverySubmit');
    button.disabled=true;
    try{
      const response=await fetch('/api/recover',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:recoveryCode,password:pw})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(data.error||'復旧に失敗しました');
      const newCode=data.recoveryCode||'';
      recoveryCode='';
      recoveryLoginId='';
      await showRecoverySuccess(newCode);
      if(typeof window.__listellCompleteRecovery!=='function')throw Error('ログイン処理を開始できませんでした');
      await window.__listellCompleteRecovery(data);
    }catch(error){
      showPasswordStep(error.message);
    }
  };
}

document.addEventListener('click',event=>{
  const trigger=event.target.closest('[data-mode="recover"]');
  if(!trigger)return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const root=app();
  if(!root)return;
  savedLoginNode=root.firstElementChild;
  recoveryCode='';
  recoveryLoginId='';
  showCodeStep();
},{capture:true});
