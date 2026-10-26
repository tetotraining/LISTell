let savedLoginNode=null;
let recoveryCode='';
let recoveryLoginId='';

const app=()=>document.querySelector('#app');

function restoreLogin(){
  const root=app();
  if(!root||!savedLoginNode)return;
  root.replaceChildren(savedLoginNode);
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
      restoreLogin();
      alert('パスワードを変更しました。\n新しい復旧コード：'+newCode+'\n必ず保管してください');
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
