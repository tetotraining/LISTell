const style=document.createElement('style');
style.textContent=`.account-credentials{display:block!important}.account-credentials .account-field{display:block;padding:14px 16px;border-bottom:1px solid var(--line)}.account-credentials .account-field:last-child{border-bottom:0}.account-field small{display:block;margin-bottom:6px;opacity:.62}.account-field strong{display:block}.password-line{display:flex;align-items:center;justify-content:space-between;gap:10px}.password-line strong{letter-spacing:.08em}.password-line button{border:0;background:transparent;color:var(--accent,#fff);padding:4px 0;font:inherit;font-weight:700;white-space:nowrap}`;
document.head.appendChild(style);

document.addEventListener('click',e=>{
  const trigger=e.target?.closest?.('#passwordEye');
  if(!trigger)return;
  const next=prompt('新しいパスワードを入力してください');
  if(next===null)return;
  if(next.length<4){alert('パスワードは4文字以上で入力してください');return}
  const confirm=prompt('新しいパスワードをもう一度入力してください');
  if(confirm===null)return;
  if(next!==confirm){alert('パスワードが一致しません');return}
  alert('パスワード変更は復旧コード画面から行ってください');
});
