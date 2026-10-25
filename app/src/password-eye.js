const style=document.createElement('style');
style.textContent=`.account-credentials{display:block!important}.account-credentials .account-field{display:block;padding:14px 16px;border-bottom:1px solid var(--line)}.account-credentials .account-field:last-child{border-bottom:0}.account-field small{display:block;margin-bottom:6px;opacity:.62}.account-field strong{display:block}.password-line{display:flex;align-items:center;gap:10px}.password-line strong{letter-spacing:.08em}.password-line button{border:0;background:transparent;padding:2px 4px;font-size:20px;line-height:1}`;
document.head.appendChild(style);

document.addEventListener('click',async e=>{
  const eye=e.target?.closest?.('#passwordEye');
  if(!eye)return;
  const value=document.querySelector('#accountPassword');
  if(!value)return;
  if(eye.dataset.visible==='1'){
    value.textContent='＊＊＊＊＊＊＊＊';
    eye.dataset.visible='0';
    eye.setAttribute('aria-label','パスワードを表示');
    return;
  }
  const password=prompt('本人確認のため、現在のパスワードを入力してください');
  if(password===null)return;
  try{
    const r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({loginId:eye.dataset.loginId,password})});
    const j=await r.json();
    if(!r.ok)throw Error(j.error||'本人確認に失敗しました');
    value.textContent=password;
    eye.dataset.visible='1';
    eye.setAttribute('aria-label','パスワードを隠す');
  }catch(err){alert(err.message)}
});
